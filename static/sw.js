const CACHE_NAME = "smart-schedule-v9";
const STATIC_ASSETS = [
  "/",
  "/static/css/style.css",
  "/static/js/app.js",
  "/static/manifest.json",
  "/static/icons/favicon.svg",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/apple-touch-icon.png"
];

// Cài đặt Service Worker & pre-cache tài nguyên tĩnh cơ bản
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Kích hoạt & dọn dẹp cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Chiến lược Fetch:
// - API GET (/api/...): Network-First, fallback về Cache khi mất mạng
// - Tài nguyên tĩnh & HTML: Network-First kèm cập nhật Cache để luôn mới nhất và xem được Offline
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Bỏ qua các scheme không phải http/https (vd: chrome-extension)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes("jsdelivr.net") || url.hostname.includes("tailwindcss.com"))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response(
            JSON.stringify({ detail: "Bạn đang ngoại tuyến (Offline)." }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" }
            }
          );
        });
      })
  );
});
