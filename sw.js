/* ARCANUM service worker · offline app shell (arcanum-v5)
   - 새 버전은 install에서 바로 대기열을 건너뛰고(skipWaiting), activate에서 즉시 제어권을 가져온다(clients.claim).
   - activate 때 열려 있던 화면은 새 버전으로 다시 띄워, 홈 화면 앱에도 새 UI가 바로 보이게 한다.
   - v5: HTML·JS·CSS는 network-first — 새 배포가 있으면 캐시에 남은 옛 코드를 쓰지 않고 바로 최신을 받아온다.
     (오프라인일 때만 캐시 폴백) index.html의 ?v=1.4 쿼리로 예전 캐시(arcanum-v3/v4)와 URL 자체를 분리한다. */
const CACHE = 'arcanum-v5';
const QUERY = '?v=1.4';
const ASSETS = [
  './',
  './index.html' + QUERY,
  './styles.css' + QUERY,
  './manifest.json',
  './js/utils.js' + QUERY,
  './js/store.js' + QUERY,
  './js/generator.js' + QUERY,
  './js/sample.js' + QUERY,
  './js/graph.js' + QUERY,
  './js/factiongraph.js' + QUERY,
  './js/worldgen.js' + QUERY,
  './js/mapview.js' + QUERY,
  './js/rankicon.js' + QUERY,
  './js/app.js' + QUERY,
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 코드(HTML·JS·CSS)는 항상 네트워크에서 먼저 — 캐시에 옛 코드가 남아도 즉시 새 버전이 뜬다
// (GitHub Pages가 index.html을 max-age=600으로 내려도 HTTP 캐시를 건너뛰도록 cache:'reload')
function netFetch(req) {
  try { return fetch(req, { cache: 'reload' }); } catch (e) { return fetch(req); }
}

function isCodeRequest(req, url) {
  if (req.mode === 'navigate') return true;
  if (req.destination === 'script' || req.destination === 'style' || req.destination === 'document') return true;
  return /\.(?:html|js|css)$/i.test(url.pathname);
}

function cachePut(request, res) {
  if (!res || !res.ok) return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
}

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
    // 이전 버전(v1~v4 …) 캐시는 지운다
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

  // HTML·JS·CSS: 네트워크 우선 → 새 배포가 곧바로 보인다 (오프라인이면 캐시)
  if (isCodeRequest(req, url)) {
    event.respondWith(
      netFetch(req).then((res) => {
        cachePut(req, res);
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html' + QUERY).then((idx) => idx || caches.match('./'));
        return Response.error();
      }))
    );
    return;
  }

  // 나머지 정적 자산(아이콘 등)은 캐시 우선 + 뒤에서 갱신
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) {
        fetch(req).then((res) => cachePut(req, res)).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        cachePut(req, res);
        return res;
      }).catch(() => caches.match('./index.html' + QUERY).then((idx) => idx || caches.match('./')));
    })
  );
});
