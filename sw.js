const CACHE_NAME = 'asset-dashboard-v2';
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
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// 啟動：清除舊快取（v1 → v2 自動清掉）
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 只快取：同源檔案 + Plotly CDN
    // 其他所有外部請求（GAS 報價、Gemini、googleusercontent 等）一律不攔截
    // 讓瀏覽器直接發送，避免快取到舊報價
    const isSameOrigin = url.startsWith(self.location.origin);
    const isPlotlyCDN = url.startsWith('https://cdn.plot.ly/');

    if (!isSameOrigin && !isPlotlyCDN) {
        return; // 不攔截，外部請求交給瀏覽器原生處理
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
