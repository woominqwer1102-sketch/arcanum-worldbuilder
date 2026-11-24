/* =========================================================
   ARCANUM · app (views, forms, backup, navigation)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;
  const $ = U.$;
  const $$ = U.$$;
  const esc = U.esc;

  const CATS = {
    magic: '마법·능력체계',
    faction: '세력·국가',
    race: '종족·몬스터',
    item: '아이템·유물',
    rule: '기타 규칙'
  };

  const STATUS = {
    idea: { label: '아이디어', cls: 'status--idea' },
    writing: { label: '집필중', cls: 'status--writing' },
    done: { label: '완료', cls: 'status--done' }
  };

  const App = {
    state: null,
    tab: 'dashboard',
    filters: { charQuery: '', charFaction: '전체', charRace: '전체', charRank: '', loreQuery: '', loreCat: '전체', epStatus: '전체', tlEra: '전체' },
    openLore: {}
  };

  const RANK_COLORS = ['#d4af37', '#c9a24a', '#7fa9d8', '#8fbf8f', '#c9738a', '#a98fd0', '#c98a5a', '#9aa7b0'];

  /* ---------------------------------------------------------
     data helpers
     --------------------------------------------------------- */
  function W() {
    if (!App.state) return null;
    return App.state.worlds.find((x) => x.id === App.state.activeId) || null;
  }

  function bindHostOnce(host, key, fn) {
    const attr = 'bind' + key;
    if (host.dataset[attr]) return;
    host.dataset[attr] = '1';
    fn();
  }

  function touch(opts) {
    const w = W();
    if (w) w.updatedAt = Date.now();
    Store.save(opts && opts.immediate);
    renderTop();
  }

  function charsById(w) {
    const map = new Map();
    (w ? w.characters : []).forEach((c) => map.set(c.id, c));
    return map;
  }

  function regionsById(w) {
    const map = new Map();
    (w && w.map ? w.map.markers : []).forEach((m) => map.set(m.id, m));
    return map;
  }

  function unique(list) {
    const seen = new Set();
    const out = [];
    list.forEach((v) => {
      const s = String(v || '').trim();
      if (!s || seen.has(s)) return;
      seen.add(s);
      out.push(s);
    });
    return out;
  }

  function eraRank(w, era) {
    const i = (w.eraOrder || []).indexOf(era);
    return i === -1 ? 99 : i;
  }

  function sortedEvents(w) {
    return (w.events || []).slice().sort((a, b) => {
      const ra = eraRank(w, a.era), rb = eraRank(w, b.era);
      if (ra !== rb) return ra - rb;
      if ((a.year || 0) !== (b.year || 0)) return (a.year || 0) - (b.year || 0);
      return 0;
    });
  }

  function sortedEpisodes(w) {
    return (w.episodes || []).slice().sort((a, b) => (a.no || 0) - (b.no || 0));
  }

  /* ---------------------------------------------------------
     theme + top bar
     --------------------------------------------------------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'parchment' ? '#eadfc3' : '#12100e');
    const btn = $('#btn-theme');
    if (btn) btn.innerHTML = '<svg><use href="#' + (theme === 'parchment' ? 'i-sun' : 'i-moon') + '"/></svg>';
  }

  function renderTop() {
    const w = W();
    const nameEl = $('#world-name');
    const subEl = $('#world-sub');
    if (!nameEl) return;
    if (!w) {
      nameEl.textContent = '세계관 없음';
      subEl.textContent = '새로 시작하기';
      return;
    }
    nameEl.textContent = w.name;
    subEl.textContent = (w.characters.length ? w.characters.length + ' 인물 · ' : '') + (w.era || '연대기');
  }

  /* ---------------------------------------------------------
     navigation
     --------------------------------------------------------- */
  function updateNav() {
    $$('.tab').forEach((t) => {
      const tab = t.dataset.tab;
      const active = tab === App.tab || (tab === 'more' && (App.tab === 'lore' || App.tab === 'episodes'));
      t.classList.toggle('is-active', active);
    });
  }

  function go(tab) {
    if (App.tab === 'relations' && tab !== 'relations') Graph.destroy();
    if (App.tab === 'map' && tab !== 'map') MapView.destroy();
    App.tab = tab;
    renderCurrent();
    updateNav();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderCurrent() {
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === App.tab));
    updateFab();
    if (!W()) {
      renderEmptyApp();
      return;
    }
    if (App.tab === 'dashboard') renderDashboard();
    else if (App.tab === 'characters') renderCharacters();
    else if (App.tab === 'relations') renderRelations();
    else if (App.tab === 'timeline') renderTimeline();
    else if (App.tab === 'map') renderMap();
    else if (App.tab === 'lore') renderLore();
    else if (App.tab === 'episodes') renderEpisodes();
  }

  function refreshView() {
    renderTop();
    if (App.tab === 'relations' && Graph.state.mounted) {
      Graph.refresh();
      updateFab();
      return;
    }
    if (App.tab === 'map' && MapView.state.host) {
      MapView.refresh();
      updateFab();
      return;
    }
    renderCurrent();
  }

  function updateFab() {
    const fab = $('#fab');
    if (!fab) return;
    const storyOn = App.tab === 'map' && MapView.state.story;
    const show = !!W() && !storyOn && ['characters', 'timeline', 'lore', 'episodes', 'map'].indexOf(App.tab) > -1;
    fab.hidden = !show;
  }

  App.syncFab = updateFab;

  function renderEmptyApp() {
    const host = $('#dash-host');
    if (!host) return;
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === 'dashboard'));
    App.tab = 'dashboard';
    updateNav();
    host.innerHTML =
      '<div class="empty" style="margin-top:40px">' +
        '<div class="empty__sigil">✦</div>' +
        '<h3>아직 세계관이 없어요</h3>' +
        '<p>샘플 세계관으로 감을 잡거나,<br>빈 세계관에서 바로 시작해 보세요.</p>' +
        '<div style="display:grid;gap:8px;max-width:250px;margin:16px auto 0">' +
          '<button class="btn btn--gold" data-start="sample"><svg><use href="#i-compass"/></svg>샘플로 시작</button>' +
          '<button class="btn btn--ghost" data-start="blank"><svg><use href="#i-plus"/></svg>새 세계관</button>' +
        '</div>' +
      '</div>';
    host.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.start === 'sample') {
        const sample = global.Sample.world();
        App.state.worlds.push(sample);
        App.state.activeId = sample.id;
        touch({ immediate: true });
        renderCurrent();
        U.toast('샘플 세계관을 불러왔어요');
      } else {
        openWorldForm(null);
      }
    }));
  }

  /* ---------------------------------------------------------
     dashboard
     --------------------------------------------------------- */
  function renderDashboard() {
    const w = W();
    const host = $('#dash-host');
    const stat = [
      { label: '인물', n: w.characters.length, go: 'characters' },
      { label: '관계', n: w.relations.length, go: 'relations' },
      { label: '사건', n: w.events.length, go: 'timeline' },
      { label: '지역', n: w.map.markers.length, go: 'map' },
      { label: '설정', n: w.lore.length, go: 'lore' },
      { label: '에피소드', n: w.episodes.length, go: 'episodes' }
    ];

    const recent = w.characters.slice().reverse().slice(0, 4);
    const recentEvents = sortedEvents(w).slice(-2).reverse();
    const recentEps = sortedEpisodes(w).slice(-2).reverse();

    let html = '';
    html += '<article class="hero">' +
      '<div class="hero__eyebrow">세계관 · ' + esc(w.era || '연대기') + '</div>' +
      '<h1>' + esc(w.name) + '</h1>' +
      (w.tagline ? '<p class="hero__tagline">' + esc(w.tagline) + '</p>' : '') +
      (w.description ? '<p class="hero__desc">' + esc(w.description) + '</p>' : '') +
      '<div class="hero__divider"></div>' +
      '<div class="hero__stats">' +
        stat.map((s) => '<button class="stat" data-go="' + s.go + '"><b>' + s.n + '</b><span>' + s.label + '</span></button>').join('') +
      '</div>' +
    '</article>';

    html += '<div class="section-head"><div><span class="eyebrow">Quick Actions</span><h2>바로 쓰기</h2></div></div>' +
      '<div class="quick-grid">' +
        '<button class="quick" data-act="add-char"><svg><use href="#i-users"/></svg><span>인물 추가</span></button>' +
        '<button class="quick" data-act="add-rel"><svg><use href="#i-network"/></svg><span>관계 잇기</span></button>' +
        '<button class="quick" data-act="add-event"><svg><use href="#i-clock"/></svg><span>사건 기록</span></button>' +
        '<button class="quick" data-act="add-pin"><svg><use href="#i-pin"/></svg><span>지도 핀</span></button>' +
        '<button class="quick" data-act="add-lore"><svg><use href="#i-book"/></svg><span>설정 추가</span></button>' +
        '<button class="quick" data-act="add-ep"><svg><use href="#i-film"/></svg><span>에피소드</span></button>' +
      '</div>';

    html += '<div class="section-head"><div><span class="eyebrow">Characters</span><h2>최근 인물</h2></div>' +
      (w.characters.length ? '<button class="section-head__link" data-go="characters">전체 보기</button>' : '') + '</div>';
    html += recent.length
      ? '<div class="char-grid">' + recent.map(charCard).join('') + '</div>'
      : emptyBlock('아직 인물이 없어요', '주인공부터 세워 볼까요?', 'add-char', '인물 만들기');

    if (recentEvents.length) {
      html += '<div class="section-head"><div><span class="eyebrow">Timeline</span><h2>최근 사건</h2></div>' +
        '<button class="section-head__link" data-go="timeline">연표</button></div><div class="list">' +
        recentEvents.map((e) => eventCard(w, e)).join('') + '</div>';
    }

    if (recentEps.length) {
      html += '<div class="section-head"><div><span class="eyebrow">Episodes</span><h2>최근 에피소드</h2></div>' +
        '<button class="section-head__link" data-go="episodes">전체</button></div><div class="list">' +
        recentEps.map((ep) => episodeCard(ep)).join('') + '</div>';
    }

    html += '<div class="section-head"><div><span class="eyebrow">World</span><h2>세계관</h2></div></div>' +
      '<div class="list">' +
        '<button class="row-card" data-act="worlds">' +
          '<span class="row-card__badge">✦</span>' +
          '<span class="row-card__body"><span class="row-card__title">세계관 전환 · 관리</span>' +
          '<span class="row-card__meta">' + App.state.worlds.length + '개 세계관 · 저장 ' + U.todayLabel() + '</span></span>' +
          '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span></button>' +
        '<button class="row-card" data-act="backup">' +
          '<span class="row-card__badge"><svg width="18" height="18"><use href="#i-download"/></svg></span>' +
          '<span class="row-card__body"><span class="row-card__title">백업 · 복원</span>' +
          '<span class="row-card__meta">JSON으로 내보내기 / 가져오기</span></span>' +
          '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span></button>' +
      '</div>';

    html += '<p class="center muted small" style="margin-top:22px">아르카눔 · 판타지 세계관 노트 v1.0</p>';

    host.innerHTML = html;

    host.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    host.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => handleAction(b.dataset.act)));
    host.querySelectorAll('[data-char]').forEach((b) => b.addEventListener('click', () => openCharacterDetail(b.dataset.char)));
    host.querySelectorAll('[data-event]').forEach((b) => b.addEventListener('click', () => openEventDetail(b.dataset.event)));
    host.querySelectorAll('[data-ep]').forEach((b) => b.addEventListener('click', () => openEpisodeDetail(b.dataset.ep)));
  }

  function emptyBlock(title, text, act, btnLabel) {
    return '<div class="empty"><div class="empty__sigil">✦</div><h3>' + esc(title) + '</h3><p>' + text + '</p>' +
      (act ? '<button class="btn btn--sm" data-act="' + act + '">' + esc(btnLabel) + '</button>' : '') + '</div>';
  }

  function handleAction(act) {
    if (act === 'add-char') openCharacterForm(null);
    else if (act === 'add-event') openEventForm(null);
    else if (act === 'add-lore') openLoreForm(null);
    else if (act === 'add-ep') openEpisodeForm(null);
    else if (act === 'add-pin') { go('map'); setTimeout(() => { MapView.state.pinning = true; MapView.refresh(); }, 40); }
    else if (act === 'add-rel') { go('relations'); setTimeout(() => Graph.setLinkMode(true), 60); }
    else if (act === 'ranks') openRankSystems();
    else if (act === 'worlds') openWorldSwitcher();
    else if (act === 'backup') openBackupSheet();
  }

  /* ---------------------------------------------------------
     characters
     --------------------------------------------------------- */
  function charCard(c, w) {
    const ranks = rankList(w, c);
    return '<button class="char-card" data-char="' + esc(c.id) + '">' +
      '<div class="char-card__portrait">' +
        '<span class="char-card__race">' + esc(c.race || '종족 미정') + '</span>' +
        (c.image ? '<img src="' + esc(c.image) + '" alt="">' : '<span class="char-card__initial">' + esc(U.initials(c.name)) + '</span>') +
      '</div>' +
      '<div class="char-card__body">' +
        '<div class="char-card__name">' + esc(c.name) + '</div>' +
        (c.title ? '<div class="char-card__title">' + esc(c.title) + '</div>' : '') +
        (c.faction ? '<div class="char-card__faction">' + esc(c.faction) + '</div>' : '') +
        (ranks.length ? '<div class="char-card__ranks">' + ranks.map((r) => rankBadge(r, { small: true })).join('') + '</div>' : '') +
      '</div>' +
    '</button>';
  }

  /* ---------------------------------------------------------
     강함 / 등급 — 조회·배지
     --------------------------------------------------------- */
  function rankList(w, c) {
    const systems = (w && w.rankSystems) || [];
    const out = [];
    ((c && c.ranks) || []).forEach((r) => {
      const s = systems.find((x) => x.id === r.systemId);
      if (!s) return;
      const label = s.tiers[r.tier];
      if (!label) return;
      out.push({ system: s, label: label, primary: out.length === 0 });
    });
    return out;
  }

  function rankBadge(rank, opts) {
    const o = opts || {};
    const s = rank.system;
    return '<span class="rank-badge' + (o.small ? ' rank-badge--sm' : '') + (rank.primary ? ' is-primary' : '') +
      '" style="--rank-color:' + esc(s.color) + '" aria-label="' + esc(s.name + ' ' + rank.label) + '">' +
      '<span class="rank-badge__icon">' + esc(s.icon) + '</span>' +
      (o.small ? '' : '<span class="rank-badge__name">' + esc(s.name) + '</span>') +
      '<span class="rank-badge__tier">' + esc(rank.label) + '</span>' +
    '</span>';
  }

  function filteredCharacters(w) {
    const q = App.filters.charQuery.trim().toLowerCase();
    return w.characters.filter((c) => {
      if (App.filters.charFaction !== '전체' && c.faction !== App.filters.charFaction) return false;
      if (App.filters.charRace !== '전체' && c.race !== App.filters.charRace) return false;
      if (App.filters.charRank) {
        const parts = App.filters.charRank.split(':');
        const sid = parts[0];
        const tier = Number(parts[1]);
        if (!(c.ranks || []).some((r) => r.systemId === sid && Number(r.tier) === tier)) return false;
      }
      if (q) {
        const hay = [c.name, c.title, c.race, c.faction, c.abilities, c.personality, c.notes, c.age].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderCharacters() {
    const w = W();
    const host = $('#chars-host');
    const factions = unique(w.characters.map((c) => c.faction));
    const races = unique(w.characters.map((c) => c.race));
    const systems = w.rankSystems || [];
    if (App.filters.charFaction !== '전체' && factions.indexOf(App.filters.charFaction) === -1) App.filters.charFaction = '전체';
    if (App.filters.charRace !== '전체' && races.indexOf(App.filters.charRace) === -1) App.filters.charRace = '전체';
    if (App.filters.charRank && !systems.some((s) => App.filters.charRank.indexOf(s.id + ':') === 0)) App.filters.charRank = '';

    const rankOptions = [];
    if (systems.length) {
      rankOptions.push('<option value="">등급 전체</option>');
      systems.forEach((s) => {
        s.tiers.forEach((t, i) => {
          rankOptions.push('<option value="' + esc(s.id + ':' + i) + '"' +
            (App.filters.charRank === s.id + ':' + i ? ' selected' : '') + '>' +
            esc(s.name + ' · ' + t) + '</option>');
        });
      });
    }

    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Characters</span><h2>인물 <span class="muted" style="font-size:12px">' + w.characters.length + '</span></h2></div>' +
      '<div class="section-head__acts">' +
        '<button class="section-head__link" data-act="ranks"><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-shield"/></svg> 등급</button>' +
        '<button class="section-head__link" data-new-char><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-plus"/></svg> 추가</button>' +
      '</div></div>' +
      '<div class="toolbar"><label class="search"><svg><use href="#i-search"/></svg>' +
        '<input type="search" id="char-search" placeholder="이름 · 칭호 · 종족 검색" value="' + esc(App.filters.charQuery) + '"></label>' +
        (systems.length ? '<select class="select rank-filter" id="char-rank-filter" aria-label="등급으로 찾기">' + rankOptions.join('') + '</select>' : '') +
      '</div>' +
      (factions.length > 1 ? '<div class="chip-row" id="faction-chips">' +
        ['전체'].concat(factions).map((f) => '<button class="chip chip--small' + (App.filters.charFaction === f ? ' chip--active' : '') + '" data-faction="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div>' : '') +
      (races.length > 1 ? '<div class="chip-row" id="race-chips">' +
        ['전체'].concat(races).map((r) => '<button class="chip chip--small' + (App.filters.charRace === r ? ' chip--active' : '') + '" data-race="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>' : '') +
      '<div id="char-grid-host"></div>';

    drawCharGrid();

    host.querySelector('[data-new-char]').addEventListener('click', () => openCharacterForm(null));
    host.querySelector('#char-search').addEventListener('input', (e) => {
      App.filters.charQuery = e.target.value;
      drawCharGrid();
    });
    const rankFilter = host.querySelector('#char-rank-filter');
    if (rankFilter) rankFilter.addEventListener('change', (e) => {
      App.filters.charRank = e.target.value;
      drawCharGrid();
    });
    bindHostOnce(host, 'chars', () => host.addEventListener('click', (e) => {
      const f = e.target.closest('[data-faction]');
      if (f) {
        App.filters.charFaction = f.dataset.faction;
        $$('#faction-chips .chip', host).forEach((c) => c.classList.toggle('chip--active', c.dataset.faction === App.filters.charFaction));
        drawCharGrid();
        return;
      }
      const r = e.target.closest('[data-race]');
      if (r) {
        App.filters.charRace = r.dataset.race;
        $$('#race-chips .chip', host).forEach((c) => c.classList.toggle('chip--active', c.dataset.race === App.filters.charRace));
        drawCharGrid();
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act) { handleAction(act.dataset.act); return; }
      const card = e.target.closest('[data-char]');
      if (card) openCharacterDetail(card.dataset.char);
    }));
  }

  function drawCharGrid() {
    const w = W();
    const host = $('#char-grid-host');
    if (!host || !w) return;
    const list = filteredCharacters(w);
    host.innerHTML = list.length
      ? '<div class="char-grid">' + list.map((c) => charCard(c, w)).join('') + '</div>'
      : (w.characters.length
        ? '<div class="empty"><div class="empty__sigil">✦</div><p>조건에 맞는 인물이 없어요.</p></div>'
        : emptyBlock('아직 인물이 없어요', '이름과 칭호만 정해도 세계가 시작됩니다.', 'add-char', '첫 인물 만들기'));
  }

  function characterDetailBody(w, c) {
    const others = charsById(w);
    const rels = w.relations.filter((r) => r.a === c.id || r.b === c.id);
    const events = w.events.filter((e) => (e.characters || []).indexOf(c.id) > -1);
    const eps = w.episodes.filter((e) => (e.characters || []).indexOf(c.id) > -1);
    let html = '';
    if (c.image) html += '<div class="detail-hero"><img src="' + esc(c.image) + '" alt=""></div>';
    html += '<div class="mini-chips" style="margin-bottom:12px">' +
      (c.race ? '<span class="mini-chip">' + esc(c.race) + '</span>' : '') +
      (c.faction ? '<span class="mini-chip">' + esc(c.faction) + '</span>' : '') +
      (c.age ? '<span class="mini-chip">' + esc(c.age) + '</span>' : '') +
    '</div>';
    const ranks = rankList(w, c);
    if (ranks.length) {
      html += '<div class="rank-badges">' + ranks.map((r) => rankBadge(r)).join('') + '</div>';
    }
    const defs = [];
    if (c.abilities) defs.push(['능력 / 무기', c.abilities]);
    if (c.age) defs.push(['나이 / 신체', c.age]);
    if (c.race) defs.push(['종족', c.race]);
    if (c.faction) defs.push(['소속', c.faction]);
    if (defs.length) html += '<dl class="def-list">' + defs.map((d) => '<div class="def"><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>').join('') + '</dl>';

    if (c.personality) html += '<div class="label-row"><span>성격</span></div><p class="prose">' + esc(c.personality) + '</p>';
    if (c.notes) html += '<div class="label-row"><span>배경 메모</span></div><p class="prose">' + esc(c.notes) + '</p>';

    if (rels.length) {
      html += '<div class="divider"></div><div class="label-row"><span>관계</span><span>' + rels.length + '</span></div><div class="list">' +
        rels.map((r) => {
          const other = others.get(r.a === c.id ? r.b : r.a);
          const type = Graph.TYPES[r.type] || Graph.TYPES.other;
          return '<button class="rel-line" data-rel="' + esc(r.id) + '">' +
            '<span class="rel-dot" style="background:' + type.color + '"></span>' +
            '<span><b>' + esc(other ? other.name : '알 수 없음') + '</b> · ' + esc(r.label || type.label) + '</span>' +
            '<span class="rel-type">' + esc(type.label) + '</span></button>';
        }).join('') + '</div>';
    }

    if (events.length || eps.length) {
      html += '<div class="divider"></div><div class="label-row"><span>등장</span></div><div class="list">';
      events.forEach((e) => {
        html += '<div class="row-card"><span class="row-card__badge" style="font-size:10px">' + esc(e.era || '') + '</span>' +
          '<span class="row-card__body"><span class="row-card__title">' + esc(e.title) + '</span>' +
          '<span class="row-card__meta">' + esc(String(e.year || 0)) + '년 · 연표</span></span></div>';
      });
      eps.forEach((ep) => {
        html += '<div class="row-card"><span class="row-card__badge" style="font-size:10px">' + esc(ep.no) + '화</span>' +
          '<span class="row-card__body"><span class="row-card__title">' + esc(ep.title) + '</span>' +
          '<span class="row-card__meta">' + esc((STATUS[ep.status] || STATUS.idea).label) + ' · 에피소드</span></span></div>';
      });
      html += '</div>';
    }

    return html;
  }

  function openCharacterDetail(id) {
    const w = W();
    const c = w.characters.find((x) => x.id === id);
    if (!c) return;
    const body = document.createElement('div');
    body.innerHTML = characterDetailBody(w, c);
    const sheet = U.openSheet({
      eyebrow: 'CHARACTER',
      title: c.name,
      sub: c.title || '',
      full: true,
      body: body,
      foot: [
        { label: '수정', className: 'btn', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openCharacterForm(id), 180); } },
        { label: '삭제', className: 'btn--danger', icon: 'i-trash', onClick: async () => {
          const ok = await U.confirmSheet({ title: '인물을 삭제할까요?', message: c.name + ' 님의 기록과 관계가 함께 삭제됩니다.', confirmText: '삭제', danger: true });
          if (!ok) return;
          w.characters = w.characters.filter((x) => x.id !== id);
          w.relations = w.relations.filter((r) => r.a !== id && r.b !== id);
          w.events.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
          w.episodes.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
          touch({ immediate: true });
          sheet.close();
          refreshView();
          U.toast('인물을 삭제했어요');
        } }
      ]
    });
    body.addEventListener('click', (e) => {
      const rel = e.target.closest('[data-rel]');
      if (rel) {
        sheet.close();
        setTimeout(() => openRelationForm(null, null, rel.dataset.rel), 160);
      }
    });
  }

  function buildImageField(initial, opts) {
    const o = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'img-drop' + (initial ? ' has-img' : '');
    let value = initial || null;
    function draw() {
      wrap.classList.toggle('has-img', !!value);
      wrap.innerHTML =
        (value ? '<img src="' + esc(value) + '" alt="">' : '') +
        '<span class="img-drop__inner"><svg><use href="#' + (o.icon || 'i-image') + '"/></svg>' +
        '<span>' + esc(o.label || '사진 선택') + '</span></span>' +
        '<span class="img-drop__actions">' +
          '<button type="button" class="btn" data-img="pick"><svg><use href="#i-image"/></svg>' + (value ? '바꾸기' : '올리기') + '</button>' +
          (value ? '<button type="button" class="btn" data-img="clear">삭제</button>' : '') +
        '</span>';
    }
    draw();
    wrap.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-img]');
      if (!b) return;
      if (b.dataset.img === 'clear') {
        value = null;
        draw();
        return;
      }
      const file = await U.pickFile('image/*');
      if (!file) return;
      try {
        U.toast('사진을 다듬는 중…', { icon: 'i-image', duration: 1200 });
        value = await U.resizeImage(file, o.maxDim || 900, 0.82);
        draw();
      } catch (err) {
        U.toast('이미지를 불러오지 못했어요', { icon: 'i-x' });
      }
    });
    return {
      el: wrap,
      get: () => value,
      set: (v) => { value = v; draw(); }
    };
  }

  /* ---------------------------------------------------------
     AI 일러스트 (인물 세부정보 → 영어 프롬프트 → 초상화)
     --------------------------------------------------------- */
  function bindIllustrationPanel(hostBody, form, imgField) {
    const host = hostBody.querySelector('#char-ai');
    if (!host) return;

    host.innerHTML =
      '<div class="ai-art__row">' +
        '<button type="button" class="btn btn--gold btn--sm" id="ai-gen"><svg><use href="#i-sparkles"/></svg><span>AI 일러스트 생성</span></button>' +
      '</div>' +
      '<div class="ai-art__status" id="ai-status"></div>' +
      '<div class="ai-art__prompt" id="ai-prompt">' +
        '<div class="ai-art__prompt-head"><span>영어 프롬프트</span><span id="ai-prompt-len"></span></div>' +
        '<div class="ai-art__prompt-text" id="ai-prompt-text"></div>' +
        '<div class="ai-art__acts">' +
          '<button type="button" class="btn btn--sm" id="ai-copy"><svg><use href="#i-copy"/></svg><span>프롬프트 복사</span></button>' +
          '<button type="button" class="btn btn--sm btn--ghost" id="ai-fallback"><svg><use href="#i-shield"/></svg><span>실루엣 초상화</span></button>' +
        '</div>' +
      '</div>' +
      '<p class="field-hint">이름·칭호·종족·소속·나이·능력·성격 메모를 조합해 프롬프트를 만들고, 무료 공개 AI 이미지로 초상화를 자동 적용해요. 서버가 막히면 프롬프트를 복사해 다른 곳에 붙여 넣거나 실루엣 초상화로 대신할 수 있어요.</p>';

    const statusEl = host.querySelector('#ai-status');
    const promptEl = host.querySelector('#ai-prompt');
    const promptTextEl = host.querySelector('#ai-prompt-text');
    const promptLenEl = host.querySelector('#ai-prompt-len');
    const genBtn = host.querySelector('#ai-gen');
    let lastPrompt = '';
    let busy = false;

    function readFields() {
      const get = (n) => {
        const el = form.querySelector('[name="' + n + '"]');
        return el && typeof el.value === 'string' ? el.value.trim() : '';
      };
      return {
        name: get('name'), title: get('title'), race: get('race'), faction: get('faction'),
        age: get('age'), abilities: get('abilities'), notes: get('notes')
      };
    }

    function setStatus(text, kind, spinning) {
      statusEl.className = 'ai-art__status is-open' +
        (kind === 'busy' ? ' is-busy' : (kind === 'error' ? ' is-error' : ''));
      statusEl.innerHTML = '<svg class="' + (spinning ? 'ai-art__spin' : '') + '"><use href="#' +
        (spinning ? 'i-refresh' : (kind === 'error' ? 'i-x' : 'i-check')) + '"/></svg><span></span>';
      statusEl.querySelector('span').textContent = text;
    }

    function showPrompt(prompt) {
      lastPrompt = prompt || '';
      promptTextEl.textContent = lastPrompt;
      promptLenEl.textContent = lastPrompt ? lastPrompt.length + '자' : '';
      promptEl.classList.toggle('is-open', !!lastPrompt);
    }

    async function generate() {
      if (busy) return;
      const fields = readFields();
      const prompt = Generator.buildPortraitPrompt(fields);
      showPrompt(prompt);
      if (!fields.name && !fields.title && !fields.race) {
        setStatus('이름·종족 같은 정보를 조금 적으면 초상화가 훨씬 정확해져요. 지금은 기본 묘사로 시도합니다.', 'info');
      }
      busy = true;
      genBtn.disabled = true;
      setStatus('AI 일러스트를 그리는 중… (최대 25초)', 'busy', true);
      let res;
      try {
        res = await Generator.generatePortrait(fields, { timeoutMs: 25000, maxDim: 900 });
      } catch (err) {
        res = { ok: false, reason: (err && err.message) || '알 수 없는 오류' };
      }
      busy = false;
      genBtn.disabled = false;
      if (res.ok) {
        imgField.set(res.dataUrl);
        setStatus('초상화를 대표 이미지로 넣었어요. 마음에 안 들면 다시 눌러 새로 그려 보세요.', 'ok');
        U.toast('AI 초상화를 넣었어요', { icon: 'i-sparkles' });
      } else {
        setStatus('AI 서버에 연결하지 못했어요' + (res.reason ? ' (' + res.reason + ')' : '') +
          '. 아래 프롬프트를 복사해 다른 이미지 생성기에 붙여 넣거나, 실루엣 초상화를 눌러 주세요. 세계관 데이터는 그대로예요.', 'error');
      }
    }

    genBtn.addEventListener('click', generate);

    host.querySelector('#ai-copy').addEventListener('click', async () => {
      const fields = readFields();
      const prompt = lastPrompt || Generator.buildPortraitPrompt(fields);
      showPrompt(prompt);
      const ok = await U.copyText(prompt);
      U.toast(ok ? '프롬프트를 복사했어요' : '복사가 막혔어요. 길게 눌러 복사해 주세요.', { icon: ok ? 'i-copy' : 'i-x' });
      U.haptic(8);
    });

    host.querySelector('#ai-fallback').addEventListener('click', () => {
      const fields = readFields();
      showPrompt(lastPrompt || Generator.buildPortraitPrompt(fields));
      try {
        const dataUrl = Generator.fallbackPortrait(fields);
        if (!dataUrl) throw new Error('생성 실패');
        imgField.set(dataUrl);
        setStatus('문장 실루엣 초상화를 만들었어요. 파일 없이 오프라인에서도 바로 됩니다.', 'ok');
        U.toast('실루엣 초상화를 넣었어요', { icon: 'i-shield' });
      } catch (err) {
        setStatus('실루엣 초상화를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
      }
    });
  }

  function formSheet(opts) {
    const body = document.createElement('div');
    body.innerHTML = '<form class="wb-form" novalidate>' + opts.html + '</form>';
    const form = body.querySelector('form');
    let busy = false;
    const sheet = U.openSheet({
      eyebrow: opts.eyebrow,
      title: opts.title,
      sub: opts.sub,
      full: !!opts.full,
      body: body,
      foot: [
        { label: '취소', className: 'btn--ghost', onClick: () => 'close' },
        { label: opts.submitLabel || '저장', className: 'btn--gold', icon: 'i-check', onClick: () => { submit(); } }
      ],
      onClose: opts.onClose
    });
    async function submit() {
      if (busy) return;
      busy = true;
      try {
        const res = await opts.onSubmit(new FormData(form), body, form);
        if (res !== false) sheet.close();
      } catch (err) {
        U.toast(err && err.message ? err.message : '저장하지 못했어요', { icon: 'i-x' });
      }
      busy = false;
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    if (opts.onReady) opts.onReady({ body, form, sheet, submit });
    return { body, form, sheet, submit };
  }

  function openCharacterForm(id) {
    const w = W();
    const c = id ? w.characters.find((x) => x.id === id) : null;
    const factions = unique(w.characters.map((x) => x.faction));
    const races = unique(w.characters.map((x) => x.race));
    const html =
      U.field('이름', '<div class="input-with-action">' +
        '<input class="input" name="name" required placeholder="예: 아엘릭 반 다이렌" value="' + esc(c ? c.name : '') + '">' +
        '<button type="button" class="mini-action" id="gen-name"><svg><use href="#i-sparkles"/></svg>이름 추천</button>' +
      '</div>', '✨ 버튼으로 판타지 이름을 바로 채울 수 있어요.', true) +
      U.field('칭호 / 별명', U.textInput('title', c ? c.title : '', { placeholder: '예: 서리검의 계승자' })) +
      '<div class="field--slim">' +
        U.field('종족', U.textInput('race', c ? c.race : '', { placeholder: '인간, 엘프…', list: 'dl-races' })) +
        U.field('소속 / 세력', U.textInput('faction', c ? c.faction : '', { placeholder: '서약 기사단…', list: 'dl-factions' })) +
      '</div>' +
      U.field('나이 / 신체', U.textInput('age', c ? c.age : '', { placeholder: '27세 · 182cm' })) +
      U.field('능력 / 무기', U.textArea('abilities', c ? c.abilities : '', '결빙의 검술, 서리검 「글라시엘」…', 3)) +
      U.field('성격 · 배경 메모', U.textArea('notes', c ? c.notes : '', '어떤 사람인지, 무엇을 숨기고 있는지…', 5)) +
      '<div class="field"><span class="field__label">강함 / 등급</span>' +
        '<div id="char-ranks"></div>' +
        '<span class="field-hint">체계를 고르면 단계가 바로 떠요. 여러 체계를 함께 가질 수 있고, 먼저 고른 등급이 대표로 표시돼요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">대표 이미지</span><div id="char-img"></div>' +
      '<span class="field-hint">폰 사진첩에서 고르면 자동으로 줄여서 저장해요.</span></div>' +
      '<div class="ai-art" id="char-ai"></div>' +
      U.datalist('dl-races', races) + U.datalist('dl-factions', factions) +
      (c ? '<button type="button" class="btn btn--danger btn--block mt-14" id="char-delete"><svg><use href="#i-trash"/></svg>인물 삭제</button>' : '');

    let img = null;
    const rankSel = new Map();
    (c && c.ranks ? c.ranks : []).forEach((r) => rankSel.set(r.systemId, Number(r.tier)));

    formSheet({
      eyebrow: c ? 'EDIT CHARACTER' : 'NEW CHARACTER',
      title: c ? '인물 수정' : '새 인물',
      sub: '이름만 정해도 카드가 만들어져요.',
      full: true,
      html: html,
      onReady: ({ body, form, sheet }) => {
        img = buildImageField(c ? c.image : null, { maxDim: 900, label: '초상 사진 올리기' });
        body.querySelector('#char-img').appendChild(img.el);
        bindIllustrationPanel(body, form, img);

        const rkHost = body.querySelector('#char-ranks');
        if (rkHost) {
          const paintRanks = () => drawRankPicker(rkHost, w, rankSel, () => openRankSystems(paintRanks));
          paintRanks();
        }

        body.querySelector('#gen-name').addEventListener('click', () => {
          Generator.open({
            mode: 'character',
            contextLabel: '마음에 드는 이름을 인물 폼에 넣어요',
            onPick: (item) => {
              form.querySelector('[name="name"]').value = item.name;
              if (item.epithet) {
                const titleInput = form.querySelector('[name="title"]');
                if (!titleInput.value.trim()) titleInput.value = item.epithet;
              }
              U.toast('이름을 넣었어요 · ' + item.name, { icon: 'i-sparkles' });
            }
          });
        });

        const del = body.querySelector('#char-delete');
        if (del) {
          del.addEventListener('click', async () => {
            const ok = await U.confirmSheet({ title: '인물을 삭제할까요?', message: c.name + ' 님의 기록과 관계가 함께 삭제됩니다.', confirmText: '삭제', danger: true });
            if (!ok) return;
            w.characters = w.characters.filter((x) => x.id !== id);
            w.relations = w.relations.filter((r) => r.a !== id && r.b !== id);
            w.events.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
            w.episodes.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
            touch({ immediate: true });
            sheet.close();
            refreshView();
            U.toast('인물을 삭제했어요');
          });
        }
      },
      onSubmit: (fd) => {
        const name = String(fd.get('name') || '').trim();
        if (!name) {
          U.toast('이름을 먼저 적어 주세요', { icon: 'i-x' });
          return false;
        }
        const data = {
          name: name,
          title: String(fd.get('title') || '').trim(),
          race: String(fd.get('race') || '').trim(),
          faction: String(fd.get('faction') || '').trim(),
          age: String(fd.get('age') || '').trim(),
          abilities: String(fd.get('abilities') || '').trim(),
          notes: String(fd.get('notes') || '').trim(),
          image: img.get()
        };
        const ranks = [];
        (w.rankSystems || []).forEach((s) => {
          const t = rankSel.get(s.id);
          if (typeof t === 'number' && t >= 0 && t < s.tiers.length) ranks.push({ systemId: s.id, tier: t });
        });
        data.ranks = ranks;
        if (c) {
          Object.assign(c, data);
        } else {
          const pos = Store.randomPos(w.characters.length);
          w.characters.push(Object.assign({ id: U.uid('c'), pos: pos }, data));
        }
        touch({ immediate: true });
        refreshView();
        U.toast(c ? '인물을 수정했어요' : '인물을 추가했어요');
      }
    });
  }

  /* ---------------------------------------------------------
     relationships
     --------------------------------------------------------- */
  function renderRelations() {
    const w = W();
    const host = $('#rel-host');
    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Relationship Graph</span><h2>인물 관계도</h2></div>' +
      '<span class="muted small">' + w.characters.length + '명 · ' + w.relations.length + '관계</span></div>' +
      '<div class="graph-toolbar">' +
        '<button type="button" class="gbtn" data-graph="link"><svg><use href="#i-plus"/></svg>관계 추가</button>' +
        '<button type="button" class="gbtn" data-graph="list"><svg><use href="#i-more"/></svg>관계 목록</button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="fit" aria-label="전체 보기"><svg><use href="#i-target"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="in" aria-label="확대"><svg><use href="#i-zoom-in"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="out" aria-label="축소"><svg><use href="#i-zoom-out"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="legend" aria-label="범례"><svg><use href="#i-book"/></svg></button>' +
      '</div>' +
      (w.characters.length ? '<div class="graph-wrap" id="graph-wrap"></div>' : emptyBlock('인물이 없어 관계를 그릴 수 없어요', '인물을 두 명 이상 만들면 여기서 선으로 이을 수 있어요.', 'add-char', '인물 추가'));

    host.querySelectorAll('[data-graph]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.graph;
        if (act === 'link') {
          const next = Graph.state.mode !== 'link';
          Graph.setLinkMode(next);
          btn.classList.toggle('is-on', next);
        } else if (act === 'fit') Graph.fit();
        else if (act === 'in') Graph.zoom(1.25);
        else if (act === 'out') Graph.zoom(0.8);
        else if (act === 'legend') Graph.toggleLegend();
        else if (act === 'list') openRelationList();
      });
    });
    host.querySelectorAll('[data-act="add-char"]').forEach((b) => b.addEventListener('click', () => openCharacterForm(null)));

    const wrap = host.querySelector('#graph-wrap');
    if (wrap) {
      Graph.mount(wrap, {
        world: W,
        onNode: openCharacterDetail,
        onEdge: (id) => openRelationForm(null, null, id),
        onLinkPair: (a, b) => openRelationForm(a, b, null),
        onNodeMoved: () => touch()
      });
    }
  }

  function openRelationList() {
    const w = W();
    const body = document.createElement('div');
    body.innerHTML = w.relations.length
      ? '<div class="list">' + w.relations.map((r) => {
          const type = Graph.TYPES[r.type] || Graph.TYPES.other;
          const a = charsById(w).get(r.a);
          const b = charsById(w).get(r.b);
          return '<button class="rel-line" data-rel="' + esc(r.id) + '">' +
            '<span class="rel-dot" style="background:' + type.color + '"></span>' +
            '<span><b>' + esc(a ? a.name : '?') + '</b> ↔ <b>' + esc(b ? b.name : '?') + '</b><br>' +
            '<span class="muted">' + esc(r.label || '') + '</span></span>' +
            '<span class="rel-type">' + esc(type.label) + '</span></button>';
        }).join('') + '</div>'
      : '<div class="empty"><div class="empty__sigil">✦</div><p>아직 이어진 관계가 없어요.</p></div>';
    const sheet = U.openSheet({ eyebrow: 'RELATIONS', title: '관계 목록', body: body, full: true });
    body.addEventListener('click', (e) => {
      const rel = e.target.closest('[data-rel]');
      if (!rel) return;
      sheet.close();
      setTimeout(() => openRelationForm(null, null, rel.dataset.rel), 160);
    });
  }

  function openRelationForm(aId, bId, relId) {
    const w = W();
    const rel = relId ? w.relations.find((r) => r.id === relId) : null;
    if (rel) { aId = rel.a; bId = rel.b; }
    const chars = w.characters;
    if (!chars.length) {
      U.toast('인물을 먼저 추가해 주세요', { icon: 'i-users' });
      return;
    }
    aId = aId || chars[0].id;
    bId = bId || (chars[1] ? chars[1].id : chars[0].id);
    const byId = charsById(w);
    const typeItems = Object.keys(Graph.TYPES).map((k) => ({ value: k, label: Graph.TYPES[k].label }));

    const body = document.createElement('div');
    body.innerHTML =
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="center" style="font-family:var(--font-display);font-size:15px">' +
          '<span id="rel-a-name">' + esc(byId.get(aId).name) + '</span>' +
          '<span class="muted" style="padding:0 8px">↔</span>' +
          '<span id="rel-b-name">' + esc(byId.get(bId).name) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="field"><span class="field__label">인물 A</span><div id="rel-a-pick"></div></div>' +
      '<div class="field"><span class="field__label">인물 B</span><div id="rel-b-pick"></div></div>' +
      '<div class="field"><span class="field__label">관계 종류</span><div id="rel-type"></div></div>' +
      U.field('한 줄 설명', U.textInput('label', rel ? rel.label : '', { placeholder: '예: 어린 시절의 서약' })) +
      U.field('메모', U.textArea('note', rel ? rel.note : '', '이 관계의 배경, 감정, 숨은 사정…', 4));

    let typeValue = rel ? rel.type : 'alliance';
    let aValue = aId, bValue = bId;

    const sheet = U.openSheet({
      eyebrow: rel ? 'EDIT RELATION' : 'NEW RELATION',
      title: rel ? '관계 수정' : '관계 잇기',
      sub: '관계마다 색과 선이 달라져요.',
      body: body,
      foot: [
        { label: '취소', className: 'btn--ghost', onClick: () => 'close' },
        { label: rel ? '저장' : '관계 추가', className: 'btn--gold', icon: 'i-check', onClick: () => submit() }
      ]
    });

    function paintNames() {
      body.querySelector('#rel-a-name').textContent = byId.get(aValue) ? byId.get(aValue).name : '?';
      body.querySelector('#rel-b-name').textContent = byId.get(bValue) ? byId.get(bValue).name : '?';
    }

    const aPick = U.chipPicker(chars.map((c) => ({ value: c.id, label: c.name })), aValue, {
      multi: false,
      onChange: (v) => { aValue = v; paintNames(); }
    });
    const bPick = U.chipPicker(chars.map((c) => ({ value: c.id, label: c.name })), bValue, {
      multi: false,
      onChange: (v) => { bValue = v; paintNames(); }
    });
    const typePick = U.chipPicker(typeItems, typeValue, {
      multi: false,
      onChange: (v) => { typeValue = v; }
    });
    body.querySelector('#rel-a-pick').appendChild(aPick);
    body.querySelector('#rel-b-pick').appendChild(bPick);
    body.querySelector('#rel-type').appendChild(typePick);

    if (rel) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn--danger btn--block mt-14';
      del.innerHTML = '<svg><use href="#i-trash"/></svg>관계 삭제';
      del.addEventListener('click', async () => {
        const ok = await U.confirmSheet({ title: '관계를 지울까요?', message: '두 인물의 연결선이 사라집니다.', confirmText: '삭제', danger: true });
        if (!ok) return;
        w.relations = w.relations.filter((r) => r.id !== rel.id);
        touch({ immediate: true });
        sheet.close();
        refreshView();
        U.toast('관계를 삭제했어요');
      });
      body.appendChild(del);
    }

    function submit() {
      if (aValue === bValue) {
        U.toast('서로 다른 두 인물을 골라 주세요', { icon: 'i-x' });
        return;
      }
      const label = body.querySelector('[name="label"]').value.trim();
      const note = body.querySelector('[name="note"]').value.trim();
      const dup = w.relations.find((r) => r.id !== (rel && rel.id) &&
        ((r.a === aValue && r.b === bValue) || (r.a === bValue && r.b === aValue)) && r.type === typeValue);
      if (dup) {
        U.toast('같은 종류의 관계가 이미 있어요', { icon: 'i-x' });
        return;
      }
      if (rel) {
        Object.assign(rel, { a: aValue, b: bValue, type: typeValue, label: label, note: note });
      } else {
        w.relations.push({ id: U.uid('r'), a: aValue, b: bValue, type: typeValue, label: label, note: note });
      }
      touch({ immediate: true });
      sheet.close();
      refreshView();
      U.toast(rel ? '관계를 수정했어요' : '관계를 이었어요');
    }
  }

  /* ---------------------------------------------------------
     timeline
     --------------------------------------------------------- */
  function eventCard(w, e) {
    return '<button class="tl-item" data-event="' + esc(e.id) + '">' +
      '<div class="tl-item__year">' + esc(e.era || '') + ' ' + esc(String(e.year || 0)) + '년</div>' +
      '<div class="tl-item__title">' + esc(e.title) + '</div>' +
      (e.summary ? '<div class="tl-item__sum">' + esc(e.summary) + '</div>' : '') +
    '</button>';
  }

  function renderTimeline() {
    const w = W();
    const host = $('#tl-host');
    const eras = unique(w.events.map((e) => e.era)).sort((a, b) => eraRank(w, a) - eraRank(w, b));
    if (App.filters.tlEra !== '전체' && eras.indexOf(App.filters.tlEra) === -1) App.filters.tlEra = '전체';

    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Timeline</span><h2>연표 <span class="muted" style="font-size:12px">' + w.events.length + '</span></h2></div>' +
      '<button class="section-head__link" data-new-event><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-plus"/></svg> 사건</button></div>' +
      '<div class="chip-row" id="era-chips">' +
        ['전체'].concat(eras).map((e) => '<button class="chip chip--small' + (App.filters.tlEra === e ? ' chip--active' : '') + '" data-era="' + esc(e) + '">' + esc(e) + '</button>').join('') +
      '</div>' +
      '<div id="tl-list"></div>';

    drawTimelineList();

    host.querySelector('[data-new-event]').addEventListener('click', () => openEventForm(null));
    bindHostOnce(host, 'tl', () => host.addEventListener('click', (e) => {
      const era = e.target.closest('[data-era]');
      if (era) {
        App.filters.tlEra = era.dataset.era;
        $$('#era-chips .chip', host).forEach((c) => c.classList.toggle('chip--active', c.dataset.era === App.filters.tlEra));
        drawTimelineList();
        return;
      }
      const item = e.target.closest('[data-event]');
      if (item) openEventDetail(item.dataset.event);
    }));
  }

  function drawTimelineList() {
    const w = W();
    const host = $('#tl-list');
    if (!host) return;
    let events = sortedEvents(w);
    if (App.filters.tlEra !== '전체') events = events.filter((e) => e.era === App.filters.tlEra);
    if (!events.length) {
      host.innerHTML = w.events.length
        ? '<div class="empty"><div class="empty__sigil">✦</div><p>이 시대에는 아직 사건이 없어요.</p></div>'
        : emptyBlock('연표가 비어 있어요', '세계의 첫 사건을 기록해 보세요.', 'add-event', '사건 추가');
      host.querySelectorAll('[data-act="add-event"]').forEach((b) => b.addEventListener('click', () => openEventForm(null)));
      return;
    }
    let html = '<div class="tl">';
    let lastEra = null;
    events.forEach((e) => {
      if (e.era !== lastEra) {
        html += '<div class="tl-era">' + esc(e.era || '연대 미상') + '</div>';
        lastEra = e.era;
      }
      html += eventCard(w, e);
    });
    html += '</div>';
    host.innerHTML = html;
  }

  function openEventDetail(id) {
    const w = W();
    const e = w.events.find((x) => x.id === id);
    if (!e) return;
    const byChar = charsById(w);
    const byRegion = regionsById(w);
    const body = document.createElement('div');
    body.innerHTML =
      '<div class="mini-chips" style="margin-bottom:12px"><span class="mini-chip">' + esc(e.era || '') + ' ' + esc(String(e.year || 0)) + '년</span></div>' +
      (e.summary ? '<p class="prose" style="color:var(--gold-soft)">' + esc(e.summary) + '</p>' : '') +
      (e.detail ? '<div class="divider"></div><p class="prose">' + esc(e.detail) + '</p>' : '') +
      ((e.characters || []).length ? '<div class="label-row"><span>관련 인물</span></div><div class="mini-chips">' +
        e.characters.map((cid) => byChar.get(cid) ? '<button class="mini-chip" data-open-char="' + esc(cid) + '">' + esc(byChar.get(cid).name) + '</button>' : '').join('') + '</div>' : '') +
      ((e.locations || []).length ? '<div class="label-row"><span>관련 지역</span></div><div class="mini-chips">' +
        e.locations.map((lid) => byRegion.get(lid) ? '<span class="mini-chip">' + esc(byRegion.get(lid).name) + '</span>' : '').join('') + '</div>' : '');
    const sheet = U.openSheet({
      eyebrow: 'EVENT',
      title: e.title,
      full: true,
      body: body,
      foot: [
        { label: '수정', className: 'btn', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openEventForm(id), 160); } },
        { label: '삭제', className: 'btn--danger', icon: 'i-trash', onClick: async () => {
          const ok = await U.confirmSheet({ title: '사건을 삭제할까요?', message: e.title, confirmText: '삭제', danger: true });
          if (!ok) return;
          w.events = w.events.filter((x) => x.id !== id);
          touch({ immediate: true });
          sheet.close();
          refreshView();
          U.toast('사건을 삭제했어요');
        } }
      ]
    });
    body.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-open-char]');
      if (b) { sheet.close(); setTimeout(() => openCharacterDetail(b.dataset.openChar), 150); }
    });
  }

  function openEventForm(id) {
    const w = W();
    const e = id ? w.events.find((x) => x.id === id) : null;
    const eras = unique((w.eraOrder || []).concat(w.events.map((x) => x.era)));
    const body = document.createElement('div');
    body.innerHTML =
      '<div class="field--slim">' +
        U.field('시대', U.textInput('era', e ? e.era : (eras[eras.length - 1] || '제1기'), { placeholder: '제3기', list: 'dl-eras' })) +
        U.field('연도', U.textInput('year', e ? String(e.year) : '0', { type: 'number', inputmode: 'numeric' })) +
      '</div>' +
      U.field('사건 제목', U.textInput('title', e ? e.title : '', { placeholder: '예: 첫 번째 인장의 해제' }), null, true) +
      U.field('한 줄 요약', U.textInput('summary', e ? e.summary : '', { placeholder: '한 문장으로' })) +
      U.field('상세 내용', U.textArea('detail', e ? e.detail : '', '무슨 일이 있었고, 누가 있었고, 무엇이 바뀌었나…', 5)) +
      '<div class="field"><span class="field__label">관련 인물</span><div id="ev-chars"></div></div>' +
      '<div class="field"><span class="field__label">관련 지역</span><div id="ev-regions"></div></div>' +
      U.datalist('dl-eras', eras);

    let pickedChars = (e ? e.characters : []).slice();
    let pickedRegions = (e ? e.locations : []).slice();

    formSheet({
      eyebrow: e ? 'EDIT EVENT' : 'NEW EVENT',
      title: e ? '사건 수정' : '새 사건',
      sub: '시대와 연도로 자동 정렬됩니다.',
      full: true,
      html: body.innerHTML,
      onReady: ({ body: b }) => {
        if (w.characters.length) {
          b.querySelector('#ev-chars').appendChild(U.chipPicker(
            w.characters.map((c) => ({ value: c.id, label: c.name })), pickedChars,
            { multi: true, onChange: (v) => { pickedChars = v; } }
          ));
        } else {
          b.querySelector('#ev-chars').innerHTML = '<span class="field-hint">등록된 인물이 없어요.</span>';
        }
        if (w.map.markers.length) {
          b.querySelector('#ev-regions').appendChild(U.chipPicker(
            w.map.markers.map((m) => ({ value: m.id, label: m.name })), pickedRegions,
            { multi: true, onChange: (v) => { pickedRegions = v; } }
          ));
        } else {
          b.querySelector('#ev-regions').innerHTML = '<span class="field-hint">등록된 지역이 없어요.</span>';
        }
        if (e) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>사건 삭제';
          del.addEventListener('click', async () => {
            const ok = await U.confirmSheet({ title: '사건을 삭제할까요?', message: e.title, confirmText: '삭제', danger: true });
            if (!ok) return;
            w.events = w.events.filter((x) => x.id !== id);
            touch({ immediate: true });
            b.closest('.sheet').querySelector('.sheet__close').click();
            refreshView();
            U.toast('사건을 삭제했어요');
          });
          b.querySelector('form').appendChild(del);
        }
      },
      onSubmit: (fd) => {
        const title = String(fd.get('title') || '').trim();
        if (!title) { U.toast('사건 제목을 적어 주세요', { icon: 'i-x' }); return false; }
        const era = String(fd.get('era') || '').trim() || '연대 미상';
        const year = Number(fd.get('year')) || 0;
        const data = {
          era: era, year: year, title: title,
          summary: String(fd.get('summary') || '').trim(),
          detail: String(fd.get('detail') || '').trim(),
          characters: pickedChars, locations: pickedRegions
        };
        if (!(w.eraOrder || []).includes(era)) {
          w.eraOrder = (w.eraOrder || []).concat([era]);
        }
        if (e) Object.assign(e, data);
        else w.events.push(Object.assign({ id: U.uid('e') }, data));
        touch({ immediate: true });
        refreshView();
        U.toast(e ? '사건을 수정했어요' : '사건을 기록했어요');
      }
    });
  }

  /* ---------------------------------------------------------
     map
     --------------------------------------------------------- */
  function renderMap() {
    const host = $('#map-host');
    MapView.mount(host, {
      world: W,
      onUpload: uploadMapImage,
      onTerrainChange: () => touch(),
      onUseSample: () => {
        const w = W();
        w.map.kind = 'sample';
        w.map.image = null;
        w.map.ratio = 3 / 4; // 기본 지도 도안은 900×1200
        touch({ immediate: true });
        MapView.refresh();
        U.toast('기본 판타지 지도를 불러왔어요');
      },
      onCreatePin: (x, y) => openPinForm(x, y, null),
      onPin: (id) => openRegionDetail(id)
    });
  }

  async function uploadMapImage() {
    const file = await U.pickFile('image/*');
    if (!file) return;
    try {
      U.toast('지도를 준비하는 중…', { icon: 'i-image', duration: 1400 });
      const data = await U.resizeImage(file, 1600, 0.84);
      let ratio = null;
      try {
        const im = await U.loadImage(data);
        if (im.naturalWidth && im.naturalHeight) {
          ratio = Math.round(Math.min(4, Math.max(0.3, im.naturalWidth / im.naturalHeight)) * 1000) / 1000;
        }
      } catch (e) { /* 비율을 몰라도 지도는 저장한다 */ }
      const w = W();
      w.map.image = data;
      w.map.kind = 'custom';
      if (ratio) w.map.ratio = ratio;
      touch({ immediate: true });
      MapView.refresh();
      U.toast(ratio
        ? '지도 이미지를 올렸어요 · 원본 비율 ' + (ratio < 1 ? '세로형' : '가로형') + ' 그대로 보여요'
        : '지도 이미지를 올렸어요', { icon: 'i-image', duration: 2400 });
    } catch (e) {
      U.toast('이미지를 올리지 못했어요', { icon: 'i-x' });
    }
  }

  function regionDetailBody(w, m) {
    const kind = MapView.KINDS[m.kind] || MapView.KINDS.city;
    const defs = [];
    if (m.climate) defs.push(['기후', m.climate]);
    if (m.faction) defs.push(['지배 세력', m.faction]);
    if (m.resources) defs.push(['특산물', m.resources]);
    if (m.danger) defs.push(['위험 요소', m.danger]);
    const events = w.events.filter((e) => (e.locations || []).indexOf(m.id) > -1);
    const eps = w.episodes.filter((e) => (e.locations || []).indexOf(m.id) > -1);
    let html = '<div class="mini-chips" style="margin-bottom:12px"><span class="mini-chip">' + esc(kind.label) + '</span></div>';
    if (defs.length) html += '<dl class="def-list">' + defs.map((d) => '<div class="def"><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>').join('') + '</dl>';
    if (m.notes) html += '<div class="divider"></div><p class="prose">' + esc(m.notes) + '</p>';
    if (events.length || eps.length) {
      html += '<div class="divider"></div><div class="label-row"><span>이곳에서</span></div><div class="list">';
      events.forEach((e) => { html += '<div class="row-card"><span class="row-card__badge" style="font-size:10px">' + esc(e.era || '') + '</span><span class="row-card__body"><span class="row-card__title">' + esc(e.title) + '</span><span class="row-card__meta">' + esc(String(e.year || 0)) + '년</span></span></div>'; });
      eps.forEach((ep) => { html += '<div class="row-card"><span class="row-card__badge" style="font-size:10px">' + esc(ep.no) + '화</span><span class="row-card__body"><span class="row-card__title">' + esc(ep.title) + '</span><span class="row-card__meta">에피소드</span></span></div>'; });
      html += '</div>';
    }
    return html;
  }

  function openRegionDetail(id) {
    const w = W();
    const m = w.map.markers.find((x) => x.id === id);
    if (!m) return;
    const body = document.createElement('div');
    body.innerHTML = regionDetailBody(w, m);
    const sheet = U.openSheet({
      eyebrow: 'REGION',
      title: m.name,
      full: true,
      body: body,
      foot: [
        { label: '수정', className: 'btn', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openPinForm(m.x, m.y, id), 160); } },
        { label: '삭제', className: 'btn--danger', icon: 'i-trash', onClick: async () => {
          const ok = await U.confirmSheet({ title: '지역을 삭제할까요?', message: m.name + ' 핀이 지도에서 사라집니다.', confirmText: '삭제', danger: true });
          if (!ok) return;
          w.map.markers = w.map.markers.filter((x) => x.id !== id);
          w.events.forEach((e) => { e.locations = (e.locations || []).filter((x) => x !== id); });
          w.episodes.forEach((e) => { e.locations = (e.locations || []).filter((x) => x !== id); });
          touch({ immediate: true });
          sheet.close();
          MapView.refresh();
          U.toast('지역을 삭제했어요');
        } }
      ]
    });
  }

  function openPinForm(x, y, id) {
    const w = W();
    if (MapView.state.host) {
      MapView.state.pinning = false;
      MapView.refresh();
    }
    const m = id ? w.map.markers.find((z) => z.id === id) : null;
    const kindItems = Object.keys(MapView.KINDS).map((k) => ({ value: k, label: MapView.KINDS[k].label }));
    let kind = m ? m.kind : 'city';
    let px = m ? m.x : (typeof x === 'number' ? x : 50);
    let py = m ? m.y : (typeof y === 'number' ? y : 50);

    const html =
      '<div class="field"><span class="field__label">지역명 <b>*</b></span>' +
        '<div class="input-with-action">' +
          '<input class="input" name="name" placeholder="예: 발드렌 항구" value="' + esc(m ? m.name : '') + '">' +
          '<button type="button" class="mini-action" id="gen-place"><svg><use href="#i-sparkles"/></svg>지명 추천</button>' +
        '</div>' +
        '<span class="field-hint">✨ 버튼으로 판타지 지명을 바로 채울 수 있어요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">유형</span><div id="pin-kind"></div></div>' +
      U.field('기후', U.textInput('climate', m ? m.climate : '', { placeholder: '안개와 소금바람' })) +
      U.field('지배 세력', U.textInput('faction', m ? m.faction : '', { placeholder: '서약 기사단 · 무소속 상단' })) +
      U.field('주요 특산물', U.textInput('resources', m ? m.resources : '', { placeholder: '소금, 밀수품, 먼 바다의 소문' })) +
      U.field('위험 요소', U.textInput('danger', m ? m.danger : '', { placeholder: '모래 아래의 옛 성벽…' })) +
      U.field('메모', U.textArea('notes', m ? m.notes : '', '이곳의 분위기, 사건, 숨은 것들…', 4)) +
      '<p class="field-hint">지도 위치 ' + px.toFixed(1) + '%, ' + py.toFixed(1) + '%</p>';

    formSheet({
      eyebrow: m ? 'EDIT REGION' : 'NEW REGION',
      title: m ? '지역 수정' : '지역 핀 등록',
      sub: '지도 위를 탭해 찍은 위치에 핀이 꽂힙니다.',
      full: true,
      html: html,
      onReady: ({ body, form }) => {
        const picker = U.chipPicker(kindItems, kind, { multi: false, onChange: (v) => { kind = v; } });
        body.querySelector('#pin-kind').appendChild(picker);
        body.querySelector('#gen-place').addEventListener('click', () => {
          Generator.open({
            mode: 'place',
            contextLabel: '마음에 드는 지명을 지역 폼에 넣어요',
            onPick: (item) => {
              form.querySelector('[name="name"]').value = item.name;
              U.toast('지명을 넣었어요 · ' + item.name, { icon: 'i-sparkles' });
            }
          });
        });
      },
      onSubmit: (fd) => {
        const name = String(fd.get('name') || '').trim();
        if (!name) { U.toast('지역명을 적어 주세요', { icon: 'i-x' }); return false; }
        const data = {
          name: name, kind: kind, x: px, y: py,
          climate: String(fd.get('climate') || '').trim(),
          faction: String(fd.get('faction') || '').trim(),
          resources: String(fd.get('resources') || '').trim(),
          danger: String(fd.get('danger') || '').trim(),
          notes: String(fd.get('notes') || '').trim()
        };
        if (m) Object.assign(m, data);
        else w.map.markers.push(Object.assign({ id: U.uid('m') }, data));
        if (!w.map.kind) { w.map.kind = 'sample'; }
        touch({ immediate: true });
        MapView.refresh();
        U.toast(m ? '지역을 수정했어요' : '지역 핀을 꽂았어요');
      }
    });
  }

  /* ---------------------------------------------------------
     lore
     --------------------------------------------------------- */
  function renderLore() {
    const w = W();
    const host = $('#lore-host');
    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Codex</span><h2>설정집 <span class="muted" style="font-size:12px">' + w.lore.length + '</span></h2></div>' +
      '<button class="section-head__link" data-new-lore><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-plus"/></svg> 추가</button></div>' +
      '<div class="toolbar"><label class="search"><svg><use href="#i-search"/></svg>' +
        '<input type="search" id="lore-search" placeholder="제목 · 태그 · 본문 검색" value="' + esc(App.filters.loreQuery) + '"></label></div>' +
      '<div class="chip-row" id="lore-cats">' +
        ['전체'].concat(Object.keys(CATS)).map((k) => '<button class="chip chip--small' + (App.filters.loreCat === k ? ' chip--active' : '') + '" data-cat="' + esc(k) + '">' + esc(k === '전체' ? '전체' : CATS[k]) + '</button>').join('') +
      '</div>' +
      '<div class="list" id="lore-list"></div>';

    drawLoreList();

    host.querySelector('[data-new-lore]').addEventListener('click', () => openLoreForm(null));
    host.querySelector('#lore-search').addEventListener('input', (e) => {
      App.filters.loreQuery = e.target.value;
      drawLoreList();
    });
    bindHostOnce(host, 'lore', () => host.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        App.filters.loreCat = cat.dataset.cat;
        $$('#lore-cats .chip', host).forEach((c) => c.classList.toggle('chip--active', c.dataset.cat === App.filters.loreCat));
        drawLoreList();
        return;
      }
      const head = e.target.closest('[data-lore-head]');
      if (head) {
        const id = head.dataset.loreHead;
        App.openLore[id] = !App.openLore[id];
        drawLoreList();
        return;
      }
      const edit = e.target.closest('[data-lore-edit]');
      if (edit) openLoreForm(edit.dataset.loreEdit);
    }));
  }

  function drawLoreList() {
    const w = W();
    const host = $('#lore-list');
    if (!host) return;
    const q = App.filters.loreQuery.trim().toLowerCase();
    const list = w.lore.filter((l) => {
      if (App.filters.loreCat !== '전체' && l.category !== App.filters.loreCat) return false;
      if (!q) return true;
      return [l.title, l.body, (l.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) > -1;
    });
    if (!list.length) {
      host.innerHTML = w.lore.length
        ? '<div class="empty"><div class="empty__sigil">✦</div><p>조건에 맞는 설정이 없어요.</p></div>'
        : emptyBlock('설정집이 비어 있어요', '마법 체계, 세력, 유물… 세계의 규칙을 적어 두세요.', 'add-lore', '첫 설정 쓰기');
      host.querySelectorAll('[data-act="add-lore"]').forEach((b) => b.addEventListener('click', () => openLoreForm(null)));
      return;
    }
    host.innerHTML = list.map((l) => {
      const open = !!App.openLore[l.id];
      return '<article class="lore-card' + (open ? ' is-open' : '') + '" data-lore="' + esc(l.id) + '">' +
        '<button type="button" class="lore-card__head" data-lore-head="' + esc(l.id) + '">' +
          '<span style="flex:1;min-width:0">' +
            '<span class="lore-card__cat">' + esc(CATS[l.category] || '기타') + '</span>' +
            '<span class="lore-card__title" style="display:block">' + esc(l.title) + '</span>' +
          '</span>' +
          '<span class="lore-card__toggle"><svg><use href="#i-chev-down"/></svg></span>' +
        '</button>' +
        (open
          ? '<div class="lore-card__body">' + esc(l.body) +
            ((l.tags || []).length ? '<div class="tag-row">' + l.tags.map((t) => '<span class="mini-chip">#' + esc(t) + '</span>').join('') + '</div>' : '') +
            '<div class="btn-row mt-14"><button class="btn btn--sm" data-lore-edit="' + esc(l.id) + '"><svg><use href="#i-edit"/></svg>수정</button></div>' +
            '</div>'
          : '') +
      '</article>';
    }).join('');
  }

  function openLoreForm(id) {
    const w = W();
    const l = id ? w.lore.find((x) => x.id === id) : null;
    let category = l ? l.category : 'magic';
    const cats = Object.keys(CATS).map((k) => ({ value: k, label: CATS[k] }));
    const html =
      '<div class="field"><span class="field__label">분류</span><div id="lore-cat-pick"></div></div>' +
      U.field('제목', U.textInput('title', l ? l.title : '', { placeholder: '예: 봉인술' }), null, true) +
      U.field('내용', U.textArea('body', l ? l.body : '', '규칙, 원리, 대가, 예외…', 7)) +
      U.field('태그', U.textInput('tags', l ? (l.tags || []).join(', ') : '', { placeholder: '봉인, 이름, 성소 (쉼표로 구분)' }));

    formSheet({
      eyebrow: l ? 'EDIT CODEX' : 'NEW CODEX',
      title: l ? '설정 수정' : '새 설정',
      full: true,
      html: html,
      onReady: ({ body, form }) => {
        body.querySelector('#lore-cat-pick').appendChild(U.chipPicker(cats, category, { multi: false, onChange: (v) => { category = v; } }));
        if (l) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>설정 삭제';
          del.addEventListener('click', async () => {
            const ok = await U.confirmSheet({ title: '설정을 삭제할까요?', message: l.title, confirmText: '삭제', danger: true });
            if (!ok) return;
            w.lore = w.lore.filter((x) => x.id !== id);
            touch({ immediate: true });
            const sheet = form.closest('.sheet');
            if (sheet) sheet.querySelector('.sheet__close').click();
            refreshView();
            U.toast('설정을 삭제했어요');
          });
          form.appendChild(del);
        }
      },
      onSubmit: (fd) => {
        const title = String(fd.get('title') || '').trim();
        if (!title) { U.toast('제목을 적어 주세요', { icon: 'i-x' }); return false; }
        const tags = String(fd.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean);
        const data = { category: category, title: title, body: String(fd.get('body') || '').trim(), tags: tags };
        if (l) Object.assign(l, data);
        else w.lore.push(Object.assign({ id: U.uid('l') }, data));
        touch({ immediate: true });
        refreshView();
        U.toast(l ? '설정을 수정했어요' : '설정을 추가했어요');
      }
    });
  }

  /* ---------------------------------------------------------
     episodes
     --------------------------------------------------------- */
  function episodeCard(ep) {
    const st = STATUS[ep.status] || STATUS.idea;
    return '<button class="ep-card" data-ep="' + esc(ep.id) + '">' +
      '<div class="ep-card__top">' +
        '<span class="ep-card__no">' + esc(ep.no) + '화</span>' +
        '<span class="ep-card__title">' + esc(ep.title) + '</span>' +
        '<span class="status ' + st.cls + '">' + st.label + '</span>' +
      '</div>' +
      (ep.synopsis ? '<div class="ep-card__syn">' + esc(ep.synopsis) + '</div>' : '') +
      '<div class="row-card__meta" style="margin-top:6px">' +
        ((ep.scenes || []).length ? '씬 ' + ep.scenes.length + ' · ' : '') +
        ((ep.locations || []).length ? '지역 ' + ep.locations.length + ' · ' : '') +
        ((ep.characters || []).length ? '인물 ' + ep.characters.length : '') +
      '</div>' +
    '</button>';
  }

  function renderEpisodes() {
    const w = W();
    const host = $('#ep-host');
    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Storyboard</span><h2>에피소드 <span class="muted" style="font-size:12px">' + w.episodes.length + '</span></h2></div>' +
      '<button class="section-head__link" data-new-ep><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-plus"/></svg> 추가</button></div>' +
      '<div class="chip-row" id="ep-status-chips">' +
        ['전체'].concat(Object.keys(STATUS)).map((k) => '<button class="chip chip--small' + (App.filters.epStatus === k ? ' chip--active' : '') + '" data-status="' + esc(k) + '">' + esc(k === '전체' ? '전체' : STATUS[k].label) + '</button>').join('') +
      '</div>' +
      '<div class="list" id="ep-list"></div>';
    drawEpisodeList();

    host.querySelector('[data-new-ep]').addEventListener('click', () => openEpisodeForm(null));
    bindHostOnce(host, 'ep', () => host.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-status]');
      if (chip) {
        App.filters.epStatus = chip.dataset.status;
        $$('#ep-status-chips .chip', host).forEach((c) => c.classList.toggle('chip--active', c.dataset.status === App.filters.epStatus));
        drawEpisodeList();
        return;
      }
      const card = e.target.closest('[data-ep]');
      if (card) openEpisodeDetail(card.dataset.ep);
    }));
  }

  function drawEpisodeList() {
    const w = W();
    const host = $('#ep-list');
    if (!host) return;
    let list = sortedEpisodes(w);
    if (App.filters.epStatus !== '전체') list = list.filter((ep) => ep.status === App.filters.epStatus);
    if (!list.length) {
      host.innerHTML = w.episodes.length
        ? '<div class="empty"><div class="empty__sigil">✦</div><p>이 상태의 에피소드가 없어요.</p></div>'
        : emptyBlock('아직 에피소드가 없어요', '1화부터 차곡차곡 쌓아 보세요.', 'add-ep', '1화 만들기');
      host.querySelectorAll('[data-act="add-ep"]').forEach((b) => b.addEventListener('click', () => openEpisodeForm(null)));
      return;
    }
    host.innerHTML = list.map(episodeCard).join('');
  }

  function openEpisodeDetail(id) {
    const w = W();
    const ep = w.episodes.find((x) => x.id === id);
    if (!ep) return;
    const st = STATUS[ep.status] || STATUS.idea;
    const byChar = charsById(w);
    const byRegion = regionsById(w);
    const body = document.createElement('div');
    body.innerHTML =
      '<div class="mini-chips" style="margin-bottom:12px"><span class="status ' + st.cls + '">' + st.label + '</span></div>' +
      (ep.synopsis ? '<p class="prose" style="color:var(--gold-soft)">' + esc(ep.synopsis) + '</p>' : '') +
      ((ep.characters || []).length ? '<div class="label-row"><span>등장인물</span></div><div class="mini-chips">' +
        ep.characters.map((cid) => byChar.get(cid) ? '<button class="mini-chip" data-open-char="' + esc(cid) + '">' + esc(byChar.get(cid).name) + '</button>' : '').join('') + '</div>' : '') +
      ((ep.locations || []).length ? '<div class="label-row"><span>배경 지역</span></div><div class="mini-chips">' +
        ep.locations.map((lid) => byRegion.get(lid) ? '<span class="mini-chip">' + esc(byRegion.get(lid).name) + '</span>' : '').join('') + '</div>' : '') +
      '<div class="divider"></div><div class="label-row"><span>씬 메모</span><span>' + (ep.scenes || []).length + '</span></div>' +
      ((ep.scenes || []).length
        ? '<div>' + ep.scenes.map((s, i) => '<div class="scene-item"><span class="scene-item__no">' + (i + 1) + '</span>' +
            '<div class="scene-item__text"><b style="color:var(--text)">' + esc(s.title || '씬 ' + (i + 1)) + '</b>' +
            (s.note ? '<br>' + esc(s.note) : '') + '</div></div>').join('') + '</div>'
        : '<p class="muted small">아직 씬 메모가 없어요.</p>');
    const sheet = U.openSheet({
      eyebrow: 'EPISODE',
      title: ep.no + '화 · ' + ep.title,
      full: true,
      body: body,
      foot: [
        { label: '수정', className: 'btn', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openEpisodeForm(id), 160); } },
        { label: '삭제', className: 'btn--danger', icon: 'i-trash', onClick: async () => {
          const ok = await U.confirmSheet({ title: '에피소드를 삭제할까요?', message: ep.no + '화 ' + ep.title, confirmText: '삭제', danger: true });
          if (!ok) return;
          w.episodes = w.episodes.filter((x) => x.id !== id);
          touch({ immediate: true });
          sheet.close();
          refreshView();
          U.toast('에피소드를 삭제했어요');
        } }
      ]
    });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open-char]');
      if (b) { sheet.close(); setTimeout(() => openCharacterDetail(b.dataset.openChar), 150); }
    });
  }

  function openEpisodeForm(id) {
    const w = W();
    const ep = id ? w.episodes.find((x) => x.id === id) : null;
    const nextNo = (w.episodes.reduce((m, x) => Math.max(m, x.no || 0), 0) || 0) + 1;
    let status = ep ? ep.status : 'idea';
    let pickedChars = (ep ? ep.characters : []).slice();
    let pickedRegions = (ep ? ep.locations : []).slice();
    let scenes = ep ? ep.scenes.map((s) => ({ id: s.id, title: s.title, note: s.note })) : [];

    const html =
      '<div class="field--slim">' +
        U.field('화수', U.textInput('no', String(ep ? ep.no : nextNo), { type: 'number', inputmode: 'numeric' })) +
        U.field('제목', U.textInput('title', ep ? ep.title : '', { placeholder: '예: 재의 아침' }), null, true) +
      '</div>' +
      '<div class="field"><span class="field__label">상태</span><div id="ep-status-pick"></div></div>' +
      U.field('시놉시스', U.textArea('synopsis', ep ? ep.synopsis : '', '이 화에서 무슨 일이 일어나나요?', 4)) +
      '<div class="field"><span class="field__label">등장인물</span><div id="ep-chars"></div></div>' +
      '<div class="field"><span class="field__label">배경 지역</span><div id="ep-regions"></div></div>' +
      '<div class="label-row"><span>씬 메모</span><span id="scene-count">' + scenes.length + '</span></div>' +
      '<div id="scene-list"></div>' +
      '<button type="button" class="btn btn--sm btn--block mt-8" id="scene-add"><svg><use href="#i-plus"/></svg>씬 추가</button>';

    formSheet({
      eyebrow: ep ? 'EDIT EPISODE' : 'NEW EPISODE',
      title: ep ? '에피소드 수정' : '새 에피소드',
      sub: '씬 메모와 지역을 연결하면 스토리 여정이 만들어져요.',
      full: true,
      html: html,
      onReady: ({ body, form }) => {
        body.querySelector('#ep-status-pick').appendChild(U.chipPicker(
          Object.keys(STATUS).map((k) => ({ value: k, label: STATUS[k].label })), status,
          { multi: false, onChange: (v) => { status = v; } }
        ));
        if (w.characters.length) {
          body.querySelector('#ep-chars').appendChild(U.chipPicker(
            w.characters.map((c) => ({ value: c.id, label: c.name })), pickedChars,
            { multi: true, onChange: (v) => { pickedChars = v; } }
          ));
        } else body.querySelector('#ep-chars').innerHTML = '<span class="field-hint">등록된 인물이 없어요.</span>';
        if (w.map.markers.length) {
          body.querySelector('#ep-regions').appendChild(U.chipPicker(
            w.map.markers.map((m) => ({ value: m.id, label: m.name })), pickedRegions,
            { multi: true, onChange: (v) => { pickedRegions = v; } }
          ));
        } else body.querySelector('#ep-regions').innerHTML = '<span class="field-hint">등록된 지역이 없어요.</span>';

        const sceneList = body.querySelector('#scene-list');
        function syncScenes() {
          body.querySelectorAll('[data-scene]').forEach((row) => {
            const i = Number(row.dataset.scene);
            if (!scenes[i]) return;
            const t = row.querySelector('[data-f="title"]');
            const n = row.querySelector('[data-f="note"]');
            if (t) scenes[i].title = t.value;
            if (n) scenes[i].note = n.value;
          });
        }
        function drawScenes() {
          body.querySelector('#scene-count').textContent = scenes.length;
          sceneList.innerHTML = scenes.map((s, i) =>
            '<div class="scene-item" data-scene="' + i + '">' +
              '<span class="scene-item__no">' + (i + 1) + '</span>' +
              '<div style="flex:1;min-width:0">' +
                '<input class="input" data-f="title" placeholder="씬 제목" value="' + esc(s.title || '') + '" style="min-height:38px;padding:7px 10px;font-size:14px;margin-bottom:5px">' +
                '<textarea class="textarea" data-f="note" rows="2" placeholder="무슨 일이 일어나는지" style="min-height:56px;padding:7px 10px;font-size:13px">' + esc(s.note || '') + '</textarea>' +
              '</div>' +
              '<button type="button" class="scene-item__del" data-scene-del="' + i + '" aria-label="씬 삭제"><svg><use href="#i-x"/></svg></button>' +
            '</div>'
          ).join('') || '<p class="muted small">아직 씬이 없어요. 아래 버튼으로 추가하세요.</p>';
        }
        drawScenes();
        body.querySelector('#scene-add').addEventListener('click', () => {
          syncScenes();
          scenes.push({ id: U.uid('s'), title: '', note: '' });
          drawScenes();
        });
        sceneList.addEventListener('click', (e) => {
          const del = e.target.closest('[data-scene-del]');
          if (!del) return;
          syncScenes();
          scenes.splice(Number(del.dataset.sceneDel), 1);
          drawScenes();
        });
        if (ep) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>에피소드 삭제';
          del.addEventListener('click', async () => {
            const ok = await U.confirmSheet({ title: '에피소드를 삭제할까요?', message: ep.no + '화 ' + ep.title, confirmText: '삭제', danger: true });
            if (!ok) return;
            w.episodes = w.episodes.filter((x) => x.id !== id);
            touch({ immediate: true });
            form.closest('.sheet').querySelector('.sheet__close').click();
            refreshView();
            U.toast('에피소드를 삭제했어요');
          });
          form.appendChild(del);
        }
      },
      onSubmit: (fd, body) => {
        const titleVal = String(fd.get('title') || '').trim();
        if (!titleVal) { U.toast('제목을 적어 주세요', { icon: 'i-x' }); return false; }
        // capture scene edits from the DOM before saving
        body.querySelectorAll('[data-scene]').forEach((row) => {
          const i = Number(row.dataset.scene);
          if (!scenes[i]) return;
          const t = row.querySelector('[data-f="title"]');
          const n = row.querySelector('[data-f="note"]');
          if (t) scenes[i].title = t.value.trim();
          if (n) scenes[i].note = n.value.trim();
        });
        const data = {
          no: Number(fd.get('no')) || nextNo,
          title: titleVal,
          status: status,
          synopsis: String(fd.get('synopsis') || '').trim(),
          characters: pickedChars,
          locations: pickedRegions,
          scenes: scenes.filter((s) => s.title || s.note)
        };
        if (ep) Object.assign(ep, data);
        else w.episodes.push(Object.assign({ id: U.uid('p') }, data));
        touch({ immediate: true });
        refreshView();
        U.toast(ep ? '에피소드를 수정했어요' : '에피소드를 추가했어요');
      }
    });
  }

  /* ---------------------------------------------------------
     worlds
     --------------------------------------------------------- */
  function openWorldSwitcher() {
    const body = document.createElement('div');
    function draw() {
      body.innerHTML =
        '<div class="list">' + App.state.worlds.map((x) => {
          const active = x.id === App.state.activeId;
          return '<button class="row-card" data-world="' + esc(x.id) + '" style="' + (active ? 'border-color:var(--line-strong)' : '') + '">' +
            '<span class="row-card__badge">' + (active ? '✦' : '') + '</span>' +
            '<span class="row-card__body"><span class="row-card__title">' + esc(x.name) + '</span>' +
            '<span class="row-card__meta">' + esc(x.era || '') + ' · 인물 ' + x.characters.length + ' · 사건 ' + x.events.length + '</span></span>' +
            (active ? '<span class="status status--done">사용 중</span>' : '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span>') +
          '</button>';
        }).join('') + '</div>' +
        '<div class="btn-row mt-14">' +
          '<button class="btn" data-worlds-act="new"><svg><use href="#i-plus"/></svg>새 세계관</button>' +
          '<button class="btn" data-worlds-act="edit"><svg><use href="#i-edit"/></svg>현재 편집</button>' +
        '</div>' +
        '<button class="btn btn--ghost btn--block mt-8" data-worlds-act="sample"><svg><use href="#i-compass"/></svg>샘플 세계관 추가</button>';
      body.querySelectorAll('[data-world]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.world === App.state.activeId) { sheet.close(); return; }
        App.state.activeId = b.dataset.world;
        App.filters = { charQuery: '', charFaction: '전체', charRace: '전체', charRank: '', loreQuery: '', loreCat: '전체', epStatus: '전체', tlEra: '전체' };
        touch({ immediate: true });
        sheet.close();
        Graph.destroy();
        MapView.destroy();
        renderCurrent();
        U.toast(W().name + ' 세계관으로 전환');
      }));
      body.querySelectorAll('[data-worlds-act]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.worldsAct;
        sheet.close();
        setTimeout(() => {
          if (act === 'new') openWorldForm(null);
          else if (act === 'edit') openWorldForm(App.state.activeId);
          else if (act === 'sample') {
            const s = global.Sample.world();
            s.id = U.uid('w');
            App.state.worlds.push(s);
            App.state.activeId = s.id;
            touch({ immediate: true });
            renderCurrent();
            U.toast('샘플 세계관을 추가했어요');
          }
        }, 180);
      }));
    }
    const sheet = U.openSheet({ eyebrow: 'WORLDS', title: '세계관', sub: App.state.worlds.length + '개의 세계를 오가며 쓸 수 있어요', body: body, full: true });
    draw();
  }

  function openWorldForm(id) {
    const w = id ? App.state.worlds.find((x) => x.id === id) : null;
    const html =
      U.field('세계관 이름', U.textInput('name', w ? w.name : '', { placeholder: '예: 아르카디아 연대기' }), null, true) +
      U.field('한 줄 소개', U.textInput('tagline', w ? w.tagline : '', { placeholder: '잿빛 왕관이 부서진 뒤…' })) +
      U.field('현재 시대 표기', U.textInput('era', w ? w.era : '', { placeholder: '제3기 104년' })) +
      U.field('설명', U.textArea('description', w ? w.description : '', '세계의 분위기, 갈등, 지금 벌어지는 일…', 6)) +
      (w ? '' : '<label class="field" style="display:flex;gap:9px;align-items:center;text-transform:none">' +
        '<input type="checkbox" name="samplemap" checked style="width:20px;height:20px;accent-color:#d4af37">' +
        '<span class="small">기본 판타지 지도로 시작하기</span></label>');

    formSheet({
      eyebrow: w ? 'EDIT WORLD' : 'NEW WORLD',
      title: w ? '세계관 수정' : '새 세계관',
      sub: '이름만 정하고 시작해도 좋아요.',
      full: true,
      html: html,
      onReady: ({ form }) => {
        if (w) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>세계관 삭제';
          del.addEventListener('click', async () => {
            const ok = await U.confirmSheet({
              title: '세계관을 삭제할까요?',
              message: w.name + '의 인물·관계·연표·지도·설정·에피소드가 모두 사라집니다. 되돌릴 수 없어요.',
              confirmText: '삭제', danger: true
            });
            if (!ok) return;
            App.state.worlds = App.state.worlds.filter((x) => x.id !== w.id);
            App.state.activeId = App.state.worlds[0] ? App.state.worlds[0].id : null;
            touch({ immediate: true });
            form.closest('.sheet').querySelector('.sheet__close').click();
            Graph.destroy();
            MapView.destroy();
            renderCurrent();
            U.toast('세계관을 삭제했어요');
          });
          form.appendChild(del);
        }
      },
      onSubmit: (fd) => {
        const name = String(fd.get('name') || '').trim();
        if (!name) { U.toast('세계관 이름을 적어 주세요', { icon: 'i-x' }); return false; }
        const data = {
          name: name,
          tagline: String(fd.get('tagline') || '').trim(),
          era: String(fd.get('era') || '').trim(),
          description: String(fd.get('description') || '').trim()
        };
        if (w) {
          Object.assign(w, data);
        } else {
          const world = Store.normalizeWorld(Object.assign({
            id: U.uid('w'),
            createdAt: Date.now(),
            characters: [], relations: [], events: [], lore: [], episodes: [],
            eraOrder: ['제1기'],
            map: { kind: fd.get('samplemap') ? 'sample' : null, image: null, markers: [] }
          }, data));
          App.state.worlds.push(world);
          App.state.activeId = world.id;
        }
        touch({ immediate: true });
        Graph.destroy();
        MapView.destroy();
        renderCurrent();
        U.toast(w ? '세계관을 수정했어요' : '세계관을 만들었어요');
      }
    });
  }

  /* ---------------------------------------------------------
     강함 / 등급 체계 (rank systems)
     --------------------------------------------------------- */
  function rankUsedCount(w, sysId) {
    return w.characters.filter((c) => (c.ranks || []).some((r) => r.systemId === sysId)).length;
  }

  // 인물 폼 안의 등급 선택기 (체계별로 한 단계씩)
  function drawRankPicker(host, w, sel, onManage) {
    const systems = w.rankSystems || [];
    if (!systems.length) {
      host.innerHTML = '<div class="rank-empty">' +
        '<p class="field-hint">아직 등록된 등급 체계가 없어요. 마법 서클·기사단 계위 같은 체계를 먼저 만들어 주세요.</p>' +
        '<button type="button" class="btn btn--sm" data-rank-manage><svg><use href="#i-plus"/></svg><span>등급 체계 만들기</span></button>' +
      '</div>';
    } else {
      host.innerHTML = systems.map((s) => {
        const cur = sel.get(s.id);
        const has = typeof cur === 'number' && cur >= 0 && cur < s.tiers.length;
        return '<div class="rank-pick" style="--rank-color:' + esc(s.color) + '">' +
          '<div class="rank-pick__head">' +
            '<span class="rank-pick__name"><span class="rank-pick__icon">' + esc(s.icon) + '</span>' + esc(s.name) + '</span>' +
            (has ? '<button type="button" class="rank-pick__clear" data-rank-clear="' + esc(s.id) + '">해제</button>' : '') +
          '</div>' +
          '<div class="chip-row rank-pick__chips">' + s.tiers.map((t, i) =>
            '<button type="button" class="chip chip--small rank-chip' + (cur === i ? ' chip--active' : '') + '"' +
            ' data-rank-system="' + esc(s.id) + '" data-rank-tier="' + i + '">' + esc(t) + '</button>').join('') +
          '</div>' +
        '</div>';
      }).join('') +
        '<button type="button" class="btn btn--sm btn--ghost mt-8" data-rank-manage><svg><use href="#i-shield"/></svg><span>등급 체계 관리</span></button>';
    }
    host.querySelectorAll('[data-rank-system]').forEach((b) => b.addEventListener('click', () => {
      sel.set(b.getAttribute('data-rank-system'), Number(b.getAttribute('data-rank-tier')));
      U.haptic(8);
      drawRankPicker(host, w, sel, onManage);
    }));
    host.querySelectorAll('[data-rank-clear]').forEach((b) => b.addEventListener('click', () => {
      sel.delete(b.getAttribute('data-rank-clear'));
      U.haptic(6);
      drawRankPicker(host, w, sel, onManage);
    }));
    host.querySelectorAll('[data-rank-manage]').forEach((b) => b.addEventListener('click', () => {
      if (onManage) onManage();
    }));
  }

  function guessTierSuffix(sys) {
    if (!sys || !sys.tiers || !sys.tiers.length) return '';
    const m = String(sys.tiers[0]).match(/^\s*\d+\s*(.+)$/);
    return m ? m[1].trim() : '';
  }

  function openRankSystems(onDone) {
    const w = W();
    if (!w) return;
    const body = document.createElement('div');

    function draw() {
      const systems = w.rankSystems || [];
      body.innerHTML =
        '<p class="prose small">세계관마다 여러 등급 체계를 만들 수 있어요. 예: 마법 서클, 검사 계위, 모험가 랭크.</p>' +
        (systems.length
          ? '<div class="rank-sys-list">' + systems.map((s) =>
              '<button type="button" class="rank-sys" data-rank-edit="' + esc(s.id) + '">' +
                '<span class="rank-sys__icon" style="--rank-color:' + esc(s.color) + '">' + esc(s.icon) + '</span>' +
                '<span class="rank-sys__body">' +
                  '<span class="rank-sys__name">' + esc(s.name) + '</span>' +
                  '<span class="rank-sys__meta">' + s.tiers.length + '단계 · ' + esc(s.tiers[0]) + ' ~ ' + esc(s.tiers[s.tiers.length - 1]) + ' · 인물 ' + rankUsedCount(w, s.id) + '명</span>' +
                  '<span class="rank-sys__tiers">' + s.tiers.map((t) => '<span class="mini-chip">' + esc(t) + '</span>').join('') + '</span>' +
                '</span>' +
                '<span class="rank-sys__chev"><svg><use href="#i-edit"/></svg></span>' +
              '</button>').join('') + '</div>'
          : '<div class="empty"><div class="empty__sigil">⚔</div><p>아직 등급 체계가 없어요.<br>마법 서클, 기사단 계위처럼 이 세계의 강함을 나눠 보세요.</p></div>') +
        '<button type="button" class="btn btn--gold btn--block mt-14" data-rank-new><svg><use href="#i-plus"/></svg><span>새 등급 체계</span></button>' +
        '<p class="field-hint mt-8">인물 폼의 <b>강함 / 등급</b>에서 체계를 고르면 단계를 탭 한 번으로 정할 수 있어요.</p>';

      body.querySelectorAll('[data-rank-edit]').forEach((b) => b.addEventListener('click', () => {
        const id = b.getAttribute('data-rank-edit');
        U.haptic(6);
        sheet.close();
        setTimeout(() => openRankForm(id, onDone || (() => openRankSystems())), 170);
      }));
      body.querySelector('[data-rank-new]').addEventListener('click', () => {
        U.haptic(6);
        sheet.close();
        setTimeout(() => openRankForm(null, onDone || (() => openRankSystems())), 170);
      });
    }

    const sheet = U.openSheet({ eyebrow: 'POWER TIER', title: '강함 · 등급 체계', full: true, body: body });
    draw();
  }

  function openRankForm(id, onDone) {
    const w = W();
    if (!w) return;
    const sys = id ? (w.rankSystems || []).find((s) => s.id === id) : null;
    let color = sys ? sys.color : RANK_COLORS[0];

    const html =
      U.field('체계 이름', U.textInput('name', sys ? sys.name : '', { placeholder: '예: 마법 서클 · 검사 계위 · 모험가 랭크' }), '세계관마다 여러 체계를 만들 수 있어요.', true) +
      '<div class="field--slim">' +
        U.field('아이콘', U.textInput('icon', sys ? sys.icon : '⚔', { placeholder: '⚔' })) +
        '<div class="field"><span class="field__label">색상</span><div class="rank-colors" id="rank-colors"></div>' +
          '<input type="hidden" name="color" value="' + esc(color) + '"></div>' +
      '</div>' +
      '<div class="field"><span class="field__label">단계 <b>*</b></span>' +
        '<div class="rank-gen">' +
          '<input class="input" id="tier-prefix" placeholder="단위 (예: 서클)" value="' + esc(guessTierSuffix(sys)) + '" aria-label="단계 단위">' +
          '<input class="input" id="tier-count" type="number" min="1" max="20" step="1" value="' + (sys ? sys.tiers.length : 9) + '" inputmode="numeric" aria-label="단계 수">' +
          '<button type="button" class="btn btn--sm btn--gold" id="tier-gen">자동 생성</button>' +
        '</div>' +
        '<span class="field-hint">개수를 넣고 [자동 생성]을 누르면 1서클~9서클처럼 한 번에 만들어져요. 만든 뒤 단계 이름은 각각 고칠 수 있어요.</span>' +
        '<div class="rank-tiers" id="rank-tiers"></div>' +
        '<button type="button" class="btn btn--sm btn--ghost mt-8" id="tier-add"><svg><use href="#i-plus"/></svg><span>단계 추가</span></button>' +
      '</div>' +
      (sys ? '<button type="button" class="btn btn--danger btn--block mt-8" id="rank-delete"><svg><use href="#i-trash"/></svg><span>체계 삭제</span></button>' : '');

    formSheet({
      eyebrow: sys ? 'EDIT TIER' : 'NEW TIER',
      title: sys ? '등급 체계 수정' : '새 등급 체계',
      sub: '이름과 단계만 정하면 인물에 바로 붙일 수 있어요.',
      full: true,
      html: html,
      onReady: ({ body, sheet }) => {
        function readTiers() {
          return U.$$('#rank-tiers [name="tier"]', body).map((el) => el.value.trim());
        }

        function drawTiers(list) {
          const host = body.querySelector('#rank-tiers');
          host.innerHTML = list.map((t, i) =>
            '<div class="rank-tier-row">' +
              '<span class="rank-tier-no">' + (i + 1) + '</span>' +
              '<input class="input" name="tier" value="' + esc(t) + '" aria-label="' + (i + 1) + '단계 이름">' +
              '<button type="button" class="mini-btn" data-tier-del="' + i + '" aria-label="' + (i + 1) + '단계 삭제"><svg><use href="#i-x"/></svg></button>' +
            '</div>').join('') ||
            '<p class="field-hint">아래 [자동 생성]으로 단계를 만들거나 [단계 추가]를 눌러 주세요.</p>';
          host.querySelectorAll('[data-tier-del]').forEach((b) => b.addEventListener('click', () => {
            const next = readTiers();
            next.splice(Number(b.getAttribute('data-tier-del')), 1);
            drawTiers(next);
            U.haptic(6);
          }));
        }

        drawTiers(sys ? sys.tiers.slice() : []);

        const colorHost = body.querySelector('#rank-colors');
        colorHost.innerHTML = RANK_COLORS.map((c) =>
          '<button type="button" class="rank-color' + (c === color ? ' is-on' : '') + '" data-color="' + c + '"' +
          ' style="--rank-color:' + c + '" aria-label="색상 ' + c + '"></button>').join('');
        colorHost.addEventListener('click', (e) => {
          const b = e.target.closest('[data-color]');
          if (!b) return;
          color = b.getAttribute('data-color');
          body.querySelector('[name="color"]').value = color;
          U.$$('[data-color]', colorHost).forEach((x) => x.classList.toggle('is-on', x === b));
          U.haptic(6);
        });

        body.querySelector('#tier-gen').addEventListener('click', () => {
          const prefix = String(body.querySelector('#tier-prefix').value || '').trim();
          const n = U.clamp(Math.round(Number(body.querySelector('#tier-count').value) || 0), 1, 20);
          const list = [];
          for (let i = 1; i <= n; i++) list.push(prefix ? i + prefix : i + '단계');
          drawTiers(list);
          U.haptic(10);
          U.toast(n + '단계를 만들었어요', { icon: 'i-check' });
        });

        body.querySelector('#tier-add').addEventListener('click', () => {
          const next = readTiers();
          next.push((next.length + 1) + '단계');
          drawTiers(next);
          const inputs = U.$$('#rank-tiers [name="tier"]', body);
          const lastInput = inputs[inputs.length - 1];
          if (lastInput) { lastInput.focus(); lastInput.select(); }
        });

        const del = body.querySelector('#rank-delete');
        if (del) {
          del.addEventListener('click', async () => {
            const used = rankUsedCount(w, sys.id);
            const ok = await U.confirmSheet({
              title: '이 등급 체계를 지울까요?',
              message: sys.name + ' 체계와 함께 ' + (used ? '인물 ' + used + '명의 등급 표시가' : '연결된 정보가') + ' 사라집니다.',
              confirmText: '삭제',
              danger: true
            });
            if (!ok) return;
            w.rankSystems = (w.rankSystems || []).filter((x) => x.id !== sys.id);
            w.characters.forEach((c) => { c.ranks = (c.ranks || []).filter((r) => r.systemId !== sys.id); });
            touch({ immediate: true });
            refreshView();
            sheet.close();
            U.toast('등급 체계를 지웠어요');
            if (onDone) setTimeout(onDone, 220);
          });
        }
      },
      onSubmit: (fd, body) => {
        const name = String(fd.get('name') || '').trim();
        if (!name) { U.toast('체계 이름을 적어 주세요', { icon: 'i-x' }); return false; }
        const tiers = U.$$('#rank-tiers [name="tier"]', body).map((el) => el.value.trim()).filter(Boolean);
        if (!tiers.length) { U.toast('단계를 하나 이상 만들어 주세요', { icon: 'i-x' }); return false; }
        const icon = String(fd.get('icon') || '').trim().slice(0, 2) || '⚔';
        const data = { name: name, icon: icon, color: color, tiers: tiers };
        if (sys) Object.assign(sys, data);
        else w.rankSystems.push(Object.assign({ id: U.uid('rk') }, data));
        // 단계가 줄면 범위를 벗어난 인물 등급을 정리한다
        w.characters.forEach((c) => {
          c.ranks = (c.ranks || []).filter((r) => {
            const s = (w.rankSystems || []).find((x) => x.id === r.systemId);
            return !!s && Number(r.tier) < s.tiers.length;
          });
        });
        touch({ immediate: true });
        refreshView();
        U.toast(sys ? '등급 체계를 수정했어요' : '등급 체계를 만들었어요');
        if (onDone) setTimeout(onDone, 220);
      }
    });
  }

  /* ---------------------------------------------------------
     more / backup
     --------------------------------------------------------- */
  function openMoreSheet() {
    const body = document.createElement('div');
    const theme = App.state.settings.theme;
    body.innerHTML =
      '<div class="quick-grid" style="grid-template-columns:1fr 1fr">' +
        '<button class="quick" data-more="lore"><svg><use href="#i-book"/></svg><span>설정집 (Codex)</span></button>' +
        '<button class="quick" data-more="episodes"><svg><use href="#i-film"/></svg><span>에피소드 · 콘티</span></button>' +
        '<button class="quick" data-more="story"><svg><use href="#i-route"/></svg><span>스토리 여정</span></button>' +
        '<button class="quick" data-more="gen"><svg><use href="#i-sparkles"/></svg><span>이름 · 지명 추천</span></button>' +
        '<button class="quick" data-more="ranks"><svg><use href="#i-shield"/></svg><span>강함 · 등급 체계</span></button>' +
        '<button class="quick" data-more="backup"><svg><use href="#i-download"/></svg><span>백업 · 복원</span></button>' +
        '<button class="quick" data-more="worlds"><svg><use href="#i-globe"/></svg><span>세계관 관리</span></button>' +
      '</div>' +
      '<div class="label-row"><span>테마</span></div>' +
      '<div class="btn-row">' +
        '<button class="btn btn--sm' + (theme === 'dark' ? ' btn--gold' : '') + '" data-theme-set="dark"><svg><use href="#i-moon"/></svg>다크 아케인</button>' +
        '<button class="btn btn--sm' + (theme === 'parchment' ? ' btn--gold' : '') + '" data-theme-set="parchment"><svg><use href="#i-sun"/></svg>라이트 양피지</button>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="label-row"><span>앱 정보</span></div>' +
      '<div class="def-list">' +
        '<div class="def"><dt>버전</dt><dd>아르카눔 v1.1 · PWA</dd></div>' +
        '<div class="def"><dt>저장</dt><dd>' + (Store.isDbBroken() ? 'localStorage (자동 저장)' : 'IndexedDB + localStorage 이중 저장') + '</dd></div>' +
        '<div class="def"><dt>오프라인</dt><dd>홈 화면에 추가하면 인터넷 없이도 열립니다.</dd></div>' +
      '</div>';

    const sheet = U.openSheet({ eyebrow: 'MORE', title: '더보기', body: body, full: true });
    body.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.more;
      sheet.close();
      if (act === 'lore') go('lore');
      else if (act === 'episodes') go('episodes');
      else if (act === 'story') { go('map'); setTimeout(() => MapView.setStory(true), 80); }
      else if (act === 'gen') setTimeout(() => Generator.open({}), 120);
      else if (act === 'ranks') setTimeout(openRankSystems, 120);
      else if (act === 'backup') setTimeout(openBackupSheet, 120);
      else if (act === 'worlds') setTimeout(openWorldSwitcher, 120);
    }));
    body.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.themeSet;
      App.state.settings.theme = t;
      Store.setTheme(t);
      applyTheme(t);
      sheet.close();
      U.toast(t === 'parchment' ? '양피지 테마로 바꿨어요' : '다크 아케인 테마로 바꿨어요', { icon: 'i-sun' });
    }));
  }

  /* ---------------------------------------------------------
     backup · '세계 만들기' 폴더 저장
     --------------------------------------------------------- */
  function backupFolderName() {
    const s = App.state && App.state.settings;
    const f = s && typeof s.backupFolder === 'string' ? s.backupFolder.trim() : '';
    return f || Store.DEFAULT_BACKUP_FOLDER || '세계 만들기';
  }

  function backupFileName() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate());
    const safe = backupFolderName().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    return (safe || '세계_만들기') + '_아르카눔_백업_' + stamp + '.json';
  }

  function backupText() {
    return JSON.stringify(Store.exportPayload(), null, 2);
  }

  function canShareFiles(file) {
    try {
      return !!(navigator.canShare && navigator.share && typeof File !== 'undefined' && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  }

  // Web Share(파일 앱의 폴더 선택) 우선 → 안 되면 일반 다운로드
  async function exportBackup(forceDownload) {
    const name = backupFileName();
    const text = backupText();
    const folder = backupFolderName();
    if (!forceDownload && typeof File !== 'undefined' && navigator.share) {
      let file;
      try {
        file = new File([text], name, { type: 'application/json' });
      } catch (e) {
        file = null;
      }
      if (file && canShareFiles(file)) {
        try {
          await navigator.share({ files: [file], title: name });
          U.toast('공유 시트에서 [파일에 저장] → ' + folder + ' 폴더를 고르세요', { icon: 'i-download', duration: 3600 });
          return 'shared';
        } catch (err) {
          if (err && err.name === 'AbortError') {
            U.toast('저장을 취소했어요', { icon: 'i-x' });
            return 'canceled';
          }
          // 공유가 실패하면 다운로드로 대신 저장한다
        }
      }
    }
    U.downloadText(name, text, 'application/json');
    U.toast('백업 파일을 내보냈어요 · 받은 파일을 ' + folder + ' 폴더로 옮길 수 있어요', { icon: 'i-download', duration: 3200 });
    return 'downloaded';
  }

  function openBackupSheet() {
    const w = W();
    const folder = backupFolderName();
    const body = document.createElement('div');
    body.innerHTML =
      '<p class="prose small">세계관 ' + App.state.worlds.length + '개 전체를 JSON 한 파일로 내보냅니다. 인물 사진, 지도 이미지, 지형 스탬프까지 함께 담겨요.</p>' +
      '<button class="btn btn--gold btn--block mt-8" data-backup="export"><svg><use href="#i-download"/></svg><span>아이폰 \'' + esc(folder) + '\' 폴더에 저장</span></button>' +
      '<p class="field-hint">공유 시트가 열리면 아래 안내대로 [파일에 저장]을 고르면 폴더를 직접 정할 수 있어요. 공유가 막힌 환경에서는 다운로드로 자동 저장합니다.</p>' +
      '<div class="backup-guide">' +
        '<div class="backup-guide__title"><svg><use href="#i-download"/></svg>아이폰 파일 앱 \'' + esc(folder) + '\' 폴더에 저장하는 법</div>' +
        '<ol>' +
          '<li>위 <b>폴더에 저장</b> 버튼을 눌러 공유 시트를 엽니다.</li>' +
          '<li>공유 목록에서 <b>파일에 저장</b>을 선택합니다.</li>' +
          '<li>저장 위치에서 <b>' + esc(folder) + '</b> 폴더를 고르고 <b>저장</b>을 누릅니다.</li>' +
          '<li>폴더가 없으면 파일 앱에서 새 폴더를 만들어 이름을 <b>' + esc(folder) + '</b>로 정하면 돼요.</li>' +
        '</ol>' +
        '<div class="backup-folder">' +
          '<input class="input" id="backup-folder-input" value="' + esc(folder) + '" placeholder="세계 만들기" aria-label="기본 저장 폴더 이름" maxlength="40">' +
          '<button type="button" class="btn btn--sm" id="backup-folder-save">폴더명 저장</button>' +
        '</div>' +
        '<p class="field-hint">여기 적은 폴더명은 안내 문구와 백업 파일 이름 앞에 함께 쓰여요.</p>' +
      '</div>' +
      '<div class="btn-row mt-8">' +
        '<button class="btn btn--sm" data-backup="export-download"><svg><use href="#i-download"/></svg><span>일반 다운로드</span></button>' +
        '<button class="btn btn--sm btn--ghost" data-backup="import"><svg><use href="#i-upload"/></svg><span>백업 가져오기</span></button>' +
      '</div>' +
      '<button class="btn btn--ghost btn--block mt-8" data-backup="import-merge"><svg><use href="#i-upload"/></svg><span>가져오되 기존 세계관 유지</span></button>' +
      '<p class="field-hint mt-8">복원은 현재 데이터를 대체합니다. 먼저 백업을 내보내 두는 걸 권해요.</p>' +
      (w ? '<div class="divider"></div><div class="def-list"><div class="def"><dt>현재</dt><dd>' + esc(w.name) + '<br>' +
        '인물 ' + w.characters.length + ' · 관계 ' + w.relations.length + ' · 사건 ' + w.events.length +
        ' · 지역 ' + w.map.markers.length + ' · 지형 ' + ((w.map.terrainStamps || []).length) +
        ' · 설정 ' + w.lore.length + ' · 에피소드 ' + w.episodes.length + '</dd></div></div>' : '');

    const sheet = U.openSheet({ eyebrow: 'BACKUP', title: '백업 · 복원', body: body });

    const folderInput = body.querySelector('#backup-folder-input');
    body.querySelector('#backup-folder-save').addEventListener('click', () => {
      const next = String(folderInput.value || '').trim();
      if (!next) { U.toast('폴더명을 적어 주세요', { icon: 'i-x' }); folderInput.focus(); return; }
      App.state.settings.backupFolder = next;
      touch({ immediate: true });
      U.toast('기본 폴더를 \'' + next + '\'로 저장했어요', { icon: 'i-check' });
      sheet.close();
      setTimeout(openBackupSheet, 180);
    });

    body.querySelectorAll('[data-backup]').forEach((b) => b.addEventListener('click', async () => {
      const act = b.dataset.backup;
      if (act === 'export' || act === 'export-download') {
        b.disabled = true;
        try {
          await exportBackup(act === 'export-download');
        } finally {
          b.disabled = false;
        }
        return;
      }
      const merge = act === 'import-merge';
      const file = await U.pickFile('application/json,.json');
      if (!file) return;
      try {
        const text = await U.readFileAsText(file);
        const next = Store.parseImport(text);
        const ok = await U.confirmSheet({
          title: merge ? '세계관을 추가할까요?' : '백업으로 복원할까요?',
          message: merge
            ? next.worlds.length + '개 세계관을 현재 목록에 더합니다. 기존 세계관은 그대로 남습니다.'
            : '지금 있는 세계관 ' + App.state.worlds.length + '개를 모두 대체합니다. 되돌릴 수 없어요.',
          confirmText: merge ? '추가' : '복원',
          danger: !merge
        });
        if (!ok) return;
        if (merge) {
          next.worlds.forEach((x) => { x.id = App.state.worlds.some((y) => y.id === x.id) ? U.uid('w') : x.id; });
          App.state.worlds = App.state.worlds.concat(next.worlds);
          touch({ immediate: true });
        } else {
          Store.applyImport(next);
          App.state = Store.get();
          App.state.settings.theme = next.settings.theme || App.state.settings.theme;
          applyTheme(App.state.settings.theme);
        }
        sheet.close();
        Graph.destroy();
        MapView.destroy();
        renderCurrent();
        U.toast('백업을 가져왔어요');
      } catch (err) {
        U.toast('백업 파일을 읽지 못했어요: ' + (err && err.message ? err.message : ''), { icon: 'i-x', duration: 3000 });
      }
    }));
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  function bindGlobal() {
    $('#world-switch').addEventListener('click', () => {
      if (!W()) { openWorldForm(null); return; }
      openWorldSwitcher();
    });
    $('#btn-generator').addEventListener('click', () => Generator.open({}));
    $('#btn-theme').addEventListener('click', () => {
      const next = App.state.settings.theme === 'parchment' ? 'dark' : 'parchment';
      App.state.settings.theme = next;
      Store.setTheme(next);
      applyTheme(next);
      U.toast(next === 'parchment' ? '양피지 테마' : '다크 아케인 테마', { icon: next === 'parchment' ? 'i-sun' : 'i-moon' });
    });
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      const tab = t.dataset.tab;
      if (tab === 'more') { openMoreSheet(); return; }
      go(tab);
    }));
    $('#fab').addEventListener('click', () => {
      if (App.tab === 'characters') openCharacterForm(null);
      else if (App.tab === 'timeline') openEventForm(null);
      else if (App.tab === 'lore') openLoreForm(null);
      else if (App.tab === 'episodes') openEpisodeForm(null);
      else if (App.tab === 'map') openPinForm(50, 50, null);
    });
    window.addEventListener('beforeunload', () => { Store.save(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(true); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.tab === 'relations') Graph.clearSelection();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function boot() {
    App.state = await Store.init();
    applyTheme(App.state.settings.theme || 'dark');
    bindGlobal();
    renderTop();
    renderCurrent();
    updateNav();
    registerSW();
  }

  global.App = App;
  global.App.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
