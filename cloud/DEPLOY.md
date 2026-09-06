# CmdPad 手机端（Cloudflare PWA）部署指南

电脑端 CmdPad 把命令上传到 Cloudflare Worker（KV 存储），iPhone/Android 浏览器打开 Worker 地址即可查看、搜索、一键复制命令，「添加到主屏幕」后和原生 App 体验一致。**全程 ¥0**（Workers 免费版 10 万请求/天，KV 免费额度足够个人使用）。

## 架构

```
CmdPad（电脑端）--PUT /api/data--> Cloudflare Worker → KV 存储
iPhone Safari   --GET  /api/data--> Cloudflare Worker ← KV（需 x-token）
```

- 数据非公开：所有 `/api/*` 请求必须带访问令牌（`DATA_TOKEN`），令牌不对一律 401
- PWA 页面（`public/`）由 Worker 托管，手机离线时应用外壳走 Service Worker 缓存、数据走 localStorage 兜底

## 部署步骤（一次性，约 10 分钟）

前置：安装 Node.js（已具备）。

### 1. 注册 Cloudflare 账号（免费）

https://dash.cloudflare.com/sign-up 注册即可，不需要绑卡。

### 2. 登录 Wrangler

```bash
cd C:\Users\ist\CmdPad-Qoder\cloud
npx wrangler@latest login
```

浏览器会弹出 Cloudflare 授权页，点击 Allow。

### 3. 创建 KV 命名空间

```bash
npx wrangler@latest kv namespace create CMDPAD_KV
```

输出里有 `id = "xxxx..."`，把它填进 `wrangler.toml` 的 `id` 字段（替换 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`）。

### 4. 生成并设置访问令牌

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
npx wrangler@latest secret put DATA_TOKEN
```

第二行命令执行后按提示粘贴上面生成的随机令牌并回车。**这个令牌同时要填进 CmdPad 桌面端和手机端，自己保管好。**

### 5. 部署

```bash
npx wrangler@latest deploy
```

成功后输出 `https://cmdpad-web.<你的子域>.workers.dev`，这就是手机端地址。

### 6. 在 CmdPad 桌面端配置

打开 CmdPad → 顶栏 📱（手机端同步）按钮 → 填入 Worker 地址和 DATA_TOKEN → 点「上传 N 条命令」。看到「已上传」即成功。

### 7. iPhone 上使用

1. Safari 打开 `https://cmdpad-web.<你的子域>.workers.dev`
2. 输入 DATA_TOKEN 进入
3. 分享菜单 → **添加到主屏幕** → 以后从桌面图标进入，全屏运行像 App
4. 使用：顶部搜索、**点卡片即复制命令**，去任何 App 粘贴

## 常见问题

- **手机打不开 workers.dev？** 国内直连 `*.workers.dev` 经常被墙或不稳定。解决办法：在 Cloudflare 托管一个自有域名（年费约 ¥10~60），Dashboard → Workers & Pages → cmdpad-web → Settings → Domains & Routes 添加 Custom Domain，之后手机改用自有域名访问。
- **想换数据/清空？** 手机端刷新即拉最新 KV；桌面端重新点「上传」即整体覆盖。
- **数据多大？** commands.json 一般几十 KB，KV 单值上限 25MB，完全够用。
- **忘记令牌？** `npx wrangler@latest secret put DATA_TOKEN` 重新设置即可（新令牌要在桌面端和手机端同步更新）。
