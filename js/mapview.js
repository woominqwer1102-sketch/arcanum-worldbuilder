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
    ratio: 3 / 4
  };

  function world() { return st.opts.world ? st.opts.world() : null; }

  function kindMeta(kind) { return KINDS[kind] || KINDS.city; }

  function terrainMeta(type) { return TERRAIN[type] || TERRAIN.mountains; }

  /* 지도 캔버스 비율(width / height) — 업로드한 이미지의 실제 비율을 따른다 */
  function ratioOf(w) {
    const r = w && w.map && w.map.ratio;
    if (typeof r === 'number' && isFinite(r) && r > 0) return Math.min(2.8, Math.max(0.45, r));
    return 3 / 4;
  }

  // SVG 오버레이 좌표계: 폭 320 고정, 높이는 지도 비율에 맞춰 늘어난다.
  const VW = 320;
  function viewH() { return Math.round(VW / (st.ratio || 0.75)); }

  function mapSource(w) {
    if (!w || !w.map) return null;
    if (w.map.kind === 'sample') return global.Sample.mapURI;
    if (w.map.image) return w.map.image;
    return null;
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
      return (a.year || 0) - (b.year || 0);
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
    const badge = ep ? ep.no + '화' : (ev.era || '') + ' ' + (ev.year || 0) + '년';
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

  function pinHtml(m, w) {
    const kind = kindMeta(m.kind);
    const stopIdx = st.stops.findIndex((s) => s.marker.id === m.id);
    const storyCls = st.story && stopIdx > -1
      ? (stopIdx === st.index ? ' pin--current' : (stopIdx < st.index ? ' pin--passed' : ''))
      : '';
    return '<button type="button" class="pin ' + kind.cls + storyCls + '" data-pin="' + U.esc(m.id) + '" style="left:' + m.x + '%;top:' + m.y + '%" aria-label="' + U.esc(m.name) + '">' +
      '<span class="pin__mark"><span>' + U.esc(kind.mark) + '</span></span>' +
      '<span class="pin__label">' + U.esc(m.name) + '</span>' +
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

    html += '<div class="map-toolbar">' +
      '<button type="button" class="gbtn" data-map="upload"><svg><use href="#i-image"/></svg>지도 이미지</button>' +
      '<button type="button" class="gbtn' + (st.pinning ? ' is-on' : '') + '" data-map="pin"><svg><use href="#i-pin"/></svg>핀 꽂기</button>' +
      '<button type="button" class="gbtn' + (st.terrain ? ' is-on' : '') + '" data-map="terrain"><span class="gbtn__emoji">⛰️</span>지형 꾸미기</button>' +
      '<button type="button" class="gbtn' + (st.story ? ' is-on' : '') + '" data-map="story"><svg><use href="#i-route"/></svg>스토리 여정</button>' +
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
      // 지도 캔버스는 이미지의 실제 비율을 그대로 쓴다 → 어떤 비율을 올려도 잘리지 않는다.
      const ar = Math.round(st.ratio * 1000) + ' / 1000';
      html += '<div class="map-frame' + (st.pinning ? ' is-pinning' : '') + (st.story ? ' is-story' : '') + (st.terrain ? ' is-terrain' : '') +
        '" id="map-frame" style="aspect-ratio:' + ar + '">' +
        '<img class="map-img" src="' + U.esc(src) + '" alt="세계 지도" draggable="false">' +
        '<div class="terrain-layer">' + terrainLayerInner(w) + '</div>' +
        (st.story ? renderStoryOverlay() : '') +
        '<div class="pin-layer">' + markers.map((m) => pinHtml(m, w)).join('') + '</div>' +
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
                '<span class="row-card__meta">' + U.esc(kind.label) + (m.faction ? ' · ' + U.esc(m.faction) : '') + (m.danger ? ' · ' + U.esc(m.danger) : '') + '</span>' +
              '</span>' +
              '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span>' +
            '</button>';
          }).join('')
        : '<div class="empty"><div class="empty__sigil">✦</div><p>아직 등록된 지역이 없어요.</p></div>') + '</div>';
    }

    st.host.innerHTML = html;
    bindMap(w);
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
      const real = Math.min(2.8, Math.max(0.45, nw / nh));
      if (Math.abs(real - ratioOf(w)) > 0.01) {
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
      frame.addEventListener('click', (e) => {
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
        const rect = frame.getBoundingClientRect();
        const x = U.clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
        const y = U.clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
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
    clearInterval(st.timer);
    render();
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

  const api = { mount, refresh, destroy, setStory, setTerrain, goStep, KINDS, TERRAIN, TERRAIN_ORDER, state: st, buildStops };
  global.MapView = api;
})(window);
