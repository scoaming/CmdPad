/**
 * CmdPad 手机端 PWA Worker（Cloudflare Workers 免费版）
 *
 * 路由：
 *   GET  /api/data  → 返回 KV 中的命令数据（手机 PWA 拉取）
 *   PUT  /api/data  → CmdPad 桌面端上传命令数据（覆盖写入 KV）
 *   其他路径        → public/ 下的静态资源（PWA 页面本体）
 *
 * 鉴权：请求头 x-token（或 ?t=）必须等于 secret DATA_TOKEN（wrangler secret put DATA_TOKEN）。
 * 令牌未配置时一律拒绝，避免裸奔。
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, OPTIONS",
  "access-control-allow-headers": "content-type, x-token",
  "access-control-max-age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/data") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }

      const token = request.headers.get("x-token") ?? url.searchParams.get("t") ?? "";
      if (!env.DATA_TOKEN) {
        return json({ error: "Worker 未配置 DATA_TOKEN，请先 wrangler secret put DATA_TOKEN" }, 500);
      }
      if (token !== env.DATA_TOKEN) {
        return json({ error: "Unauthorized" }, 401);
      }

      if (request.method === "PUT") {
        const body = await request.text();
        try {
          JSON.parse(body);
        } catch {
          return json({ error: "请求体不是合法 JSON" }, 400);
        }
        await env.CMDPAD_KV.put("data", body);
        return json({ ok: true });
      }

      if (request.method === "GET") {
        const data = await env.CMDPAD_KV.get("data");
        if (!data) {
          return json({ exported_at: null, count: 0, commands: [] });
        }
        return new Response(data, {
          headers: { "content-type": "application/json; charset=utf-8", ...CORS },
        });
      }

      return json({ error: "Method Not Allowed" }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};
