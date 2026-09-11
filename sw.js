// フロンティア開拓記 - Service Worker
// network-first戦略: 常に最新版を優先し、オフライン時のみキャッシュにフォールバックする。
const CACHE_NAME = "frontier-outpost-cache-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // "network-first"のつもりでも、fetch()にcacheオプションを指定しないとブラウザ自身のHTTPキャッシュが
  // このfetch自体に古い応答を返してしまい、実質的に更新が反映されないことがある(v0.21.0で実際に
  // 再現・特定した不具合)。cache:"no-store"でHTTPキャッシュを完全に迂回し、常に本当に最新のバイト列を
  // 取得するようにする
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
