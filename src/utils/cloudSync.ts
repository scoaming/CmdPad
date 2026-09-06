import type { Command } from "../types";

export interface CloudConfig {
  url: string;
  token: string;
}

const KEY_URL = "cmdpad_cloud_url";
const KEY_TOKEN = "cmdpad_cloud_token";

export function getCloudConfig(): CloudConfig {
  return {
    url: localStorage.getItem(KEY_URL) ?? "",
    token: localStorage.getItem(KEY_TOKEN) ?? "",
  };
}

export function saveCloudConfig(cfg: CloudConfig): void {
  localStorage.setItem(KEY_URL, cfg.url.trim().replace(/\/+$/, ""));
  localStorage.setItem(KEY_TOKEN, cfg.token.trim());
}

/**
 * 把命令数据上传到 Cloudflare Worker（cloud/ 目录部署），手机 PWA 从同一地址读取。
 * Worker 校验 x-token 后写入 KV；GET /api/data 即手机端数据源。
 */
export async function uploadToCloud(commands: Command[]): Promise<string> {
  const { url, token } = getCloudConfig();
  if (!url || !token) {
    throw new Error("请先填写 Worker 地址和访问令牌");
  }

  const res = await fetch(`${url}/api/data`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-token": token },
    body: JSON.stringify({
      exported_at: new Date().toISOString(),
      count: commands.length,
      commands,
    }),
  });
  if (res.status === 401) {
    throw new Error("访问令牌不正确（401）");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`上传失败：HTTP ${res.status} ${text.slice(0, 120)}`);
  }
  return `已上传 ${commands.length} 条命令`;
}
