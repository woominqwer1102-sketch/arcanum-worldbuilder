/* ARCANUM service worker · offline app shell (arcanum-v4)
   - 새 버전은 install에서 바로 대기열을 건너뛰고(skipWaiting), activate에서 즉시 제어권을 가져온다(clients.claim).
   - activate 때 열려 있던 화면은 새 버전으로 다시 띄워, 홈 화면 앱에도 새 UI가 바로 보이게 한다. */
const CACHE = 'arcanum-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/utils.js',
  './js/store.js',
  './js/generator.js',
  './js/sample.js',
  './js/graph.js',
  './js/factiongraph.js',
  './js/worldgen.js',
  './js/mapview.js',
  './js/rankicon.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const hadOld = keys.some((k) => k !== CACHE);
    // 이전 버전(v1, v2 …) 캐시는 지운다
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();

    if (!hadOld) return;   // 첫 설치 — 이미 새 코드로 열린 화면이라 새로고침하지 않는다

    // 예전 코드가 캐시에 남아 있던 화면을 새 버전으로 한 번만 다시 띄운다.
    // (navigate를 await하면 그 요청을 이 워커가 받아야 해서 교착이 생길 수 있으므로 기다리지 않는다)
    try {
      const cache = await caches.open(CACHE);
      const flagUrl = new URL('./__updated', self.location).toString();
      if (await cache.match(flagUrl)) return;
      await cache.put(flagUrl, new Response(CACHE));
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach((client) => {
        try { client.postMessage({ type: 'ARCANUM_UPDATE', version: CACHE }); } catch (e) {}
        try {
          const p = client.navigate ? client.navigate(client.url) : null;
          if (p && p.catch) p.catch(() => {});
        } catch (e) { /* 못 띄워도 캐시는 이미 새 버전이다 */ }
      });
    } catch (e) { /* ignore */ }
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML은 네트워크 우선 → 새 배포가 곧바로 보인다 (오프라인이면 캐시)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // 정적 자산은 캐시 우선 + 뒤에서 갱신
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
