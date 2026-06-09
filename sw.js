const CACHE_NAME = 'asset-dashboard-v1';
const STATIC_ASSETS = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.plot.ly/plotly-2.24.1.min.js'
];

// 安裝：快取靜態資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 啟動：清除舊快取
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // API 請求（報價、Gemini）永遠走網路，失敗不快取
    if (url.includes('script.google.com') || url.includes('generativelanguage.googleapis.com')) {
        event.respondWith(
            fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }))
        );
        return;
    }

    // 其他資源：快取優先，沒有再抓網路
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
