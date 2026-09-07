#!/usr/bin/env node
/**
 * notion-sync.mjs — CmdPad 内置的 Notion 同步脚本（由 Rust 端 sync_to_notion 命令调用）。
 *
 * 功能：比较 %APPDATA%\CmdPad\commands.json 与 Notion 页面内容，本地有更新则整页重写
 * （删除旧块 → 按 ≤1800 字符分块写入 code block）。内容一致时不动，可安全重复执行。
 *
 * 配置（环境变量）：
 *   NOTION_PAGE_ID     必填，目标 Notion 页面 ID
 *   NOTION_TOKEN       选填，Notion 集成令牌；未设置时依次读 ~/.notion-token、
 *                      ~/.claude.json 的 mcpServers.*.env.NOTION_TOKEN
 *
 * 用法：node notion-sync.mjs [--dont-write]
 */
import { readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const USER_HOME = process.env.USERPROFILE ?? process.env.HOME ?? '.'
const FILE = join(process.env.APPDATA ?? join(USER_HOME, 'AppData', 'Roaming'), 'CmdPad', 'commands.json')
const PAGE = process.env.NOTION_PAGE_ID ?? ''
const LOG_FILE = join(process.env.APPDATA ?? join(USER_HOME, 'AppData', 'Roaming'), 'CmdPad', 'notion-sync.log')
const NOTION_API = 'https://api.notion.com/v1'
const CHUNK_MAX = 1800 // 单 code block rich_text 上限 2000，保守取 1800

/** 本机本地时间格式化，用于日志与提示信息 */
function bjTime(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 写日志：失败不中断同步（安装目录可能只读） */
function log(msg) {
  console.log(msg)
  try { appendFileSync(LOG_FILE, `[${bjTime()}] ${msg}\n`, 'utf8') } catch { /* ignore */ }
}

/** 崩溃兜底：任何未捕获异常先写日志再退出——Rust 端只能拿到 stderr 尾行，日志是诊断关键 */
function fail(e) {
  const msg = e?.stack ?? String(e)
  try { appendFileSync(LOG_FILE, `[${bjTime()}] 💥 崩溃: ${msg}\n`, 'utf8') } catch { /* ignore */ }
  console.error(msg)
  process.exitCode = 1 // 自然退出让 stderr 完整冲刷到管道；process.exit 会截断输出
}
process.on('uncaughtException', fail)
process.on('unhandledRejection', fail)

function loadToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN
  try {
    const t = readFileSync(join(USER_HOME, '.notion-token'), 'utf8').trim()
    if (t) return t
  } catch { /* ignore */ }
  try {
    const cfg = JSON.parse(readFileSync(join(USER_HOME, '.claude.json'), 'utf8'))
    for (const s of Object.values(cfg.mcpServers ?? {})) {
      if (s?.env?.NOTION_TOKEN) return s.env.NOTION_TOKEN
    }
  } catch { /* ignore */ }
  return null
}

async function notion(method, path, body) {
  const token = loadToken()
  if (!token) throw new Error('未找到 Notion token：请设置 NOTION_TOKEN 环境变量，或在用户主目录创建 .notion-token 文件')
  // 网络层偶发 ECONNRESET（Notion 对 node TLS 指纹的间歇性阻断）时密集重试，
  // 一旦成功建立连接，keep-alive 复用后即稳定
  let res
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(`${NOTION_API}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      break
    } catch (e) {
      if (attempt >= 30) throw e
      await new Promise(r => setTimeout(r, attempt < 10 ? 500 : 2000))
    }
  }
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(`Notion API ${method} ${path}: ${res.status} ${data?.message ?? ''}`)
  return data
}

/** Notion 页面 markdown 快照：按顺序拼接所有 code block 文本。 */
async function snapshot() {
  let cursor
  const codeParts = []
  for (;;) {
    const q = new URLSearchParams({ page_size: '100' })
    if (cursor) q.set('start_cursor', cursor)
    const res = await notion('GET', `/blocks/${PAGE}/children?${q}`)
    for (const b of res.results ?? []) {
      if (b.type === 'code' && b.code?.rich_text) {
        codeParts.push(b.code.rich_text.map(r => r.text?.content ?? '').join(''))
      }
    }
    if (!res.has_more || !res.next_cursor) break
    cursor = res.next_cursor
  }
  return codeParts.join('\n').trim()
}

/** 按行切分文本为 ≤CHUNK_MAX 字符的块列表。 */
function chunkText(text) {
  const lines = text.split('\n')
  const chunks = []
  let buf = []
  let len = 0
  for (const line of lines) {
    if (len + line.length + 1 > CHUNK_MAX && buf.length > 0) {
      chunks.push(buf.join('\n'))
      buf = []
      len = 0
    }
    buf.push(line)
    len += line.length + 1
  }
  if (buf.length > 0) chunks.push(buf.join('\n'))
  return chunks
}

async function main() {
  const dontWrite = process.argv.includes('--dont-write')
  log(`▶ 启动（PAGE_ID ${PAGE ? '已设置' : '未设置'}${dontWrite ? '，预览模式' : ''}）`)
  if (!PAGE) {
    throw new Error('未设置 NOTION_PAGE_ID 环境变量（值为目标 Notion 页面 ID）。安装后请重启 CmdPad 使其读到该变量')
  }
  const st = statSync(FILE, { throwIfNoEntry: false })
  if (!st?.isFile()) throw new Error(`找不到 ${FILE}`)
  const T = JSON.stringify(JSON.parse(readFileSync(FILE, 'utf8')), null, 2)

  log('① 读取 Notion 页面快照...')
  const R = await snapshot()
  if (R === T.trim() || R === T) {
    log(`✅ 一致，无需更新（文件：${FILE}）`)
    return
  }
  log(`   有差异（Notion ${R.length} 字符 vs 本地 ${T.length} 字符）`)

  if (dontWrite) {
    log('   [--dont-write] 预览模式，不写回')
    return
  }

  log('② 删除页面旧内容...')
  let cursor
  const ids = []
  for (;;) {
    const q = new URLSearchParams({ page_size: '100' })
    if (cursor) q.set('start_cursor', cursor)
    const res = await notion('GET', `/blocks/${PAGE}/children?${q}`)
    for (const b of res.results ?? []) ids.push(b.id)
    if (!res.has_more || !res.next_cursor) break
    cursor = res.next_cursor
  }
  for (const id of ids) {
    try { await notion('DELETE', `/blocks/${id}`) } catch { /* 附件等不可删的块忽略 */ }
  }
  log(`   已清理 ${ids.length} 个旧块`)

  log('③ 写入新内容...')
  const chunks = chunkText(T)
  const children = [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'commands.json' } }] } }]
  for (const c of chunks) {
    children.push({
      type: 'code',
      code: { rich_text: [{ type: 'text', text: { content: c } }], language: 'json' },
    })
  }
  for (let i = 0; i < children.length; i += 50) {
    await notion('PATCH', `/blocks/${PAGE}/children`, { children: children.slice(i, i + 50) })
  }
  log('✅ 已同步（' + chunks.length + ' 个代码块 / ' + children.length + ' 块；时间 ' + bjTime() + ' 北京时间，文件修改 ' + bjTime(new Date(st.mtimeMs)) + '）')
}

main().catch(fail)
