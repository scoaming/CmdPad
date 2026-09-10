/* CmdPad PWA Service Worker
 * - HTML 导航请求：网络优先，离线回退缓存（保证每次部署后手机能拿到新版页面）
 * - 其余静态资源（manifest/图标）：缓存优先
 * - /api/* 数据：不经过 SW，走网络 + localStorage 兜底
 */
var CACHE = "cmdpad-shell-v6";
var SHELL = ["/", "/manifest.webmanifest", "/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.indexOf("/api/") === 0) return;

  // HTML 导航：网络优先，成功则刷新缓存
  if (e.request.mode === "navigate" || url.pathname === "/") {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("/", copy); });
        return res;
      }).catch(function () {
        return caches.match("/").then(function (hit) { return hit || Response.error(); });
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
