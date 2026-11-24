/* =========================================================
   ARCANUM · 지도 + 지역 핀 + 지형 스탬프 + 스토리 여정(타임라인)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;

  const KINDS = {
    kingdom: { label: '왕국', mark: '왕', cls: '' },
    city: { label: '도시', mark: '도', cls: '' },
    port: { label: '항구', mark: '항', cls: 'pin--port' },
    forest: { label: '숲', mark: '숲', cls: 'pin--forest' },
    mountain: { label: '산맥', mark: '산', cls: 'pin--mountain' },
    ruin: { label: '유적', mark: '유', cls: 'pin--ruin' },
    dungeon: { label: '던전', mark: '던', cls: 'pin--dungeon' },
    lake: { label: '호수', mark: '호', cls: 'pin--port' },
    guild: { label: '길드', mark: '길', cls: '' },
    inn: { label: '여관', mark: '여', cls: '' }
  };

  /* 판타지풍 지형 스탬프 — 지도 위에 얹는 손그림 도장 */
  const INK = '#3f3324';
  const TERRAIN = {
    mountains: { label: '산맥', svg:
      '<path d="M2 33 13.5 11 21 24 26.5 16 38 33Z" fill="#a9a396" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M9.6 19.4 13.5 11l4.4 8.2-4.2 2.4z" fill="#f5f0e2" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M8.4 33 13.5 23M20.6 33 26.5 24.5" stroke="' + INK + '" stroke-width="1.1" opacity=".5"/>' },
    hills: { label: '구릉', svg:
      '<path d="M1.5 32c4.5-10 12.5-10 17 0z" fill="#b9b09a" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M16 32c5.5-12 15-12 22 0z" fill="#c6bda6" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M8 26c1.5-3 4-3 5.5 0" fill="none" stroke="' + INK + '" stroke-width="1" opacity=".45"/>' },
    forest: { label: '숲', svg:
      '<path d="M11 30 15 15l4 15z" fill="#5d8a5f" stroke="#2f4a33" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M23 32 27 18l4 14z" fill="#4e7a56" stroke="#2f4a33" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M5 33 8.5 22 12 33z" fill="#6b9a6c" stroke="#2f4a33" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M15 30v4M27 32v3M8.5 33v3" stroke="#5a4630" stroke-width="1.6" stroke-linecap="round"/>' },
    swamp: { label: '늪', svg:
      '<path d="M3 30h34" stroke="#5d7d72" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M6 34c3-2 6-2 9 0s6 2 9 0 6-2 10 0" fill="none" stroke="#5d7d72" stroke-width="1.4"/>' +
      '<path d="M13 28V12M20 28V16M27 28V11" stroke="#4f6b46" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M13 16l-3-4M13 20l3-4M20 20l-3-4M27 15l3-4M27 19l-3-4" stroke="#4f6b46" stroke-width="1.2" stroke-linecap="round"/>' },
    river: { label: '강', svg:
      '<path d="M34 4c-6 6-2 11-8 16s-3 10-9 16" fill="none" stroke="#5b93a8" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M34 4c-6 6-2 11-8 16s-3 10-9 16" fill="none" stroke="#cfe3e8" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M12 30c3 1 6 1 9 0" fill="none" stroke="#5b93a8" stroke-width="2.2" stroke-linecap="round"/>' },
    lake: { label: '호수', svg:
      '<ellipse cx="20" cy="21" rx="15" ry="9" fill="#7fa9bd" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M11 20c3-2 6-2 9 0s6 2 9 0" fill="none" stroke="#e6f1f4" stroke-width="1.3" opacity=".85"/>' +
      '<path d="M14 25c3-1.6 6-1.6 9 0" fill="none" stroke="#e6f1f4" stroke-width="1.1" opacity=".6"/>' },
    sea: { label: '바다', svg:
      '<path d="M2 16c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" fill="none" stroke="#4f88a0" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M2 24c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" fill="none" stroke="#4f88a0" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M2 32c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" fill="none" stroke="#4f88a0" stroke-width="2" stroke-linecap="round" opacity=".55"/>' },
    desert: { label: '사막', svg:
      '<circle cx="29" cy="11" r="4" fill="#e9c46a" stroke="#b08a3a" stroke-width="1.2"/>' +
      '<path d="M1.5 30c6-8 13-8 19 0z" fill="#e2c793" stroke="#a58a52" stroke-width="1.3"/>' +
      '<path d="M19 33c6-7 13-7 19 0z" fill="#d8b97f" stroke="#a58a52" stroke-width="1.3"/>' +
      '<path d="M7 35h7M24 36h6" stroke="#a58a52" stroke-width="1.2" opacity=".6"/>' },
    volcano: { label: '화산', svg:
      '<path d="M6 34 17 12h6l11 22z" fill="#8b7f74" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M17 12h6l3 6-4 4-4-3-3 3-1-4z" fill="#c4633f" stroke="#8f3d24" stroke-width="1"/>' +
      '<path d="M20 10c-2-3 1-4 0-7M24 9c2-2 0-4 1-6" fill="none" stroke="#9a8f84" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>' },
    snow: { label: '설원', svg:
      '<path d="M2 33 14 12 22 25 27 17 38 33Z" fill="#eef2f4" stroke="#7f8a92" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M8 33 14 22M20 33 27 24" stroke="#a9b4bb" stroke-width="1" opacity=".7"/>' +
      '<path d="M9 15v6M6 18h6M22.5 8v5M20 10.5h5" stroke="#9fc3d8" stroke-width="1.2" stroke-linecap="round"/>' },
    castle: { label: '성', svg:
      '<path d="M9 34V16h5v4h4v-4h4v4h4v-4h5v18z" fill="#c2b7a3" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M17 34v-7a3 3 0 0 1 6 0v7" fill="#6d5a44" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<path d="M20 16V6l7 3-7 3" fill="#a2493f" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' },
    city: { label: '도시', svg:
      '<path d="M5 34V20h7v14zM14 34V13h8v21zM24 34V22h6v12zM31 34V17h5v17z" fill="#c8bda8" stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M14 13 18 7l4 6" fill="#9c7a5a" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M7 25h3M16 19h4M16 25h4M26 27h2M33 22h1" stroke="' + INK + '" stroke-width="1.3" opacity=".7"/>' },
    ruins: { label: '유적', svg:
      '<path d="M7 34V17h5v17zM18 34V10h5v24zM29 34V20h5v14z" fill="#cdc1a8" stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M5 17h9M16 10h9M27 20h9" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M9 24h1M20 17h1M20 24h1M31 26h1" stroke="' + INK + '" stroke-width="1.4" opacity=".6"/>' +
      '<path d="M3 34h34" stroke="' + INK + '" stroke-width="1.4" opacity=".7"/>' },
    dungeon: { label: '던전', svg:
      '<path d="M6 34V20a14 14 0 0 1 28 0v14z" fill="#6d6154" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M14 34V22a6 6 0 0 1 12 0v12z" fill="#2f2822" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M11 30h5M24 30h5M17 15h6" stroke="#b9ab94" stroke-width="1.2" opacity=".6"/>' },
    road: { label: '길', svg:
      '<path d="M2 33C12 27 10 18 20 14s16-4 18-10" fill="none" stroke="#8b7350" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 4"/>' +
      '<path d="M2 33C12 27 10 18 20 14s16-4 18-10" fill="none" stroke="#e8dcc0" stroke-width="1.2" stroke-linecap="round"/>' },
    route: { label: '항로', svg:
      '<path d="M3 32C9 26 12 20 20 20s12-8 17-14" fill="none" stroke="#3f7d99" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>' +
      '<path d="M14 22h12l-2 5H16z" fill="#c2b7a3" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path d="M20 22v-8l6 3-6 3" fill="#e8dcc0" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' }
  };

  const TERRAIN_ORDER = ['mountains', 'hills', 'forest', 'swamp', 'river', 'lake', 'sea', 'desert', 'volcano', 'snow', 'castle', 'city', 'ruins', 'dungeon', 'road', 'route'];
  const STAMP_SIZE = { s: 22, m: 34, l: 50 };

  const st = {
    host: null,
    opts: {},
    pinning: false,
    story: false,
    terrain: false,
    terrainType: 'mountains',
    terrainSize: 'm',
    index: 0,
    playing: false,
    timer: 0,
    stops: [],
    ratio: 3 / 4,
    // 확대/이동 뷰 (배율 1 = 지도 전체가 한눈에 들어오는 맞춤 상태)
    zoom: 1,
    tx: 0,
    ty: 0,
    gestureAt: 0
  };

  function world() { return st.opts.world ? st.opts.world() : null; }

  function kindMeta(kind) { return KINDS[kind] || KINDS.city; }

  function terrainMeta(type) { return TERRAIN[type] || TERRAIN.mountains; }

  /* 지도 캔버스 비율(width / height) — 업로드한 이미지의 실제 비율을 그대로 따른다.
     아주 극단적인 값(1:20 밖)만 잘라 내고, 그 외에는 한 픽셀도 자르지 않는다. */
  function ratioOf(w) {
    const r = w && w.map && w.map.ratio;
    if (typeof r === 'number' && isFinite(r) && r > 0) return Math.min(20, Math.max(0.05, r));
    return 3 / 4;
  }

  // SVG 오버레이 좌표계: 폭 320 고정, 높이는 지도 비율에 맞춰 늘어난다.
  const VW = 320;
  function viewH() { return Math.round(VW / (st.ratio || 0.75)); }

  /* 지도 스타일: 양피지 변환본(parchment) / 올린 원본(original) */
  function styleName(w) {
    if (!w || !w.map) return 'parchment';
    if (w.map.style === 'original') return 'original';
    if (w.map.style === 'parchment') return 'parchment';
    return w.map.imageOriginal ? 'parchment' : 'original';
  }

  function mapSource(w) {
    if (!w || !w.map) return null;
    if (w.map.kind === 'sample') return global.Sample.mapURI;
    if (!w.map.image) return null;
    if (styleName(w) === 'original' && w.map.imageOriginal) return w.map.imageOriginal;
    return w.map.image;
  }

  function sortedEpisodes(w) {
    return (w.episodes || []).slice().sort((a, b) => (a.no || 0) - (b.no || 0));
  }

  function sortedEvents(w) {
    const order = w.eraOrder || [];
    const rank = (era) => {
      const i = order.indexOf(era);
      return i === -1 ? 99 : i;
    };
    return (w.events || []).slice().sort((a, b) => {
      const ra = rank(a.era), rb = rank(b.era);
      if (ra !== rb) return ra - rb;
      return (Number(a.yearNum != null ? a.yearNum : a.year) || 0) - (Number(b.yearNum != null ? b.yearNum : b.year) || 0);
    });
  }

  // Story journey = episodes' linked regions in order (falls back to events).
  function buildStops(w) {
    if (!w || !w.map) return [];
    const byId = new Map((w.map.markers || []).map((m) => [m.id, m]));
    const stops = [];
    sortedEpisodes(w).forEach((ep) => {
      const locs = (ep.locations || []).filter((id) => byId.has(id));
      locs.forEach((id) => {
        const m = byId.get(id);
        const last = stops[stops.length - 1];
        if (last && last.marker.id === m.id) return;
        stops.push({ marker: m, episode: ep, source: 'episode' });
      });
    });
    if (stops.length >= 2) return stops;

    const evStops = [];
    sortedEvents(w).forEach((ev) => {
      const locs = (ev.locations || []).filter((id) => byId.has(id));
      locs.forEach((id) => {
        const m = byId.get(id);
        const last = evStops[evStops.length - 1];
        if (last && last.marker.id === m.id) return;
        evStops.push({ marker: m, event: ev, source: 'event' });
      });
    });
    return evStops.length >= 2 ? evStops : [];
  }

  // Catmull-Rom → cubic bezier: smooth travel line without loops
  function pathD(points) {
    if (!points.length) return '';
    if (points.length === 1) return 'M' + points[0].x + ' ' + points[0].y;
    let d = 'M' + points[0].x + ' ' + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + p2.x + ' ' + p2.y;
    }
    return d;
  }

  // 핀 좌표(0~100%) → SVG 좌표계. 지도 이미지 영역과 1:1로 맞춘다.
  function stopPoints() {
    const h = viewH();
    return st.stops.map((s) => ({ x: (s.marker.x / 100) * VW, y: (s.marker.y / 100) * h }));
  }

  function pathInner() {
    const points = stopPoints();
    if (!points.length) return '';
    const upto = points.slice(0, st.index + 1);
    return '<path d="' + pathD(points) + '" fill="none" stroke="#241a10" stroke-opacity=".26" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="' + pathD(points) + '" fill="none" stroke="#d4af37" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="4 6" stroke-linecap="round"/>' +
      (upto.length > 1
        ? '<path class="story-path-glow" d="' + pathD(upto) + '" fill="none" stroke="#d4af37" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>' +
          '<path class="story-path-active" d="' + pathD(upto) + '" fill="none" stroke="#f4d97a" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="7 6"/>'
        : '');
  }

  function badgesInner() {
    return st.stops.map((s, i) =>
      '<span class="story-badge' + (i === st.index ? ' is-current' : (i < st.index ? ' is-past' : '')) + '" style="left:' + s.marker.x + '%;top:' + s.marker.y + '%">' + (i + 1) + '</span>'
    ).join('');
  }

  function renderStoryOverlay() {
    return '<svg class="map-path-svg" viewBox="0 0 ' + VW + ' ' + viewH() + '" preserveAspectRatio="none">' + pathInner() + '</svg>' +
      '<div class="story-badges">' + badgesInner() + '</div>';
  }

  /* ---------------- 지형 스탬프 ---------------- */
  function glyph(type, px) {
    const size = px || 24;
    return '<svg class="tstamp__svg" viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      terrainMeta(type).svg + '</svg>';
  }

  function stampHtml(s) {
    const size = STAMP_SIZE[s.size] || STAMP_SIZE.m;
    return '<button type="button" class="tstamp tstamp--' + U.esc(s.size || 'm') + '" data-stamp="' + U.esc(s.id) + '"' +
      ' data-type="' + U.esc(s.type) + '" style="left:' + s.x + '%;top:' + s.y + '%"' +
      ' aria-label="' + U.esc(terrainMeta(s.type).label) + ' 지형">' + glyph(s.type, size) + '</button>';
  }

  function terrainLayerInner(w) {
    return ((w && w.map && w.map.terrainStamps) || []).map(stampHtml).join('');
  }

  function renderTerrainPanel(w) {
    const count = ((w && w.map && w.map.terrainStamps) || []).length;
    return '<div class="terrain-panel">' +
      '<div class="terrain-panel__head">' +
        '<span class="terrain-panel__title">⛰️ 지형 꾸미기</span>' +
        '<span class="terrain-panel__count" data-terrain-count>지형 ' + count + '</span>' +
      '</div>' +
      '<div class="terrain-chips">' + TERRAIN_ORDER.map((k) =>
        '<button type="button" class="tchip' + (st.terrainType === k ? ' is-on' : '') + '" data-terrain-type="' + k + '">' +
          '<span class="tchip__icon">' + glyph(k, 20) + '</span>' + U.esc(TERRAIN[k].label) +
        '</button>').join('') + '</div>' +
      '<div class="terrain-panel__row">' +
        '<span class="terrain-panel__label">크기</span>' +
        '<div class="terrain-sizes">' +
          [['s', '소'], ['m', '중'], ['l', '대']].map((it) =>
            '<button type="button" class="chip chip--small' + (st.terrainSize === it[0] ? ' chip--active' : '') + '" data-terrain-size="' + it[0] + '">' + it[1] + '</button>').join('') +
        '</div>' +
        '<button type="button" class="terrain-clear" data-terrain-act="clear">전체 지우기</button>' +
        '<button type="button" class="terrain-done" data-terrain-act="done">완료</button>' +
      '</div>' +
      '<p class="field-hint">지도를 터치해 지형을 놓고, 놓인 지형을 다시 탭하면 지워져요. 핀은 핀 모드에서 꽂아요.</p>' +
    '</div>';
  }

  function saveTerrain() {
    if (st.opts.onTerrainChange) st.opts.onTerrainChange();
    else if (global.Store) global.Store.save();
  }

  function refreshTerrainCount() {
    const w = world();
    const el = st.host && st.host.querySelector('[data-terrain-count]');
    if (el) el.textContent = '지형 ' + (((w && w.map && w.map.terrainStamps) || []).length);
  }

  function addStamp(x, y) {
    const w = world();
    if (!w || !w.map) return;
    if (!Array.isArray(w.map.terrainStamps)) w.map.terrainStamps = [];
    const stamp = {
      id: U.uid('t'),
      type: st.terrainType,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      size: st.terrainSize
    };
    w.map.terrainStamps.push(stamp);
    const layer = st.host && st.host.querySelector('.terrain-layer');
    if (layer) layer.insertAdjacentHTML('beforeend', stampHtml(stamp));
    refreshTerrainCount();
    saveTerrain();
    U.haptic(8);
  }

  function removeStamp(id) {
    const w = world();
    if (!w || !w.map) return;
    const stamp = (w.map.terrainStamps || []).find((s) => s.id === id);
    w.map.terrainStamps = (w.map.terrainStamps || []).filter((s) => s.id !== id);
    const el = st.host && st.host.querySelector('[data-stamp="' + id + '"]');
    if (el) el.remove();
    refreshTerrainCount();
    saveTerrain();
    U.haptic(10);
    U.toast(stamp ? terrainMeta(stamp.type).label + ' 지형을 지웠어요' : '지형을 지웠어요', { icon: 'i-trash', duration: 1400 });
  }

  async function clearStamps() {
    const w = world();
    if (!w || !w.map) return;
    if (!((w.map.terrainStamps || []).length)) { U.toast('지울 지형이 없어요', { icon: 'i-x' }); return; }
    const ok = await U.confirmSheet({
      title: '놓인 지형을 모두 지울까요?',
      message: '지도 위 지형 스탬프만 지워집니다. 지역 핀과 지도 이미지는 그대로 남아요.',
      confirmText: '전체 지우기',
      danger: true
    });
    if (!ok) return;
    w.map.terrainStamps = [];
    const layer = st.host && st.host.querySelector('.terrain-layer');
    if (layer) layer.innerHTML = '';
    refreshTerrainCount();
    saveTerrain();
    U.toast('지형을 모두 지웠어요', { icon: 'i-trash' });
  }

  function setTerrain(on) {
    st.terrain = !!on;
    if (st.terrain) { st.pinning = false; st.story = false; st.playing = false; clearInterval(st.timer); }
    render();
    if (global.App && global.App.syncFab) global.App.syncFab();
  }

  function characterNames(w, ids) {
    return (ids || []).map((id) => {
      const c = (w.characters || []).find((x) => x.id === id);
      return c ? c.name : null;
    }).filter(Boolean);
  }

  function renderStoryCard(w) {
    if (!st.stops.length) {
      return '<div class="story-card"><div class="prose small">스토리 여정을 만들려면 에피소드나 연표 사건에 지역(핀)을 연결해 주세요.</div></div>';
    }
    const stop = st.stops[st.index];
    const ep = stop.episode;
    const ev = stop.event;
    const title = ep ? ep.title : ev.title;
    const summary = ep ? ep.synopsis : ev.summary;
    const chars = characterNames(w, ep ? ep.characters : ev.characters);
    const badge = ep ? ep.no + '화' : (ev.era || '') + ' ' + (ev.yearNum != null ? ev.yearNum : (ev.year || 0)) + '년';
    const kind = kindMeta(stop.marker.kind);
    return '<div class="story-card">' +
      '<div class="story-card__top">' +
        '<span class="ep-card__no">' + U.esc(badge) + '</span>' +
        '<span class="story-card__place">' + U.esc(kind.label) + ' · ' + U.esc(stop.marker.name) + '</span>' +
        '<button type="button" class="mini-btn" data-story="close" aria-label="스토리 여정 닫기"><svg><use href="#i-x"/></svg></button>' +
      '</div>' +
      '<h3 class="story-card__title">' + U.esc(title || '제목 없음') + '</h3>' +
      '<div class="story-controls">' +
        '<button type="button" class="gbtn gbtn--icon" data-story="prev" aria-label="이전" ' + (st.index === 0 ? 'disabled' : '') + '>' +
          '<svg><use href="#i-chev-left"/></svg></button>' +
        '<div class="story-slider">' +
          '<input type="range" id="story-range" min="0" max="' + (st.stops.length - 1) + '" step="1" value="' + st.index + '" aria-label="스토리 단계">' +
          '<span class="story-count">' + (st.index + 1) + ' / ' + st.stops.length + '</span>' +
        '</div>' +
        '<button type="button" class="gbtn gbtn--icon" data-story="next" aria-label="다음" ' + (st.index >= st.stops.length - 1 ? 'disabled' : '') + '>' +
          '<svg><use href="#i-chev-right"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon' + (st.playing ? ' is-on' : '') + '" data-story="play" aria-label="자동 재생">' +
          '<svg><use href="#' + (st.playing ? 'i-pause' : 'i-play') + '"/></svg></button>' +
      '</div>' +
      (summary ? '<p class="story-card__sum">' + U.esc(summary) + '</p>' : '') +
      (chars.length
        ? '<div class="mini-chips story-card__chars">' + chars.slice(0, 5).map((n) => '<span class="mini-chip">' + U.esc(n) + '</span>').join('') + '</div>'
        : '') +
    '</div>';
  }

  // 지역 핀의 지배 세력 표시명 — 연결된 설정집 항목이 있으면 그 제목을 쓴다
  function factionName(w, m) {
    if (m.factionId) {
      const f = ((w && w.lore) || []).find((x) => x.id === m.factionId);
      if (f) return f.title;
    }
    return m.faction || '';
  }

  function pinHtml(m, w) {
    const kind = kindMeta(m.kind);
    const stopIdx = st.stops.findIndex((s) => s.marker.id === m.id);
    const storyCls = st.story && stopIdx > -1
      ? (stopIdx === st.index ? ' pin--current' : (stopIdx < st.index ? ' pin--passed' : ''))
      : '';
    return '<button type="button" class="pin ' + kind.cls + storyCls + '" data-pin="' + U.esc(m.id) + '" style="left:' + m.x + '%;top:' + m.y + '%" aria-label="' + U.esc(m.name) + '">' +
      '<span class="pin__mark"><span>' + U.esc(kind.mark) + '</span></span>' +
      '<span class="pin__label">' + U.esc(m.name) + '</span>' +
      (factionName(w, m) ? '<span class="pin__faction">⚑ ' + U.esc(factionName(w, m)) + '</span>' : '') +
    '</button>';
  }

  function render() {
    const w = world();
    if (!w || !st.host) return;
    const src = mapSource(w);
    const markers = (w.map.markers || []).slice();
    const stamps = (w.map.terrainStamps || []);
    const hasMap = !!src;

    st.ratio = ratioOf(w);

    st.stops = buildStops(w);
    if (st.index > st.stops.length - 1) st.index = Math.max(0, st.stops.length - 1);

    let html = '';

    const style = styleName(w);
    const canSwitchStyle = hasMap && w.map.kind === 'custom' && !!w.map.imageOriginal;

    html += '<div class="map-toolbar">' +
      '<button type="button" class="gbtn" data-map="upload"><svg><use href="#i-image"/></svg>지도 이미지</button>' +
      '<button type="button" class="gbtn" data-map="gen"><span class="gbtn__emoji">🎲</span>대륙 생성</button>' +
      '<button type="button" class="gbtn' + (st.pinning ? ' is-on' : '') + '" data-map="pin"><svg><use href="#i-pin"/></svg>핀 꽂기</button>' +
      '<button type="button" class="gbtn' + (st.terrain ? ' is-on' : '') + '" data-map="terrain"><span class="gbtn__emoji">⛰️</span>지형 꾸미기</button>' +
      '<button type="button" class="gbtn' + (st.story ? ' is-on' : '') + '" data-map="story"><svg><use href="#i-route"/></svg>스토리 여정</button>' +
      (canSwitchStyle
        ? '<button type="button" class="gbtn' + (style === 'parchment' ? ' is-on' : '') + '" data-map="style" aria-label="지도 스타일 바꾸기">' +
            '<span class="gbtn__emoji">' + (style === 'parchment' ? '📜' : '🖼️') + '</span>' + (style === 'parchment' ? '양피지' : '원본') + '</button>'
        : '') +
    '</div>';

    if (!hasMap) {
      html += '<div class="empty">' +
        '<div class="empty__sigil">✦</div>' +
        '<h3>아직 지도가 없어요</h3>' +
        '<p>기본 판타지 지도로 시작하거나,<br>직접 그린 지도 이미지를 올려 보세요.</p>' +
        '<div class="btn-row mt-14" style="max-width:260px;margin:14px auto 0">' +
          '<button type="button" class="btn btn--sm" data-map="sample">기본 지도</button>' +
          '<button type="button" class="btn btn--sm btn--gold" data-map="upload">이미지 올리기</button>' +
        '</div>' +
      '</div>';
    } else {
      // 지도는 업로드한 이미지의 원본 비율을 그대로 쓴다 → 어떤 비율을 올려도 잘리지 않는다.
      html += '<div class="map-frame' + (st.pinning ? ' is-pinning' : '') + (st.story ? ' is-story' : '') + (st.terrain ? ' is-terrain' : '') +
        '" id="map-frame" style="aspect-ratio:' + st.ratio + '">' +
        '<div class="map-stage" id="map-stage">' +
          '<img class="map-img" src="' + U.esc(src) + '" alt="세계 지도" draggable="false">' +
          '<div class="terrain-layer">' + terrainLayerInner(w) + '</div>' +
          (st.story ? renderStoryOverlay() : '') +
          '<div class="pin-layer">' + markers.map((m) => pinHtml(m, w)).join('') + '</div>' +
        '</div>' +
        '<div class="map-zoom" role="group" aria-label="지도 확대·축소">' +
          '<button type="button" class="mz" data-zoom="in" aria-label="확대"><svg><use href="#i-zoom-in"/></svg></button>' +
          '<button type="button" class="mz mz--label" data-zoom="reset" aria-label="100% 맞춤" data-zoomlabel>100%</button>' +
          '<button type="button" class="mz" data-zoom="out" aria-label="축소"><svg><use href="#i-zoom-out"/></svg></button>' +
        '</div>' +
        ((!markers.length && !st.pinning && !st.terrain) || st.pinning || st.terrain
          ? '<div class="map-empty-hint">' +
              (st.terrain ? '지형 팔레트에서 지형을 고르고 지도를 터치하세요'
                : (st.pinning ? '지도를 터치해 지역 핀을 꽂으세요' : '핀 꽂기를 눌러 지역을 등록할 수 있어요')) +
            '</div>'
          : '') +
      '</div>';

      if (st.terrain) html += renderTerrainPanel(w);
      if (st.story) html += renderStoryCard(w);

      html += '<div class="section-head"><div><span class="eyebrow">Regions & Terrain</span>' +
        '<h2>지역 <span class="muted" style="font-size:12px">' + markers.length + '</span>' +
        (stamps.length ? ' <span class="muted" style="font-size:12px">· 지형 ' + stamps.length + '</span>' : '') +
        '</h2></div></div>';
      html += '<div class="list">' + (markers.length
        ? markers.map((m) => {
            const kind = kindMeta(m.kind);
            return '<button type="button" class="row-card" data-region="' + U.esc(m.id) + '">' +
              '<span class="row-card__badge">' + U.esc(kind.mark) + '</span>' +
              '<span class="row-card__body">' +
                '<span class="row-card__title">' + U.esc(m.name) + '</span>' +
                '<span class="row-card__meta">' + U.esc(kind.label) + (factionName(w, m) ? ' · ⚑ ' + U.esc(factionName(w, m)) : '') + (m.danger ? ' · ' + U.esc(m.danger) : '') + '</span>' +
              '</span>' +
              '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span>' +
            '</button>';
          }).join('')
        : '<div class="empty"><div class="empty__sigil">✦</div><p>아직 등록된 지역이 없어요.</p></div>') + '</div>';
    }

    st.host.innerHTML = html;
    bindMap(w);
    applyView();
    syncRatioFromImage(w);
  }

  // 이미지 실측 비율과 저장된 비율이 다르면(예전 데이터) 한 번 맞춰 다시 그린다.
  function syncRatioFromImage(w) {
    const frame = st.host && st.host.querySelector('#map-frame');
    const img = frame && frame.querySelector('img.map-img');
    if (!img || !w || !w.map) return;
    let done = false;
    const apply = () => {
      if (done) return;
      const nw = img.naturalWidth || 0;
      const nh = img.naturalHeight || 0;
      if (!nw || !nh) return;
      done = true;
      const real = nw / nh;
      done = true;
      if (!isFinite(real) || real <= 0) return;
      const cur = ratioOf(w);
      if (Math.abs(real - cur) / cur > 0.004) {
        w.map.ratio = Math.round(real * 1000) / 1000;
        if (global.Store) global.Store.save();
        render();
      }
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
  }

  function updateStory(w) {
    const frame = st.host && st.host.querySelector('#map-frame');
    if (!frame) return;
    const overlay = frame.querySelector('.map-path-svg');
    const badges = frame.querySelector('.story-badges');
    if (overlay) overlay.innerHTML = pathInner();
    if (badges) badges.innerHTML = badgesInner();
    frame.querySelectorAll('[data-pin]').forEach((pin) => {
      const id = pin.getAttribute('data-pin');
      const idx = st.stops.findIndex((s) => s.marker.id === id);
      pin.classList.toggle('pin--current', idx === st.index);
      pin.classList.toggle('pin--passed', idx > -1 && idx < st.index);
    });
    const card = st.host.querySelector('.story-card');
    if (card) {
      const tmp = document.createElement('div');
      tmp.innerHTML = renderStoryCard(w);
      card.replaceWith(tmp.firstElementChild);
    }
    bindStoryCard(w);
  }

  function setStory(on) {
    st.story = !!on;
    st.playing = false;
    clearInterval(st.timer);
    if (st.story) { st.terrain = false; st.pinning = false; }
    const w = world();
    if (st.story) {
      st.stops = buildStops(w);
      st.index = 0;
    }
    render();
    if (global.App && global.App.syncFab) global.App.syncFab();
  }

  function goStep(i) {
    const w = world();
    if (!st.stops.length) return;
    st.index = U.clamp(i, 0, st.stops.length - 1);
    updateStory(w);
    U.haptic(6);
  }

  function startPlay() {
    if (!st.stops.length) return;
    st.playing = true;
    updateStory(world());
    clearInterval(st.timer);
    st.timer = setInterval(() => {
      if (!st.playing) return;
      if (st.index >= st.stops.length - 1) {
        st.playing = false;
        clearInterval(st.timer);
        updateStory(world());
        return;
      }
      st.index += 1;
      updateStory(world());
    }, 2100);
  }

  function stopPlay() {
    st.playing = false;
    clearInterval(st.timer);
    updateStory(world());
  }

  function bindStoryCard(w) {
    const host = st.host;
    if (!host) return;
    host.querySelectorAll('[data-story]').forEach((btn) => {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-story');
        if (act === 'prev') { stopPlay(); goStep(st.index - 1); }
        else if (act === 'next') { stopPlay(); goStep(st.index + 1); }
        else if (act === 'play') { if (st.playing) stopPlay(); else startPlay(); }
        else if (act === 'close') { stopPlay(); setStory(false); }
      });
    });
    const range = host.querySelector('#story-range');
    if (range && !range.__bound) {
      range.__bound = true;
      range.addEventListener('input', () => {
        stopPlay();
        st.index = Number(range.value);
        updateStory(world());
      });
    }
  }

  function bindMap(w) {
    const host = st.host;
    if (!host) return;

    host.querySelectorAll('[data-map]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.getAttribute('data-map');
        if (act === 'pin') {
          st.pinning = !st.pinning;
          if (st.pinning) st.terrain = false;
          render();
          if (st.pinning) U.toast('지도를 터치해 핀을 꽂아 보세요', { icon: 'i-pin' });
        } else if (act === 'terrain') {
          if (!mapSource(w)) {
            U.toast('지도 이미지를 먼저 올리거나 기본 지도를 불러와 주세요', { icon: 'i-image', duration: 2600 });
            return;
          }
          setTerrain(!st.terrain);
          if (st.terrain) U.toast('지형 팔레트에서 지형을 고르고 지도를 터치하세요', { icon: 'i-pin', duration: 2200 });
        } else if (act === 'story') {
          if (!buildStops(w).length) {
            U.toast('연결된 지역이 있는 에피소드가 2개 이상 필요해요', { icon: 'i-route', duration: 2600 });
            return;
          }
          setStory(!st.story);
        } else if (act === 'upload') {
          if (st.opts.onUpload) st.opts.onUpload();
        } else if (act === 'gen') {
          generateContinent(w);
        } else if (act === 'style') {
          toggleMapStyle(w);
        } else if (act === 'sample') {
          if (st.opts.onUseSample) st.opts.onUseSample();
        }
      });
    });

    // 지형 팔레트
    host.querySelectorAll('[data-terrain-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        st.terrainType = btn.getAttribute('data-terrain-type');
        host.querySelectorAll('[data-terrain-type]').forEach((b) => b.classList.toggle('is-on', b === btn));
        U.haptic(6);
      });
    });
    host.querySelectorAll('[data-terrain-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        st.terrainSize = btn.getAttribute('data-terrain-size');
        host.querySelectorAll('[data-terrain-size]').forEach((b) => b.classList.toggle('chip--active', b === btn));
        U.haptic(6);
      });
    });
    host.querySelectorAll('[data-terrain-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-terrain-act');
        if (act === 'clear') clearStamps();
        else if (act === 'done') setTerrain(false);
      });
    });

    const frame = host.querySelector('#map-frame');
    if (frame) {
      bindGestures(frame);
      // + / − / 100%(맞춤) 단추
      frame.querySelectorAll('[data-zoom]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const act = btn.getAttribute('data-zoom');
          if (act === 'in') zoomBy(1.5);
          else if (act === 'out') zoomBy(1 / 1.5);
          else resetView();
        });
      });
      frame.addEventListener('click', (e) => {
        if (e.target.closest('.map-zoom')) return;
        // 방금 핀치·팬 제스처가 끝났으면 탭으로 오인하지 않는다
        if (Date.now() - st.gestureAt < 500) return;
        // 지형 스탬프를 탭하면 지운다 (지형 모드에서만)
        const stamp = e.target.closest('[data-stamp]');
        if (stamp && st.terrain) {
          e.preventDefault();
          e.stopPropagation();
          removeStamp(stamp.getAttribute('data-stamp'));
          return;
        }
        const pin = e.target.closest('[data-pin]');
        if (pin) {
          const id = pin.getAttribute('data-pin');
          if (st.story) {
            const idx = st.stops.findIndex((s) => s.marker.id === id);
            if (idx > -1) { stopPlay(); goStep(idx); return; }
          }
          if (st.opts.onPin) st.opts.onPin(id);
          return;
        }
        // 화면 좌표를 지도(스테이지) 좌표로 역산 — 확대·이동해 있어도 정확하다
        const stage = frame.querySelector('#map-stage');
        const rect = (stage || frame).getBoundingClientRect();
        const x = U.clamp(((e.clientX - rect.left) / rect.width) * 100, 1, 99);
        const y = U.clamp(((e.clientY - rect.top) / rect.height) * 100, 1, 99);
        if (st.terrain) {
          addStamp(x, y);
          return;
        }
        if (!st.pinning) return;
        st.pinning = false;
        if (st.opts.onCreatePin) st.opts.onCreatePin(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
      });
    }

    host.querySelectorAll('[data-region]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-region');
        if (st.opts.onPin) st.opts.onPin(id);
      });
    });

    if (st.story) bindStoryCard(w);
  }

  /* =========================================================
     확대 · 축소 · 이동 — 자유 비율 지도 뷰어
     ========================================================= */
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;

  function frameEl() { return st.host && st.host.querySelector('#map-frame'); }
  function stageEl() { const f = frameEl(); return f && f.querySelector('#map-stage'); }

  function markGesture() { st.gestureAt = Date.now(); }

  function applyView() {
    const frame = frameEl();
    const stage = stageEl();
    if (!frame || !stage) return;
    const W = frame.clientWidth || frame.offsetWidth || 1;
    const H = frame.clientHeight || frame.offsetHeight || 1;
    let z = Number(st.zoom);
    if (!isFinite(z) || z <= 0) z = 1;
    z = U.clamp(z, MIN_ZOOM, MAX_ZOOM);
    st.zoom = z;
    if (z <= 1.0005) { st.zoom = z = 1; st.tx = 0; st.ty = 0; }
    st.tx = Math.min(0, Math.max(W - W * z, Number(st.tx) || 0));
    st.ty = Math.min(0, Math.max(H - H * z, Number(st.ty) || 0));
    stage.style.transform = 'translate3d(' + st.tx.toFixed(2) + 'px,' + st.ty.toFixed(2) + 'px,0) scale(' + z.toFixed(4) + ')';
    // 핀·여정 번호는 확대해도 화면에서 같은 크기로, 지형 도장은 조금만 커지게
    stage.style.setProperty('--mk', U.clamp(1 / z, 0.34, 1).toFixed(3));
    stage.style.setProperty('--tk', U.clamp(1 / Math.sqrt(z), 0.55, 1).toFixed(3));
    frame.classList.toggle('is-zoomed', z > 1.001);
    const label = frame.querySelector('[data-zoomlabel]');
    if (label) label.textContent = Math.round(z * 100) + '%';
  }

  function zoomAt(next, ax, ay) {
    const frame = frameEl();
    if (!frame) return;
    const z0 = st.zoom || 1;
    const z1 = U.clamp(next, MIN_ZOOM, MAX_ZOOM);
    // 화면의 (ax, ay) 아래에 있던 지도 지점이 그 자리에 그대로 남도록 역산
    const px = (ax - st.tx) / z0;
    const py = (ay - st.ty) / z0;
    st.zoom = z1;
    st.tx = ax - px * z1;
    st.ty = ay - py * z1;
    applyView();
  }

  function zoomBy(factor, ax, ay) {
    const frame = frameEl();
    if (!frame) return;
    const x = typeof ax === 'number' ? ax : (frame.clientWidth || 0) / 2;
    const y = typeof ay === 'number' ? ay : (frame.clientHeight || 0) / 2;
    zoomAt((st.zoom || 1) * factor, x, y);
    U.haptic(6);
  }

  function resetView() {
    st.zoom = 1;
    st.tx = 0;
    st.ty = 0;
    applyView();
    U.haptic(6);
  }

  /* 핀치 줌(두 손가락) + 한 손가락 드래그 팬. 확대 상태에서만 페이지 스크롤을 막는다. */
  function bindGestures(frame) {
    let mode = 0;  // 0 없음 · 1 한 손가락 · 2 두 손가락
    let pan = null;
    let pinch = null;

    function framePoint(clientX, clientY) {
      const r = frame.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function startPinch(touches) {
      const a = touches[0], b = touches[1];
      const p = framePoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      pinch = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
        zoom: st.zoom || 1,
        tx: st.tx, ty: st.ty,
        mx: p.x, my: p.y
      };
      mode = 2;
      pan = null;
    }

    frame.addEventListener('touchstart', (e) => {
      if (e.touches.length >= 2) {
        startPinch(e.touches);
        if (e.cancelable) e.preventDefault();
      } else if (e.touches.length === 1) {
        pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: st.tx, ty: st.ty, moved: 0 };
        mode = 1;
      }
    }, { passive: false });

    frame.addEventListener('touchmove', (e) => {
      if (mode === 2 && e.touches.length >= 2) {
        const a = e.touches[0], b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
        const p = framePoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
        const z = U.clamp(pinch.zoom * (dist / pinch.dist), MIN_ZOOM, MAX_ZOOM);
        const px = (pinch.mx - pinch.tx) / pinch.zoom;
        const py = (pinch.my - pinch.ty) / pinch.zoom;
        st.zoom = z;
        st.tx = p.x - px * z;
        st.ty = p.y - py * z;
        applyView();
        markGesture();
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (mode === 1 && e.touches.length === 1 && pan) {
        const dx = e.touches[0].clientX - pan.x;
        const dy = e.touches[0].clientY - pan.y;
        pan.moved = Math.max(pan.moved, Math.hypot(dx, dy));
        if ((st.zoom || 1) <= 1.001) return;  // 100%에서는 페이지 스크롤을 그대로 둔다
        if (pan.moved < 3) return;
        st.tx = pan.tx + dx;
        st.ty = pan.ty + dy;
        applyView();
        markGesture();
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    function endTouch(e) {
      if (e.touches && e.touches.length === 1) {
        pinch = null;
        pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: st.tx, ty: st.ty, moved: 0 };
        mode = 1;
        return;
      }
      if (!e.touches || e.touches.length === 0) { mode = 0; pinch = null; pan = null; }
    }
    frame.addEventListener('touchend', endTouch);
    frame.addEventListener('touchcancel', () => { mode = 0; pinch = null; pan = null; });

    // iOS Safari가 지도 위에서 페이지 자체를 확대하는 제스처를 막는다
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((name) => {
      frame.addEventListener(name, (e) => { e.preventDefault(); markGesture(); });
    });

    // 데스크톱: 트랙패드 핀치(ctrl+휠)와, 확대해 둔 상태의 휠
    frame.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && (st.zoom || 1) <= 1.001) return;
      e.preventDefault();
      const p = framePoint(e.clientX, e.clientY);
      zoomAt((st.zoom || 1) * (e.deltaY < 0 ? 1.12 : 0.9), p.x, p.y);
    }, { passive: false });
  }

  /* 🎲 대륙 랜덤 생성 — WorldGen이 그린 양피지 지도를 그대로 세계 지도로 쓴다 */
  function generateContinent(w) {
    if (!w || !w.map) return;
    if (!global.WorldGen || typeof global.WorldGen.continent !== 'function') {
      U.toast('대륙 생성기를 불러오지 못했어요', { icon: 'i-x' });
      return;
    }
    U.toast('🎲 새 대륙을 그리고 있어요…', { icon: 'i-sparkles', duration: 1600 });
    setTimeout(() => {
      let made = null;
      try {
        made = global.WorldGen.continent();
      } catch (e) {
        made = null;
      }
      if (!made || !made.dataURL) {
        U.toast('대륙을 그리지 못했어요 · 다시 시도해 주세요', { icon: 'i-x' });
        return;
      }
      w.map.kind = 'generated';
      w.map.image = made.dataURL;
      w.map.imageOriginal = null;
      w.map.style = 'original';
      w.map.ratio = Math.round((made.width / made.height) * 1000) / 1000;
      if (global.Store) global.Store.save();
      render();
      U.haptic(12);
      U.toast('새 대륙을 만들었어요 · 🎲를 다시 누르면 또 다른 대륙', { icon: 'i-sparkles', duration: 2600 });
    }, 60);
  }

  function toggleMapStyle(w) {
    if (!w || !w.map || !w.map.imageOriginal) return;
    const next = styleName(w) === 'parchment' ? 'original' : 'parchment';
    w.map.style = next;
    if (global.Store) global.Store.save();
    render();
    U.haptic(8);
    U.toast(next === 'parchment' ? '📜 옛날 양피지 지도로 바꿨어요' : '🖼️ 올린 원본 지도로 바꿨어요', { icon: 'i-image', duration: 1800 });
  }

  /* =========================================================
     업로드한 지도를 옛날 양피지 지도로 자동 변환 (Canvas)
     ========================================================= */
  const PARCHMENT_MAX = 1600;
  let grainTile = null;
  let inkAlphaLut = null;

  function noiseTile() {
    if (grainTile) return grainTile;
    const s = 128;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const x = c.getContext('2d');
    if (!x) return null;
    const img = x.createImageData(s, s);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random();
      const dark = v < 0.55;
      // 미세한 종이 알갱이 — 어두운 점과 밝은 점을 섞어 결을 만든다
      const a = Math.round(30 * Math.pow(Math.random(), 1.7));
      d[i] = dark ? 104 : 255;
      d[i + 1] = dark ? 72 : 247;
      d[i + 2] = dark ? 38 : 224;
      d[i + 3] = a;
    }
    x.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  /* 양피지 바탕 — 바탕색 · 입자 · 얼룩 · 주름 · 비네팅을 한 번에 깐다.
     자동 변환과 🎲 대륙 생성이 같은 질감을 쓴다. */
  function paintParchmentBase(ctx, W, H) {
    // 1) 바탕 — 따뜻한 양피지 그라데이션
    const base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, '#f4e4c3');
    base.addColorStop(0.45, '#edd9b3');
    base.addColorStop(1, '#ddc399');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // 2) 종이 입자
    const tile = noiseTile();
    if (tile) {
      const pat = ctx.createPattern(tile, 'repeat');
      if (pat) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    // 3) 오래된 얼룩 · 변색
    const blotches = Math.max(6, Math.round((W * H) / 90000));
    for (let i = 0; i < blotches; i++) {
      const cx = Math.random() * W;
      const cy = Math.random() * H;
      const r = (0.05 + Math.random() * 0.17) * Math.max(W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(122,82,38,' + (0.028 + Math.random() * 0.055).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(122,82,38,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // 4) 은은한 낡은 주름 (세로 2~3개, 가로 1개)
    const lineW = Math.max(1, Math.round(Math.min(W, H) / 520));
    const folds = 2 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= folds; i++) {
      const x = (W * i) / (folds + 1) + (Math.random() - 0.5) * W * 0.04;
      const g = ctx.createLinearGradient(x - lineW * 3, 0, x + lineW * 3, 0);
      g.addColorStop(0, 'rgba(120,82,40,0)');
      g.addColorStop(0.5, 'rgba(120,82,40,.10)');
      g.addColorStop(1, 'rgba(120,82,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - lineW * 3, 0, lineW * 6, H);
    }
    const gy = H * (0.34 + Math.random() * 0.28);
    const gh = ctx.createLinearGradient(0, gy - lineW * 3, 0, gy + lineW * 3);
    gh.addColorStop(0, 'rgba(120,82,40,0)');
    gh.addColorStop(0.5, 'rgba(120,82,40,.09)');
    gh.addColorStop(1, 'rgba(120,82,40,0)');
    ctx.fillStyle = gh;
    ctx.fillRect(0, gy - lineW * 3, W, lineW * 6);

    // 5) 가장자리 비네팅 — 세피아 · 번트 엄버
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.26, W / 2, H / 2, Math.max(W, H) * 0.74);
    vg.addColorStop(0, 'rgba(255,244,222,0)');
    vg.addColorStop(0.62, 'rgba(150,104,52,.10)');
    vg.addColorStop(1, 'rgba(82,50,20,.46)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function inkAlphas() {
    if (inkAlphaLut) return inkAlphaLut;
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let a = (1 - v / 255 - 0.04) * 1.18;
      if (a <= 0) { lut[v] = 0; continue; }
      if (a > 1) a = 1;
      lut[v] = Math.round(Math.pow(a, 0.82) * 255);
    }
    inkAlphaLut = lut;
    return lut;
  }

  function parchmentCanvas(img) {
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) throw new Error('지도 이미지 크기를 알 수 없어요.');
    const scale = Math.min(1, PARCHMENT_MAX / Math.max(nw, nh));
    const W = Math.max(2, Math.round(nw * scale));
    const H = Math.max(2, Math.round(nh * scale));

    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('캔버스를 만들지 못했어요.');

    // 1~5) 바탕 · 종이 입자 · 얼룩 · 주름 · 비네팅
    paintParchmentBase(ctx, W, H);

    // 6) 잉크층 — 흰 배경은 투명, 선·음영은 세피아 잉크
    const ink = document.createElement('canvas');
    ink.width = W;
    ink.height = H;
    const ix = ink.getContext('2d');
    if (ix) {
      ix.fillStyle = '#ffffff';
      ix.fillRect(0, 0, W, H);
      ix.drawImage(img, 0, 0, W, H);
      let data = null;
      try { data = ix.getImageData(0, 0, W, H); } catch (e) { data = null; }
      if (data) {
        const d = data.data;
        const lut = inkAlphas();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          const a = lut[lum > 255 ? 255 : lum];
          if (!a) { d[i + 3] = 0; continue; }
          // 원본의 색기를 조금 남긴 세피아 잉크
          d[i] = Math.round(52 + r * 0.30);
          d[i + 1] = Math.round(38 + g * 0.26);
          d[i + 2] = Math.round(22 + b * 0.20);
          d[i + 3] = a;
        }
        ix.putImageData(data, 0, 0);
      }
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(ink, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 7) 테두리 번짐
    const bw = Math.max(2, Math.round(Math.min(W, H) * 0.006));
    ctx.strokeStyle = 'rgba(84,54,24,.32)';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);

    try {
      return out.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      return out.toDataURL('image/png');
    }
  }

  function parchment(src) {
    return new Promise((resolve, reject) => {
      if (!src) { reject(new Error('지도 이미지가 없어요.')); return; }
      const img = new Image();
      img.onload = () => {
        try { resolve(parchmentCanvas(img)); } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('지도 이미지를 열지 못했어요.'));
      img.src = src;
    });
  }

  function mount(host, opts) {
    st.host = host;
    st.opts = opts || {};
    st.pinning = false;
    st.story = false;
    st.terrain = false;
    st.terrainType = st.terrainType || 'mountains';
    st.terrainSize = st.terrainSize || 'm';
    st.index = 0;
    st.playing = false;
    st.zoom = 1;
    st.tx = 0;
    st.ty = 0;
    clearInterval(st.timer);
    render();
    if (!st.__boundResize) {
      st.__boundResize = true;
      // 화면을 돌리거나 크기가 바뀌면 확대 상태를 다시 맞춘다
      window.addEventListener('resize', () => { if (st.host) applyView(); });
      window.addEventListener('orientationchange', () => { setTimeout(() => { if (st.host) applyView(); }, 260); });
    }
    return api;
  }

  function refresh() {
    clearInterval(st.timer);
    if (st.story) {
      st.stops = buildStops(world());
      if (!st.stops.length) st.story = false;
      if (st.index > st.stops.length - 1) st.index = Math.max(0, st.stops.length - 1);
    }
    render();
  }

  function destroy() {
    clearInterval(st.timer);
    st.playing = false;
    if (st.host) st.host.innerHTML = '';
    st.host = null;
    st.story = false;
    st.pinning = false;
    st.terrain = false;
  }

  const api = { mount, refresh, destroy, setStory, setTerrain, goStep, KINDS, TERRAIN, TERRAIN_ORDER, state: st, buildStops, parchment, parchmentBase: paintParchmentBase, zoomBy, resetView, applyView, generateContinent };
  global.MapView = api;
})(window);
