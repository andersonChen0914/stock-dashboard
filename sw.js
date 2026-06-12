const CACHE_NAME = 'asset-dashboard-v3'; // 版本號 +1，強制清掉舊快取
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

// 啟動：清除舊快取（v2 → v3 自動清掉）
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

    // 只處理：同源檔案 + Plotly CDN
    // 其他外部請求（GAS 報價、富果 API 等）一律不攔截，交給瀏覽器原生處理
    const isSameOrigin = url.startsWith(self.location.origin);
    const isPlotlyCDN = url.startsWith('https://cdn.plot.ly/');
    if (!isSameOrigin && !isPlotlyCDN) {
        return;
    }

    // ===== 網路優先（Network First）=====
    // 有網路：抓最新版，順便更新快取
    // 斷網／抓失敗：退回快取，PWA 離線仍可用
    event.respondWith(
        fetch(event.request).then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});
