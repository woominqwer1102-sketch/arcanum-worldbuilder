/* =========================================================
   ARCANUM · 지도 + 지역 핀 + 스토리 여정(타임라인)
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

  const st = {
    host: null,
    opts: {},
    pinning: false,
    story: false,
    index: 0,
    playing: false,
    timer: 0,
    stops: []
  };

  function world() { return st.opts.world ? st.opts.world() : null; }

  function kindMeta(kind) { return KINDS[kind] || KINDS.city; }

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

  function stopPoints() {
    return st.stops.map((s) => ({ x: s.marker.x * 3.2, y: s.marker.y * 4.27 }));
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
    const points = stopPoints();
    return points.map((p, i) =>
      '<span class="story-badge' + (i === st.index ? ' is-current' : (i < st.index ? ' is-past' : '')) + '" style="left:' + (p.x / 3.2) + '%;top:' + (p.y / 4.27) + '%">' + (i + 1) + '</span>'
    ).join('');
  }

  function renderStoryOverlay() {
    return '<svg class="map-path-svg" viewBox="0 0 320 427" preserveAspectRatio="none">' + pathInner() + '</svg>' +
      '<div class="story-badges">' + badgesInner() + '</div>';
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
    const hasMap = !!src;

    st.stops = buildStops(w);
    if (st.index > st.stops.length - 1) st.index = Math.max(0, st.stops.length - 1);

    let html = '';

    html += '<div class="map-toolbar">' +
      '<button type="button" class="gbtn" data-map="upload"><svg><use href="#i-image"/></svg>지도 이미지</button>' +
      '<button type="button" class="gbtn' + (st.pinning ? ' is-on' : '') + '" data-map="pin"><svg><use href="#i-pin"/></svg>핀 꽂기</button>' +
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
      html += '<div class="map-frame' + (st.pinning ? ' is-pinning' : '') + (st.story ? ' is-story' : '') + '" id="map-frame">' +
        '<img class="map-img" src="' + U.esc(src) + '" alt="세계 지도" draggable="false">' +
        (st.story ? renderStoryOverlay() : '') +
        '<div class="pin-layer">' + markers.map((m) => pinHtml(m, w)).join('') + '</div>' +
        (!markers.length || st.pinning
          ? '<div class="map-empty-hint">' + (st.pinning ? '지도를 터치해 지역 핀을 꽂으세요' : '핀 꽂기를 눌러 지역을 등록할 수 있어요') + '</div>'
          : '') +
      '</div>';

      if (st.story) {
        html += renderStoryCard(w);
      }

      html += '<div class="section-head"><div><span class="eyebrow">Regions</span><h2>지역 <span class="muted" style="font-size:12px">' + markers.length + '</span></h2></div></div>';
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
          render();
          if (st.pinning) U.toast('지도를 터치해 핀을 꽂아 보세요', { icon: 'i-pin' });
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

    const frame = host.querySelector('#map-frame');
    if (frame) {
      frame.addEventListener('click', (e) => {
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
        if (!st.pinning) return;
        const rect = frame.getBoundingClientRect();
        const x = U.clamp(((e.clientX - rect.left) / rect.width) * 100, 2, 98);
        const y = U.clamp(((e.clientY - rect.top) / rect.height) * 100, 2, 98);
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
  }

  const api = { mount, refresh, destroy, setStory, goStep, KINDS, state: st, buildStops };
  global.MapView = api;
})(window);
