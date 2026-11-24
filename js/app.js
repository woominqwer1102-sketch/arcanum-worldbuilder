/* =========================================================
   ARCANUM · app (views, forms, backup, navigation)
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;
  const $ = U.$;
  const $$ = U.$$;
  const esc = U.esc;

  // 설정집 분류 — '마법·능력체계'는 v1.4에서 '기타 규칙'으로 합쳤다(능력은 ⚔️ 능력·등급이 맡는다)
  const CATS = {
    nation: '국가',
    faction: '세력',
    race: '종족·몬스터',
    item: '아이템·유물',
    rule: '기타 규칙'
  };

  const FACTION_CATS = ['nation', 'faction'];

  // 설정집 안의 '⚔️ 능력·등급' 섹션 (등록된 rankSystems를 보여 준다)
  const RANKS_CAT = '__ranks';

  const STATUS = {
    idea: { label: '아이디어', cls: 'status--idea' },
    writing: { label: '집필중', cls: 'status--writing' },
    done: { label: '완료', cls: 'status--done' }
  };

  const App = {
    state: null,
    tab: 'dashboard',
    filters: { charQuery: '', charFaction: '전체', charRace: '전체', charRank: '', loreQuery: '', loreCat: '전체', epStatus: '전체', tlEra: '전체', relMode: 'char' },
    openLore: {}
  };

  const RANK_COLORS = ['#d4af37', '#c9a24a', '#7fa9d8', '#8fbf8f', '#c9738a', '#a98fd0', '#c98a5a', '#9aa7b0'];

  // 등급 아이콘 — 이모지·글자·인라인 SVG를 같은 자리에서 그린다
  const RankIcon = global.RankIcon || {
    render: (v) => esc(v || '⚔️'),
    text: (v) => v || '⚔️',
    name: (v) => v || '⚔️',
    isCustom: () => false,
    pack: () => [{ value: '⚔️', label: '검' }],
    build: () => null
  };

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

  function eventYear(e) {
    return Number(e && (e.yearNum != null ? e.yearNum : e.year)) || 0;
  }

  function sortedEvents(w) {
    // 시대 순서 안에서 연도 숫자(yearNum) 오름차순
    return (w.events || []).slice().sort((a, b) => {
      const ra = eraRank(w, a.era), rb = eraRank(w, b.era);
      if (ra !== rb) return ra - rb;
      return eventYear(a) - eventYear(b);
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
    if (App.tab === 'relations' && tab !== 'relations') { Graph.destroy(); FactionGraph.destroy(); }
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
    if (App.tab === 'relations' && FactionGraph.state.mounted) {
      FactionGraph.refresh();
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

    html += '<p class="center muted small" style="margin-top:22px">아르카눔 · 판타지 세계관 노트 v1.4.1</p>';

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
    else if (act === 'ranks') { App.filters.loreCat = RANKS_CAT; App.filters.loreQuery = ''; go('lore'); }
    else if (act === 'worlds') openWorldSwitcher();
    else if (act === 'backup') openBackupSheet();
  }

  /* ---------------------------------------------------------
     characters
     --------------------------------------------------------- */
  // 나이 · 키 · 몸무게를 '27세 · 175cm · 63kg' 형태로. 아무것도 없으면 '알 수 없음'
  function charBodyText(c) {
    const o = c || {};
    const bits = [];
    if (o.ageNum) bits.push(o.ageNum + '세');
    if (o.heightCm) bits.push(o.heightCm + 'cm');
    if (o.weightKg) bits.push(o.weightKg + 'kg');
    return bits.length ? bits.join(' · ') : '알 수 없음';
  }

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
        (c.faction || c.gender ? '<div class="char-card__faction">' + esc([c.faction, c.gender].filter(Boolean).join(' · ')) + '</div>' : '') +
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
      '<span class="rank-badge__icon">' + RankIcon.render(s.icon) + '</span>' +
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
        const hay = [c.name, c.title, c.race, c.gender, c.faction, c.abilities, c.personality, c.notes,
          c.age, c.ageNum, c.heightCm, c.weightKg].join(' ').toLowerCase();
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

  // 관계 카드에 보여 줄 역할 — 스승·제자는 내가 어느 쪽인지에 따라 상대를 부른다
  function relationRole(r, selfId, other) {
    const type = Graph.TYPES[r.type] || Graph.TYPES.other;
    const name = other ? other.name : '상대';
    if (r.type === 'mentor' || r.type === 'student') {
      const mentorId = r.type === 'student' ? r.b : r.a;
      return mentorId === selfId ? ('제자 · ' + name) : ('스승 · ' + name);
    }
    return r.label || type.label;
  }

  function characterDetailBody(w, c) {
    const others = charsById(w);
    const rels = w.relations.filter((r) => r.a === c.id || r.b === c.id);
    const events = w.events.filter((e) => (e.characters || []).indexOf(c.id) > -1);
    const eps = w.episodes.filter((e) => (e.characters || []).indexOf(c.id) > -1);
    // ---- 맨 위 프로필 — 작은 프로필 사진 + 바로 옆 이름·칭호·성별·종족, 사진은 '크게 보기' ----
    const chips = [c.race, c.gender, c.faction].filter(Boolean);
    let html = '<div class="char-profile">' +
      '<div class="char-profile__media">' +
        (c.image
          ? '<button type="button" class="char-profile__photo has-img" data-zoom-photo aria-label="' + esc(c.name) + ' 프로필 사진 크게 보기">' +
              '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + ' 프로필 사진">' +
              '<span class="char-profile__lens" aria-hidden="true">🔍</span>' +
            '</button>'
          : '<div class="char-profile__photo char-profile__photo--empty" aria-hidden="true">' +
              '<span class="char-profile__initial">' + esc(U.initials(c.name)) + '</span>' +
            '</div>') +
      '</div>' +
      '<div class="char-profile__id">' +
        '<div class="char-profile__eyebrow">Character</div>' +
        '<h3 class="char-profile__name">' + esc(c.name) + '</h3>' +
        (c.title ? '<div class="char-profile__title">' + esc(c.title) + '</div>' : '') +
        (chips.length ? '<div class="char-profile__chips">' + chips.map((t) => '<span class="mini-chip">' + esc(t) + '</span>').join('') + '</div>' : '') +
        '<div class="char-profile__body">' + esc(charBodyText(c)) + '</div>' +
        (c.image ? '<button type="button" class="char-profile__zoom" data-zoom-photo><span aria-hidden="true">🔍</span><span>크게 보기</span></button>' : '') +
      '</div>' +
    '</div>';
    // ---- 능력 — 상세에서 바로 [-] / [+] 로 단계 변경 (자동 저장) ----
    const rankById = new Map((w.rankSystems || []).map((s) => [s.id, s]));
    const rankRows = (c.ranks || []).map((r) => {
      const sys = rankById.get(r.systemId);
      const tier = Number(r.tier);
      if (!sys || sys.tiers[tier] === undefined || sys.tiers[tier] === '') return '';
      return '<div class="irank">' +
        '<span class="irank__icon">' + RankIcon.render(sys.icon) + '</span>' +
        '<span class="irank__name">' + esc(sys.name) + '</span>' +
        '<button type="button" class="irank__btn" data-rank-step="' + esc(sys.id) + '" data-delta="-1"' + (tier <= 0 ? ' disabled' : '') + ' aria-label="' + esc(sys.name) + ' 한 단계 내리기">−</button>' +
        '<span class="irank__tier">' + esc(sys.tiers[tier]) + '</span>' +
        '<button type="button" class="irank__btn" data-rank-step="' + esc(sys.id) + '" data-delta="1"' + (tier >= sys.tiers.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(sys.name) + ' 한 단계 올리기">+</button>' +
      '</div>';
    }).join('');
    html += '<div class="label-row"><span>능력</span><span class="muted" style="font-size:10px">바로 조절돼요</span></div>' +
      (rankRows ? '<div class="irank-list">' + rankRows + '</div>' : '') +
      '<button type="button" class="inline-add" data-rank-add><span aria-hidden="true">＋</span>능력 추가</button>' +
      legacyAbilityRow(w, c) +
      (c.abilityText ? '<p class="field-hint">' + esc(c.abilityText) + '</p>' : '');

    // ---- 장비·무기 — 상세에서 바로 장착/해제 (자동 저장) ----
    const itemById = new Map((w.lore || []).filter((l) => l.category === 'item').map((l) => [l.id, l]));
    const equipped = (c.weaponIds || []).filter((id) => itemById.has(id));
    html += '<div class="label-row"><span>장비 · 무기</span><span>' + equipped.length + '</span></div>' +
      (equipped.length
        ? '<div class="mini-chips">' + equipped.map((id) =>
            '<button type="button" class="mini-chip mini-chip--x" data-weapon-toggle="' + esc(id) + '" aria-label="' + esc(itemById.get(id).title) + ' 해제">' +
              esc(itemById.get(id).title) + '<b aria-hidden="true">×</b></button>').join('') + '</div>'
        : '<p class="field-hint">아직 장착한 장비가 없어요.</p>') +
      '<button type="button" class="inline-add" data-weapon-add><span aria-hidden="true">＋</span>장비 추가</button>';

    if (c.personality) html += '<div class="label-row"><span>성격</span></div><p class="prose">' + esc(c.personality) + '</p>';
    if (c.notes) html += '<div class="label-row"><span>배경 메모</span></div><p class="prose">' + esc(c.notes) + '</p>';

    // ---- 연결된 관계 (상대를 탭하면 그 인물 상세로) ----
    html += '<div class="divider"></div>' +
      '<div class="label-row"><span>연결된 관계</span><span>' + rels.length + '</span></div>' +
      '<div class="rel-cards">' + (rels.length ? rels.map((r) => {
        const other = others.get(r.a === c.id ? r.b : r.a);
        const type = Graph.TYPES[r.type] || Graph.TYPES.other;
        const oid = r.a === c.id ? r.b : r.a;
        const directed = (r.type === 'mentor' || r.type === 'student');
        const typeLabel = directed ? '스승→제자' : type.label;
        const arrow = r.a === c.id ? '→' : '←';
        return '<div class="rel-card" style="--rel-color:' + type.color + '">' +
          '<button type="button" class="rel-card__who" data-open-char="' + esc(oid) + '" aria-label="' + esc(other ? other.name : '') + ' 상세 열기">' +
            '<span class="rel-card__face">' + (other && other.image ? '<img src="' + esc(other.image) + '" alt="">' : esc(other ? U.initials(other.name) : '?')) + '</span>' +
            '<span class="rel-card__txt"><b>' + esc(other ? other.name : '알 수 없음') + '</b>' +
              '<span class="rel-card__label">' + esc(relationRole(r, c.id, other)) + '</span></span>' +
            '<span class="rel-card__type">' + esc(arrow + ' ' + typeLabel) + '</span>' +
          '</button>' +
          '<button type="button" class="rel-card__edit" data-rel="' + esc(r.id) + '" aria-label="관계 수정"><svg><use href="#i-edit"/></svg></button>' +
        '</div>';
      }).join('') : '<p class="field-hint">아직 이어진 관계가 없어요.</p>') +
      '</div>' +
      '<button type="button" class="btn btn--sm btn--ghost mt-8" data-add-rel="' + esc(c.id) + '"><svg><use href="#i-plus"/></svg>관계 추가</button>';

    // ---- 소속 세력 관계 ----
    if (c.factionId) {
      const fac = (w.lore || []).find((l) => l.id === c.factionId);
      const facRels = (w.factionRelations || []).filter((r) => r.a === c.factionId || r.b === c.factionId);
      html += '<div class="divider"></div>' +
        '<div class="label-row"><span>소속 세력 관계</span><span>' + esc(fac ? fac.title : '') + '</span></div>' +
        (facRels.length ? '<div class="list">' + facRels.map((r) => {
          const otherId = r.a === c.factionId ? r.b : r.a;
          const t = FactionGraph.TYPES[r.type] || FactionGraph.TYPES.ally;
          return '<button type="button" class="rel-line" data-open-fac="' + esc(otherId) + '">' +
            '<span class="rel-dot" style="background:' + t.color + '"></span>' +
            '<span><b>' + esc(factionTitle(otherId)) + '</b> · ' + esc(r.label || t.label) + '</span>' +
            '<span class="rel-type">' + esc(t.label) + '</span></button>';
        }).join('') + '</div>'
          : '<p class="field-hint">이 세력은 아직 다른 세력과 이어진 관계가 없어요.</p>') +
        '<button type="button" class="btn btn--sm btn--ghost mt-8" data-open-fac-graph><svg><use href="#i-network"/></svg>세력 관계도 열기</button>';
    }

    // ---- 인물 히스토리 (연표) ----
    const history = sortedEvents(w).filter((e) => (e.characters || []).indexOf(c.id) > -1);
    html += '<div class="divider"></div>' +
      '<div class="label-row"><span>인물 히스토리</span><span>' + history.length + '</span></div>' +
      (history.length ? '<div class="list">' + history.map((e) => {
        const era = e.era || (w.eraPrefix || '');
        const year = (e.yearNum != null ? e.yearNum : e.year);
        return '<button type="button" class="row-card" data-open-event="' + esc(e.id) + '">' +
          '<span class="row-card__badge" style="font-size:10px">' + esc(String(year)) + '</span>' +
          '<span class="row-card__body"><span class="row-card__title">' + esc(e.title) + '</span>' +
          '<span class="row-card__meta">' + esc(era) + ' ' + esc(String(year)) + '년' + (e.summary ? ' · ' + esc(e.summary) : '') + '</span></span></button>';
      }).join('') + '</div>' : '<p class="field-hint">아직 이 인물이 등장하는 연표 사건이 없어요.</p>') +
      '<button type="button" class="btn btn--sm btn--ghost mt-8" data-add-history="' + esc(c.id) + '"><svg><use href="#i-plus"/></svg>히스토리 사건 추가</button>';

    if (eps.length) {
      html += '<div class="divider"></div><div class="label-row"><span>등장 에피소드</span></div><div class="list">';
      eps.forEach((ep) => {
        html += '<div class="row-card"><span class="row-card__badge" style="font-size:10px">' + esc(ep.no) + '화</span>' +
          '<span class="row-card__body"><span class="row-card__title">' + esc(ep.title) + '</span>' +
          '<span class="row-card__meta">' + esc((STATUS[ep.status] || STATUS.idea).label) + ' · 에피소드</span></span></div>';
      });
      html += '</div>';
    }

    return html;
  }

  // 능력·장비를 상세 시트에서 바로 바꾼 뒤, AI 초상화 프롬프트가 쓰는 abilities 문자열도 함께 맞춘다
  function syncCharacterAbilityText(w, c) {
    const sysById = new Map((w.rankSystems || []).map((s) => [s.id, s]));
    const loreById = new Map((w.lore || []).map((l) => [l.id, l]));
    const parts = [];
    (c.ranks || []).forEach((r) => {
      const sys = sysById.get(r.systemId);
      const t = Number(r.tier);
      if (sys && sys.tiers[t] !== undefined && sys.tiers[t] !== '') parts.push(sys.name + ' ' + sys.tiers[t]);
    });
    (c.abilityIds || []).forEach((id) => { const it = loreById.get(id); if (it) parts.push(it.title); });
    (c.weaponIds || []).forEach((id) => { const it = loreById.get(id); if (it) parts.push(it.title); });
    if (c.abilityText) parts.push(c.abilityText);
    c.abilities = parts.join(' · ');
  }

  /* 상세 시트 '+ 능력 추가' — 설정집 능력·등급 체계에서 단계를 골라 바로 넣는다 */
  function openAbilityQuickAdd(w, c, onChange) {
    const systems = w.rankSystems || [];
    if (!systems.length) {
      U.toast('설정집에 ⚔️ 능력·등급 체계가 없어요 · 먼저 능력을 만들어 주세요', { icon: 'i-x', duration: 2600 });
      return;
    }
    const body = document.createElement('div');
    body.innerHTML = systems.map((sys) => {
      const cur = (c.ranks || []).find((r) => r.systemId === sys.id);
      const tier = cur ? Number(cur.tier) : -1;
      return '<div class="field"><span class="field__label">' + esc(sys.name) +
        (cur && sys.tiers[tier] !== undefined ? ' <span class="muted" style="font-size:10px">현재 ' + esc(sys.tiers[tier]) + '</span>' : '') + '</span>' +
        '<div class="chip-row" data-ability-sys="' + esc(sys.id) + '">' +
          sys.tiers.map((t, i) => '<button type="button" class="chip chip--small' + (i === tier ? ' chip--active' : '') + '" data-ability-tier="' + i + '">' + esc(t) + '</button>').join('') +
        '</div></div>';
    }).join('') + '<p class="field-hint">단계를 누르면 바로 저장되고 상세 화면에 반영돼요.</p>';

    const sheet = U.openSheet({
      eyebrow: 'ABILITY',
      title: '능력 · 단계',
      sub: '설정집의 체계와 단계를 그대로 골라요.',
      body: body
    });
    body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ability-tier]');
      if (!btn) return;
      const row = btn.closest('[data-ability-sys]');
      if (!row) return;
      const sysId = row.getAttribute('data-ability-sys');
      const tier = Number(btn.getAttribute('data-ability-tier'));
      const sys = systems.find((s) => s.id === sysId);
      if (!sys) return;
      const cur = (c.ranks || []).find((r) => r.systemId === sysId);
      if (cur) cur.tier = tier;
      else c.ranks = (c.ranks || []).concat([{ systemId: sysId, tier: tier }]);
      onChange();
      sheet.close();
      U.toast(sys.name + ' · ' + sys.tiers[tier] + ' 을 넣었어요', { icon: 'i-shield' });
    });
  }

  /* 상세 시트 '+ 장비 추가' — 설정집 아이템·유물을 바로 장착/해제 */
  function openWeaponQuickAdd(w, c, onChange) {
    const items = (w.lore || []).filter((l) => l.category === 'item');
    if (!items.length) {
      U.toast('설정집 · 아이템·유물에 먼저 장비를 추가해 주세요', { icon: 'i-x', duration: 2600 });
      return;
    }
    const body = document.createElement('div');
    function draw() {
      const owned = new Set(c.weaponIds || []);
      body.innerHTML = '<div class="chip-row">' + items.map((it) =>
        '<button type="button" class="chip chip--small' + (owned.has(it.id) ? ' chip--active' : '') + '" data-item="' + esc(it.id) + '">' +
          (owned.has(it.id) ? '✓ ' : '') + esc(it.title) + '</button>').join('') + '</div>' +
        '<p class="field-hint">칩을 누를 때마다 바로 장착/해제되고 저장돼요.</p>';
    }
    draw();
    U.openSheet({
      eyebrow: 'EQUIPMENT',
      title: '장비 추가',
      sub: '설정집 · 아이템·유물에서 골라요.',
      body: body,
      foot: [{ label: '닫기', className: 'btn--gold', onClick: () => 'close' }]
    });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-item]');
      if (!b) return;
      const id = b.getAttribute('data-item');
      const ids = (c.weaponIds || []).slice();
      const i = ids.indexOf(id);
      if (i > -1) ids.splice(i, 1); else ids.push(id);
      c.weaponIds = ids;
      onChange();
      draw();
      U.haptic(6);
    });
  }

  function openCharacterDetail(id) {
    const w = W();
    const c = w.characters.find((x) => x.id === id);
    if (!c) return;
    const body = document.createElement('div');
    body.innerHTML = characterDetailBody(w, c);
    // 상세 시트 안에서 능력·장비를 바꾸면 바로 저장하고 시트 본문만 다시 그린다
    function repaint() {
      syncCharacterAbilityText(w, c);
      touch({ immediate: true });
      body.innerHTML = characterDetailBody(w, c);
    }
    const sheet = U.openSheet({
      title: c.name,
      hideHeadText: true,   // 이름·칭호는 본문 맨 위 프로필 블록이 맡는다(같은 내용이 두 번 보이지 않게)
      full: true,
      body: body,
      onClose: () => refreshView(),
      foot: [
        { label: '수정', className: 'btn', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openCharacterForm(id), 180); } },
        { label: '삭제', className: 'btn--danger', icon: 'i-trash', onClick: async () => {
          const ok = await U.confirmSheet({ title: '인물을 삭제할까요?', message: c.name + ' 님의 기록과 관계가 함께 삭제됩니다.', confirmText: '삭제', danger: true });
          if (!ok) return;
          w.characters = w.characters.filter((x) => x.id !== id);
          w.relations = w.relations.filter((r) => r.a !== id && r.b !== id);
          w.events.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
          w.episodes.forEach((e) => { e.characters = (e.characters || []).filter((x) => x !== id); });
          w.mapCharacterPins = (w.mapCharacterPins || []).filter((p) => p.charId !== id);
          touch({ immediate: true });
          sheet.close();
          refreshView();
          U.toast('인물을 삭제했어요');
        } }
      ]
    });
    body.addEventListener('click', (e) => {
      const zoom = e.target.closest('[data-zoom-photo]');
      if (zoom && c.image) {
        U.openLightbox({ src: c.image, title: c.name, sub: c.title || '' });
        U.haptic(6);
        return;
      }
      // ---- 능력 단계 [-] / [+] — 바로 저장 ----
      const rankStep = e.target.closest('[data-rank-step]');
      if (rankStep) {
        e.preventDefault();
        const sys = (w.rankSystems || []).find((s) => s.id === rankStep.getAttribute('data-rank-step'));
        const cur = sys ? (c.ranks || []).find((r) => r.systemId === sys.id) : null;
        if (!sys || !cur) return;
        const next = U.clamp(Number(cur.tier) + Number(rankStep.getAttribute('data-delta')), 0, sys.tiers.length - 1);
        if (next === Number(cur.tier)) return;
        cur.tier = next;
        repaint();
        U.haptic(6);
        U.toast(sys.name + ' ' + sys.tiers[next], { icon: 'i-shield', duration: 1400 });
        return;
      }
      if (e.target.closest('[data-rank-add]')) {
        e.preventDefault();
        openAbilityQuickAdd(w, c, repaint);
        return;
      }
      // ---- 장비 해제 / 추가 — 바로 저장 ----
      const weaponToggle = e.target.closest('[data-weapon-toggle]');
      if (weaponToggle) {
        e.preventDefault();
        const wid = weaponToggle.getAttribute('data-weapon-toggle');
        const item = (w.lore || []).find((l) => l.id === wid);
        c.weaponIds = (c.weaponIds || []).filter((x) => x !== wid);
        repaint();
        U.haptic(8);
        U.toast((item ? item.title : '장비') + ' 해제했어요', { icon: 'i-trash', duration: 1400 });
        return;
      }
      if (e.target.closest('[data-weapon-add]')) {
        e.preventDefault();
        openWeaponQuickAdd(w, c, repaint);
        return;
      }
      const rel = e.target.closest('[data-rel]');
      if (rel) {
        sheet.close();
        setTimeout(() => openRelationForm(null, null, rel.dataset.rel), 160);
        return;
      }
      const other = e.target.closest('[data-open-char]');
      if (other) {
        sheet.close();
        setTimeout(() => openCharacterDetail(other.getAttribute('data-open-char')), 160);
        return;
      }
      const addRel = e.target.closest('[data-add-rel]');
      if (addRel) {
        sheet.close();
        setTimeout(() => openRelationForm(addRel.getAttribute('data-add-rel'), null, null), 160);
        return;
      }
      const ev = e.target.closest('[data-open-event]');
      if (ev) {
        sheet.close();
        setTimeout(() => openEventDetail(ev.getAttribute('data-open-event')), 160);
        return;
      }
      const addHist = e.target.closest('[data-add-history]');
      if (addHist) {
        sheet.close();
        setTimeout(() => openEventForm(null, { characterId: addHist.getAttribute('data-add-history') }), 160);
        return;
      }
      const fac = e.target.closest('[data-open-fac]');
      if (fac) {
        sheet.close();
        App.filters.relMode = 'faction';
        go('relations');
        return;
      }
      if (e.target.closest('[data-open-fac-graph]')) {
        sheet.close();
        App.filters.relMode = 'faction';
        go('relations');
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
  function bindIllustrationPanel(hostBody, form, imgField, getExtra) {
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
      const numOf = (n) => {
        const v = Number(get(n));
        return (isFinite(v) && v > 0) ? Math.round(v) : null;
      };
      // 종족·소속·능력은 설정집 선택기에서, 성별은 지금 폼에 입력된 값에서 바로 읽는다
      const extra = (typeof getExtra === 'function' ? getExtra() : null) || {};
      return {
        name: get('name'),
        title: get('title'),
        gender: extra.gender || get('gender'),
        race: extra.race || get('race'),
        faction: extra.faction || get('faction'),
        abilities: extra.abilities || get('abilities'),
        notes: get('notes'),
        age: get('age'),
        ageNum: numOf('ageNum'),
        heightCm: numOf('heightCm'),
        weightKg: numOf('weightKg')
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

  /* 예전 '마법·능력체계'에서 온 특기 이름 — 지우지 않고 보여만 준다(설정집 기타 규칙에 보관) */
  function legacyAbilityRow(w, c) {
    const ids = (c && c.abilityIds) || [];
    if (!ids.length) return '';
    const names = ids.map((id) => (w.lore || []).find((l) => l.id === id)).filter(Boolean).map((l) => l.title);
    if (!names.length) return '';
    return '<div class="legacy-traits mt-8"><span class="legacy-traits__label">특기</span>' +
      names.slice(0, 6).map((n) => '<span class="mini-chip">' + esc(n) + '</span>').join('') +
      (names.length > 6 ? '<span class="mini-chip">+' + (names.length - 6) + '</span>' : '') +
      '<span class="legacy-traits__note">설정집 · 기타 규칙에 보관</span></div>';
  }

  function openCharacterForm(id) {
    const w = W();
    const c = id ? w.characters.find((x) => x.id === id) : null;
    const html =
      U.field('이름', '<div class="input-with-action">' +
        '<input class="input" name="name" required placeholder="예: 아엘릭 반 다이렌" value="' + esc(c ? c.name : '') + '">' +
        '<button type="button" class="mini-action" id="gen-name"><svg><use href="#i-sparkles"/></svg>이름 추천</button>' +
      '</div>', '✨ 버튼으로 판타지 이름을 바로 채울 수 있어요.', true) +
      U.field('칭호 / 별명', U.textInput('title', c ? c.title : '', { placeholder: '예: 서리검의 계승자' })) +
      '<div class="field"><span class="field__label">종족</span><div id="char-race"></div></div>' +
      '<div class="field"><span class="field__label">소속 / 세력 <span class="muted" style="font-size:10px">설정집 · 국가·세력</span></span><div id="char-faction"></div></div>' +
      '<div class="field"><span class="field__label">나이 · 신체</span>' +
        '<div class="body-grid">' +
          '<label class="body-cell"><span>나이 <b>(세)</b></span><input class="input" type="number" name="ageNum" inputmode="numeric" min="0" max="9999" placeholder="27" value="' + (c && c.ageNum ? c.ageNum : '') + '"></label>' +
          '<label class="body-cell"><span>키 <b>(cm)</b></span><input class="input" type="number" name="heightCm" inputmode="numeric" min="0" max="300" placeholder="175" value="' + (c && c.heightCm ? c.heightCm : '') + '"></label>' +
          '<label class="body-cell"><span>몸무게 <b>(kg)</b></span><input class="input" type="number" name="weightKg" inputmode="numeric" min="0" max="500" placeholder="63" value="' + (c && c.weightKg ? c.weightKg : '') + '"></label>' +
        '</div>' +
        '<span class="field-hint">비워 두면 <b>알 수 없음</b>으로 표시돼요. 나이·키·몸무게는 AI 초상화의 체형에도 반영됩니다.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">성별</span>' +
        '<div class="chip-row gender-picks">' +
          ['남성', '여성', '기타/미상', '알 수 없음'].map((g) =>
            '<button type="button" class="chip' + (c && c.gender === g ? ' chip--active' : '') + '" data-gender="' + esc(g) + '">' + esc(g) + '</button>').join('') +
        '</div>' +
        '<input class="input mt-8" name="gender" id="gender-input" placeholder="직접 입력 (예: 남성, 여성, 논바이너리)" value="' + esc(c && c.gender ? c.gender : '') + '">' +
        '<span class="field-hint">빠른 선택을 누르면 채워지고, 다른 표현은 직접 고쳐 쓸 수 있어요. AI 초상화에도 반영돼요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">능력 <span class="muted" style="font-size:10px">설정집 · ⚔️ 능력·등급</span></span>' +
        '<div id="char-ranks"></div>' +
        '<button type="button" class="lore-add mt-8" id="char-rank-add"><svg><use href="#i-plus"/></svg>설정집에 새 능력 추가</button>' +
        legacyAbilityRow(w, c) +
        '<span class="field-hint">설정집의 <b>⚔️ 능력·등급</b> 체계와 단계를 그대로 골라요. 능력이 여러 개면 [능력 추가]로 행을 더하고, 비워 두면 ‘없음’이에요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">무기 / 장비 <span class="muted" style="font-size:10px">설정집 · 아이템·유물</span></span>' +
        '<div id="char-weaps"></div></div>' +
      U.field('성격 · 배경 메모', U.textArea('notes', c ? c.notes : '', '어떤 사람인지, 무엇을 숨기고 있는지…', 5)) +
      '<div class="field"><span class="field__label">대표 이미지</span><div id="char-img"></div>' +
      '<span class="field-hint">폰 사진첩에서 고르면 자동으로 줄여서 저장해요.</span></div>' +
      '<div class="ai-art" id="char-ai"></div>' +
      (c ? '<button type="button" class="btn btn--danger btn--block mt-14" id="char-delete"><svg><use href="#i-trash"/></svg>인물 삭제</button>' : '');

    let img = null;
    let racePick = null, factionPick = null, weaponPick = null;
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
        bindIllustrationPanel(body, form, img, () => {
          const byId = new Map((w.lore || []).map((l) => [l.id, l]));
          const raceItem = byId.get((racePick && racePick.ids()[0]) || '');
          const facItem = byId.get((factionPick && factionPick.ids()[0]) || '');
          const abl = [];
          (w.rankSystems || []).forEach((sys) => {
            const t = rankSel.get(sys.id);
            if (typeof t === 'number' && t >= 0 && t < sys.tiers.length) abl.push(sys.name + ' ' + sys.tiers[t]);
          });
          const legacy = (c && (c.abilityIds || [])).map((id) => (byId.get(id) || {}).title).filter(Boolean);
          const gi = form.querySelector('#gender-input');
          const chip = form.querySelector('.gender-picks .chip--active');
          return {
            gender: (gi && gi.value.trim()) || (chip ? chip.textContent.trim() : ''),
            race: raceItem ? raceItem.title : (racePick ? racePick.legacy() : ''),
            faction: facItem ? facItem.title : (factionPick ? factionPick.legacy() : ''),
            abilities: abl.concat(legacy).join(' · ')
          };
        });

        const rkHost = body.querySelector('#char-ranks');
        if (rkHost) {
          const rkRows = (c && Array.isArray(c.ranks) ? c.ranks : [])
            .filter((r) => r && r.systemId)
            .map((r) => ({ systemId: r.systemId, tier: Number(r.tier) || 0 }));
          const paintRanks = () => drawRankPicker(rkHost, w, rkRows, rankSel, () => openRankSystems(paintRanks));
          paintRanks();
          const addSys = body.querySelector('#char-rank-add');
          if (addSys) addSys.addEventListener('click', () => {
            U.haptic(6);
            openRankForm(null, paintRanks);
          });
        }

        // 성별 빠른 선택 칩 + 직접 입력
        // 설정집에서만 고르는 종족 · 세력 · 능력 · 무기 (처음엔 전부 '없음')
        racePick = buildLorePicker(body.querySelector('#char-race'), w, {
          category: 'race', multi: false,
          ids: c && c.raceId ? [c.raceId] : [],
          legacy: c && !c.raceId ? (c.race || '') : ''
        });
        factionPick = buildLorePicker(body.querySelector('#char-faction'), w, {
          category: 'faction', categories: FACTION_CATS, multi: false,
          ids: c && c.factionId ? [c.factionId] : [],
          legacy: c && !c.factionId ? (c.faction || '') : ''
        });
        weaponPick = buildLorePicker(body.querySelector('#char-weaps'), w, {
          category: 'item', multi: true,
          ids: c ? (c.weaponIds || []) : [],
          legacy: ''
        });

        const genderInput = body.querySelector('#gender-input');
        const genderChips = U.$$('[data-gender]', body);
        const paintGender = () => {
          const v = genderInput.value.trim();
          genderChips.forEach((b) => b.classList.toggle('chip--active', b.getAttribute('data-gender') === v));
        };
        genderChips.forEach((b) => b.addEventListener('click', () => {
          const v = b.getAttribute('data-gender');
          genderInput.value = genderInput.value.trim() === v ? '' : v;
          paintGender();
          U.haptic(6);
        }));
        genderInput.addEventListener('input', paintGender);
        paintGender();

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
        const numOf = (k, max) => {
          const v = Number(String(fd.get(k) || '').trim());
          return (isFinite(v) && v > 0) ? Math.min(max, Math.round(v)) : null;
        };
        const data = {
          name: name,
          title: String(fd.get('title') || '').trim(),
          gender: String(fd.get('gender') || '').trim().slice(0, 20),
          ageNum: numOf('ageNum', 9999),
          heightCm: numOf('heightCm', 300),
          weightKg: numOf('weightKg', 500),
          notes: String(fd.get('notes') || '').trim(),
          image: img.get()
        };
        data.age = charBodyText(data);   // 예전 필드(age 문자열)도 함께 유지 — 백업·복원 호환
        // 종족 · 세력 · 능력 · 무기는 설정집 항목 id로 저장하고, 표시용 이름을 함께 접어 둔다
        if (!racePick || !factionPick || !weaponPick) {
          U.toast('설정집 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', { icon: 'i-x' });
          return false;
        }
        const loreById = new Map((w.lore || []).map((l) => [l.id, l]));
        const raceItem = loreById.get((racePick.ids()[0] || ''));
        const factionItem = loreById.get((factionPick.ids()[0] || ''));
        data.raceId = raceItem ? raceItem.id : null;
        data.race = raceItem ? raceItem.title : racePick.legacy();
        data.factionId = factionItem ? factionItem.id : null;
        data.faction = factionItem ? factionItem.title : factionPick.legacy();
        // 능력은 이제 ⚔️ 능력·등급(체계+단계)이 맡는다.
        // 예전 설정집 '마법·능력체계'에서 온 abilityIds는 '기타 규칙'에 그대로 두고 이름만 보존한다.
        data.abilityIds = (c && Array.isArray(c.abilityIds)) ? c.abilityIds.slice() : [];
        data.weaponIds = weaponPick.ids().filter((x) => loreById.has(x));
        const legacyText = c ? (c.abilityText || '') : '';
        const abilNames = data.abilityIds.map((x) => (loreById.get(x) || {}).title).filter(Boolean)
          .concat(data.weaponIds.map((x) => loreById.get(x).title));
        const weaponLegacy = weaponPick.legacy();
        data.abilityText = [legacyText, weaponLegacy].filter(Boolean).join(' · ');
        data.abilities = abilNames.concat(data.abilityText ? [data.abilityText] : []).join(' · ');
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
  function factionItems() {
    const w = W();
    // 세력 관계도 · 소속 선택은 '국가'와 '세력'을 함께 다룬다
    return ((w && w.lore) || []).filter((l) => FACTION_CATS.indexOf(l.category) > -1);
  }

  function renderRelations() {
    const w = W();
    const host = $('#rel-host');
    const mode = App.filters.relMode === 'faction' ? 'faction' : 'char';
    const facs = factionItems();
    const nRel = (w.factionRelations || []).length;

    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Relationship Graph</span><h2>' +
        (mode === 'faction' ? '세력 관계도' : '인물 관계도') + '</h2></div>' +
      '<span class="muted small">' + (mode === 'faction'
        ? facs.length + '세력 · ' + nRel + '관계'
        : w.characters.length + '명 · ' + w.relations.length + '관계') + '</span></div>' +
      '<div class="segmented" role="tablist">' +
        '<button type="button" class="seg' + (mode === 'char' ? ' is-on' : '') + '" data-relmode="char">인물 관계도</button>' +
        '<button type="button" class="seg' + (mode === 'faction' ? ' is-on' : '') + '" data-relmode="faction">국가 · 세력 관계도</button>' +
      '</div>' +
      '<div class="graph-toolbar">' +
        '<button type="button" class="gbtn" data-graph="link"><svg><use href="#i-plus"/></svg>관계 추가</button>' +
        '<button type="button" class="gbtn" data-graph="list"><svg><use href="#i-more"/></svg>관계 목록</button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="fit" aria-label="전체 보기"><svg><use href="#i-target"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="in" aria-label="확대"><svg><use href="#i-zoom-in"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="out" aria-label="축소"><svg><use href="#i-zoom-out"/></svg></button>' +
        '<button type="button" class="gbtn gbtn--icon" data-graph="legend" aria-label="범례"><svg><use href="#i-book"/></svg></button>' +
      '</div>' +
      (mode === 'faction'
        ? (facs.length >= 1
          ? '<div class="graph-wrap" id="graph-wrap"></div>'
          : emptyBlock('세력이 없어 관계를 그릴 수 없어요', '설정집의 세력·국가 항목이 이 관계도의 노드가 됩니다.', 'add-faction', '세력 추가'))
        : (w.characters.length ? '<div class="graph-wrap" id="graph-wrap"></div>'
          : emptyBlock('인물이 없어 관계를 그릴 수 없어요', '인물을 두 명 이상 만들면 여기서 선으로 이을 수 있어요.', 'add-char', '인물 추가')));

    host.querySelectorAll('[data-relmode]').forEach((b) => b.addEventListener('click', () => {
      const next = b.getAttribute('data-relmode');
      if (next === mode) return;
      App.filters.relMode = next;
      U.haptic(6);
      Graph.destroy();
      FactionGraph.destroy();
      renderRelations();
    }));

    host.querySelectorAll('[data-graph]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.graph;
        const G = mode === 'faction' ? FactionGraph : Graph;
        if (act === 'link') {
          const next = G.state.mode !== 'link';
          G.setLinkMode(next);
          btn.classList.toggle('is-on', next);
        } else if (act === 'fit') G.fit();
        else if (act === 'in') G.zoom(1.25);
        else if (act === 'out') G.zoom(0.8);
        else if (act === 'legend') { if (G.toggleLegend) G.toggleLegend(); }
        else if (act === 'list') { if (mode === 'faction') openFactionRelList(); else openRelationList(); }
      });
    });
    host.querySelectorAll('[data-act="add-char"]').forEach((b) => b.addEventListener('click', () => openCharacterForm(null)));
    host.querySelectorAll('[data-act="add-faction"]').forEach((b) => b.addEventListener('click', () => openLoreForm(null, { category: 'faction' })));

    const wrap = host.querySelector('#graph-wrap');
    if (wrap) {
      if (mode === 'faction') {
        FactionGraph.mount(wrap, {
          world: W,
          onNode: openFactionDetail,
          onEdge: (id) => openFactionRelForm(null, null, id),
          onLinkPair: (a, b) => openFactionRelForm(a, b, null),
          onNodeMoved: () => touch()
        });
      } else {
        Graph.mount(wrap, {
          world: W,
          onNode: openCharacterDetail,
          onEdge: (id) => openRelationForm(null, null, id),
          onLinkPair: (a, b) => openRelationForm(a, b, null),
          onNodeMoved: () => touch()
        });
      }
    }
  }

  /* ---------------- 세력 관계 ---------------- */
  function factionTitle(id) {
    const l = factionItems().find((x) => x.id === id);
    return l ? l.title : '?';
  }

  function openFactionDetail(id) {
    const w = W();
    const l = (w.lore || []).find((x) => x.id === id);
    if (!l) return;
    const rels = (w.factionRelations || []).filter((r) => r.a === id || r.b === id);
    const members = w.characters.filter((c) => c.factionId === id);
    const isNation = l.category === 'nation';
    const races = loreRaceNames(w, l);
    const natName = isNation ? '' : loreNationName(w, l);
    const subFactions = isNation ? (w.lore || []).filter((x) => x.category === 'faction' && x.nationId === id) : [];
    const regions = (w.map.markers || []).filter((m) => m.factionId === id);
    const body = document.createElement('div');
    body.innerHTML =
      (l.body ? '<p class="prose">' + esc(l.body) + '</p>' : '') +
      ((l.tags || []).length ? '<div class="tag-row">' + l.tags.map((t) => '<span class="mini-chip">#' + esc(t) + '</span>').join('') + '</div>' : '') +
      (races.length ? '<div class="label-row"><span>주 종족</span><span>' + races.length + '</span></div><div class="mini-chips">' +
        races.map((r) => '<span class="mini-chip mini-chip--race">' + esc(r) + '</span>').join('') + '</div>' : '') +
      (!isNation ? '<div class="label-row"><span>소속 국가</span></div><div class="mini-chips">' +
        (natName ? '<button class="mini-chip mini-chip--faction" data-open-faction="' + esc(l.nationId) + '">⚑ ' + esc(natName) + '</button>'
          : '<span class="mini-chip">무소속</span>') + '</div>' : '') +
      (subFactions.length ? '<div class="label-row"><span>소속 세력</span><span>' + subFactions.length + '</span></div><div class="mini-chips">' +
        subFactions.map((f) => '<button class="mini-chip" data-open-faction="' + esc(f.id) + '">' + esc(f.title) + '</button>').join('') + '</div>' : '') +
      (regions.length ? '<div class="label-row"><span>지배 지역</span><span>' + regions.length + '</span></div><div class="mini-chips">' +
        regions.map((m) => '<button class="mini-chip mini-chip--region" data-open-region="' + esc(m.id) + '">' + esc(m.name) + '</button>').join('') + '</div>' : '') +
      '<div class="label-row"><span>관계</span><span>' + rels.length + '</span></div>' +
      (rels.length ? '<div class="list">' + rels.map((r) => {
        const other = r.a === id ? r.b : r.a;
        const t = FactionGraph.TYPES[r.type] || FactionGraph.TYPES.ally;
        return '<button class="rel-line" data-frel="' + esc(r.id) + '">' +
          '<span class="rel-dot" style="background:' + t.color + '"></span>' +
          '<span><b>' + esc(factionTitle(other)) + '</b><br><span class="muted">' + esc(r.label || '') + '</span></span>' +
          '<span class="rel-type">' + esc((r.a === id ? '→ ' : '← ') + t.label) + '</span></button>';
      }).join('') + '</div>' : '<p class="field-hint">아직 이 세력과 이어진 관계가 없어요.</p>') +
      (members.length ? '<div class="label-row"><span>소속 인물</span><span>' + members.length + '</span></div><div class="mini-chips">' +
        members.map((c) => '<button class="mini-chip" data-open-char="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('') + '</div>' : '');

    const sheet = U.openSheet({
      eyebrow: 'FACTION',
      title: l.title,
      sub: l.tags && l.tags.length ? l.tags.join(' · ') : '',
      full: true,
      body: body,
      foot: [
        { label: '관계 추가', className: 'btn', icon: 'i-plus', onClick: () => { sheet.close(); setTimeout(() => openFactionRelForm(id, null, null), 160); } },
        { label: '설정 수정', className: 'btn--gold', icon: 'i-edit', onClick: () => { sheet.close(); setTimeout(() => openLoreForm(id), 160); } }
      ]
    });
    body.addEventListener('click', (e) => {
      const rel = e.target.closest('[data-frel]');
      if (rel) { sheet.close(); setTimeout(() => openFactionRelForm(null, null, rel.getAttribute('data-frel')), 160); return; }
      const ch = e.target.closest('[data-open-char]');
      if (ch) { sheet.close(); setTimeout(() => openCharacterDetail(ch.getAttribute('data-open-char')), 160); return; }
      const rg = e.target.closest('[data-open-region]');
      if (rg) { sheet.close(); setTimeout(() => openRegionDetail(rg.getAttribute('data-open-region')), 160); }
    });
  }

  function openFactionRelList() {
    const w = W();
    const body = document.createElement('div');
    const rels = w.factionRelations || [];
    body.innerHTML = rels.length
      ? '<div class="list">' + rels.map((r) => {
          const t = FactionGraph.TYPES[r.type] || FactionGraph.TYPES.ally;
          return '<button class="rel-line" data-frel="' + esc(r.id) + '">' +
            '<span class="rel-dot" style="background:' + t.color + '"></span>' +
            '<span><b>' + esc(factionTitle(r.a)) + '</b> → <b>' + esc(factionTitle(r.b)) + '</b><br>' +
            '<span class="muted">' + esc(r.label || '') + '</span></span>' +
            '<span class="rel-type">' + esc(t.label) + '</span></button>';
        }).join('') + '</div>'
      : '<div class="empty"><div class="empty__sigil">⚑</div><p>아직 이어진 세력 관계가 없어요.</p></div>';
    const sheet = U.openSheet({ eyebrow: 'FACTIONS', title: '세력 관계 목록', body: body, full: true });
    body.addEventListener('click', (e) => {
      const rel = e.target.closest('[data-frel]');
      if (!rel) return;
      sheet.close();
      setTimeout(() => openFactionRelForm(null, null, rel.getAttribute('data-frel')), 160);
    });
  }

  function openFactionRelForm(aId, bId, relId) {
    const w = W();
    const facs = factionItems();
    if (facs.length < 2) {
      U.toast('설정집에 세력을 두 개 이상 등록해 주세요', { icon: 'i-book', duration: 2400 });
      return;
    }
    const rel = relId ? (w.factionRelations || []).find((r) => r.id === relId) : null;
    if (rel) { aId = rel.a; bId = rel.b; }
    let aValue = aId && facs.some((f) => f.id === aId) ? aId : facs[0].id;
    let bValue = bId && facs.some((f) => f.id === bId) ? bId : (facs.find((f) => f.id !== aValue) || facs[1]).id;
    let typeValue = rel ? rel.type : 'ally';

    const body = document.createElement('div');
    body.innerHTML =
      '<div class="center muted small" style="margin-bottom:10px">A(출발) → B(대상) 방향의 단방향 관계로 이어져요</div>' +
      '<div class="field"><span class="field__label">세력 A <span class="muted" style="font-size:10px">출발</span></span><div id="frel-a"></div></div>' +
      '<div class="field"><span class="field__label">세력 B <span class="muted" style="font-size:10px">대상</span></span><div id="frel-b"></div></div>' +
      '<div class="field"><span class="field__label">관계 종류</span><div id="frel-type"></div></div>' +
      U.field('한 줄 설명', U.textInput('label', rel ? rel.label : '', { placeholder: '예: 성소의 인장을 함께 지킨다' })) +
      U.field('메모', U.textArea('note', rel ? rel.note : '', '동맹의 대가, 적대의 이유…', 4));

    const sheet = U.openSheet({
      eyebrow: rel ? 'EDIT FACTION RELATION' : 'NEW FACTION RELATION',
      title: rel ? '세력 관계 수정' : '세력 관계 잇기',
      body: body,
      foot: [
        { label: '취소', className: 'btn--ghost', onClick: () => 'close' },
        { label: rel ? '저장' : '관계 추가', className: 'btn--gold', icon: 'i-check', onClick: () => submit() }
      ]
    });

    const items = facs.map((f) => ({ value: f.id, label: f.title }));
    body.querySelector('#frel-a').appendChild(U.chipPicker(items, aValue, { multi: false, onChange: (v) => { aValue = v; } }));
    body.querySelector('#frel-b').appendChild(U.chipPicker(items, bValue, { multi: false, onChange: (v) => { bValue = v; } }));
    body.querySelector('#frel-type').appendChild(U.chipPicker(
      Object.keys(FactionGraph.TYPES).map((k) => ({ value: k, label: FactionGraph.TYPES[k].label })),
      typeValue, { multi: false, onChange: (v) => { typeValue = v; } }));

    function submit() {
      if (aValue === bValue) { U.toast('서로 다른 세력을 골라 주세요', { icon: 'i-x' }); return; }
      const form = body.closest('.sheet').querySelector('form');
      const fd = form ? new FormData(form) : null;
      const label = fd ? String(fd.get('label') || '').trim() : '';
      const note = fd ? String(fd.get('note') || '').trim() : '';
      const data = { a: aValue, b: bValue, type: typeValue, label: label, note: note };
      if (rel) Object.assign(rel, data);
      else w.factionRelations.push(Object.assign({ id: U.uid('fr') }, data));
      touch({ immediate: true });
      sheet.close();
      if (App.filters.relMode === 'faction') renderRelations();
      U.toast(rel ? '세력 관계를 수정했어요' : '세력 관계를 이었어요');
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
            '<span><b>' + esc(a ? a.name : '?') + '</b> → <b>' + esc(b ? b.name : '?') + '</b><br>' +
            '<span class="muted">' + esc(r.label || '') + '</span></span>' +
            '<span class="rel-type">' + esc(((r.type === 'mentor' || r.type === 'student') ? '스승→제자' : type.label)) + '</span></button>';
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
    if (rel) {
      // 예전 '제자' 관계는 a가 제자·b가 스승 → A(스승) → B(제자)로 바로잡는다
      if (rel.type === 'student') { aId = rel.b; bId = rel.a; } else { aId = rel.a; bId = rel.b; }
    }
    const chars = w.characters;
    if (!chars.length) {
      U.toast('인물을 먼저 추가해 주세요', { icon: 'i-users' });
      return;
    }
    aId = aId || chars[0].id;
    bId = bId || (chars[1] ? chars[1].id : chars[0].id);
    const byId = charsById(w);
    const typeItems = Object.keys(Graph.TYPES)
      .filter((k) => k !== 'student')
      .map((k) => ({ value: k, label: k === 'mentor' ? '스승·제자' : Graph.TYPES[k].label }));

    const body = document.createElement('div');
    body.innerHTML =
      '<div class="card" style="margin-bottom:14px">' +
        '<div class="center" style="font-family:var(--font-display);font-size:15px">' +
          '<span id="rel-a-name">' + esc(byId.get(aId).name) + '</span>' +
          '<span class="muted" style="padding:0 8px">→</span>' +
          '<span id="rel-b-name">' + esc(byId.get(bId).name) + '</span>' +
        '</div>' +
        '<div class="center muted small" id="rel-dir-note" style="margin-top:4px"></div>' +
        '<button type="button" class="btn btn--sm btn--ghost" id="rel-swap" style="display:block;margin:8px auto 0">⇄ 방향 바꾸기</button>' +
      '</div>' +
      '<div class="field"><span class="field__label">인물 A <span class="muted" style="font-size:10px">출발</span></span><div id="rel-a-pick"></div></div>' +
      '<div class="field"><span class="field__label">인물 B <span class="muted" style="font-size:10px">대상</span></span><div id="rel-b-pick"></div></div>' +
      '<div class="field"><span class="field__label">관계 종류</span><div id="rel-type"></div></div>' +
      '<span class="field-hint">모든 관계는 <b>A → B</b> 단방향 화살표로 표시돼요. 스승·제자는 A가 스승, B가 제자가 돼요.</span>' +
      U.field('한 줄 설명', U.textInput('label', rel ? rel.label : '', { placeholder: '예: 어린 시절의 서약' })) +
      U.field('메모', U.textArea('note', rel ? rel.note : '', '이 관계의 배경, 감정, 숨은 사정…', 4));

    let typeValue = rel ? (rel.type === 'student' ? 'mentor' : rel.type) : 'alliance';
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
      const A = byId.get(aValue);
      const B = byId.get(bValue);
      body.querySelector('#rel-a-name').textContent = A ? A.name : '?';
      body.querySelector('#rel-b-name').textContent = B ? B.name : '?';
      const note = body.querySelector('#rel-dir-note');
      if (note) {
        note.textContent = (typeValue === 'mentor' || typeValue === 'student')
          ? (A ? A.name : 'A') + ' 가 스승 · ' + (B ? B.name : 'B') + ' 가 제자'
          : 'A → B 방향으로 표시돼요';
      }
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
      onChange: (v) => { typeValue = v; paintNames(); }
    });
    body.querySelector('#rel-a-pick').appendChild(aPick);
    body.querySelector('#rel-b-pick').appendChild(bPick);
    body.querySelector('#rel-type').appendChild(typePick);
    paintNames();

    body.querySelector('#rel-swap').addEventListener('click', () => {
      const t = aValue;
      aValue = bValue;
      bValue = t;
      aPick.setSelected(aValue);
      bPick.setSelected(bValue);
      paintNames();
      U.haptic(8);
      U.toast('A ↔ B 방향을 바꿨어요', { icon: 'i-refresh', duration: 1400 });
    });

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
      const saveType = typeValue === 'student' ? 'mentor' : typeValue;
      const label = body.querySelector('[name="label"]').value.trim();
      const note = body.querySelector('[name="note"]').value.trim();
      const dup = w.relations.find((r) => r.id !== (rel && rel.id) &&
        ((r.a === aValue && r.b === bValue) || (r.a === bValue && r.b === aValue)) &&
        ((r.type === 'student' ? 'mentor' : r.type) === saveType));
      if (dup) {
        U.toast('같은 종류의 관계가 이미 있어요', { icon: 'i-x' });
        return;
      }
      if (rel) {
        Object.assign(rel, { a: aValue, b: bValue, type: saveType, label: label, note: note });
      } else {
        w.relations.push({ id: U.uid('r'), a: aValue, b: bValue, type: saveType, label: label, note: note });
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
      '<div class="tl-item__year">' + esc(e.era || '') + ' ' + esc(String(eventYear(e))) + '년</div>' +
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
      '<div class="mini-chips" style="margin-bottom:12px"><span class="mini-chip">' + esc(e.era || '') + ' ' + esc(String(eventYear(e))) + '년</span></div>' +
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

  function openEventForm(id, opts) {
    const o = opts || {};
    const w = W();
    const e = id ? w.events.find((x) => x.id === id) : null;
    const eras = unique((w.eraOrder || []).concat(w.events.map((x) => x.era)));
    const eraDefault = w.eraPrefix || (eras[eras.length - 1] || '제1기');
    const yearVal = e ? (e.yearNum != null ? e.yearNum : (Number(e.year) || 0)) : (Number(w.eraYear) || 0);
    const body = document.createElement('div');
    body.innerHTML =
      U.field('역법 · 시대명', U.textInput('era', e ? e.era : eraDefault, { placeholder: '예: 제국력 · 제3기', list: 'dl-eras' }),
        '비워 두면 세계관의 대표 역법(' + eraDefault + ')을 씁니다.') +
      '<div class="field"><span class="field__label">연도</span>' +
        '<div class="year-stepper">' +
          '<button type="button" class="ystep" data-year-step="-100" aria-label="100년 전">−100</button>' +
          '<button type="button" class="ystep" data-year-step="-10" aria-label="10년 전">−10</button>' +
          '<button type="button" class="ystep" data-year-step="-1" aria-label="1년 전">−</button>' +
          '<input class="input year-input" id="ev-year" name="yearNum" type="number" inputmode="numeric" min="-9999" max="99999" step="1" value="' + yearVal + '" aria-label="연도 숫자">' +
          '<button type="button" class="ystep" data-year-step="1" aria-label="1년 후">+</button>' +
          '<button type="button" class="ystep" data-year-step="10" aria-label="10년 후">+10</button>' +
          '<button type="button" class="ystep" data-year-step="100" aria-label="100년 후">+100</button>' +
        '</div>' +
        '<span class="field-hint" id="ev-year-preview">' + esc((e ? e.era : eraDefault) + ' ' + yearVal + '년') + '</span>' +
      '</div>' +
      U.field('사건 제목', U.textInput('title', e ? e.title : '', { placeholder: '예: 첫 번째 인장의 해제' }), null, true) +
      U.field('한 줄 요약', U.textInput('summary', e ? e.summary : '', { placeholder: '한 문장으로' })) +
      U.field('상세 내용', U.textArea('detail', e ? e.detail : '', '무슨 일이 있었고, 누가 있었고, 무엇이 바뀌었나…', 5)) +
      '<div class="field"><span class="field__label">관련 인물</span><div id="ev-chars"></div></div>' +
      '<div class="field"><span class="field__label">관련 지역</span><div id="ev-regions"></div></div>' +
      U.datalist('dl-eras', eras);

    let pickedChars = (e ? (e.characters || []) : (o.characterId ? [o.characterId] : [])).slice();
    let pickedRegions = (e ? (e.locations || []) : []).slice();

    formSheet({
      eyebrow: e ? 'EDIT EVENT' : 'NEW EVENT',
      title: e ? '사건 수정' : '새 사건',
      sub: '시대와 연도로 자동 정렬됩니다.',
      full: true,
      html: body.innerHTML,
      onReady: ({ body: b }) => {
        const yearInput = b.querySelector('#ev-year');
        const eraInput = b.querySelector('[name="era"]');
        const preview = b.querySelector('#ev-year-preview');
        const paintPreview = () => {
          const v = Number(yearInput.value) || 0;
          preview.textContent = (String(eraInput.value || '').trim() || eraDefault) + ' ' + v + '년';
        };
        b.querySelectorAll('[data-year-step]').forEach((btn) => btn.addEventListener('click', () => {
          const step = Number(btn.getAttribute('data-year-step'));
          yearInput.value = String(U.clamp((Number(yearInput.value) || 0) + step, -9999, 99999));
          paintPreview();
          U.haptic(6);
        }));
        yearInput.addEventListener('input', paintPreview);
        eraInput.addEventListener('input', paintPreview);
        paintPreview();

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
        const era = String(fd.get('era') || '').trim() || eraDefault || '연대 미상';
        const year = U.clamp(Math.round(Number(fd.get('yearNum')) || 0), -9999, 99999);
        const data = {
          era: era, year: year, yearNum: year, title: title,
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
        if (w.mapLocked) {
          U.toast('🔒 지도가 고정되어 있어요 · 잠금을 해제하면 바꿀 수 있어요', { icon: 'i-x', duration: 2400 });
          return;
        }
        w.map.kind = 'sample';
        w.map.image = null;
        w.map.imageOriginal = null;
        w.map.style = 'parchment';
        w.map.ratio = 3 / 4; // 기본 지도 도안은 900×1200
        touch({ immediate: true });
        MapView.refresh();
        U.toast('기본 판타지 지도를 불러왔어요');
      },
      onCreatePin: (x, y) => openPinForm(x, y, null),
      onPin: (id) => openRegionDetail(id),
      onOpenCharacter: (charId) => openCharacterDetail(charId),
      onMapChange: () => touch()
    });
  }

  async function uploadMapImage() {
    const w0 = W();
    if (w0 && w0.mapLocked) {
      U.toast('🔒 지도가 고정되어 있어요 · 잠금을 해제하면 바꿀 수 있어요', { icon: 'i-x', duration: 2400 });
      return;
    }
    const file = await U.pickFile('image/*');
    if (!file) return;
    try {
      U.toast('지도를 준비하는 중…', { icon: 'i-image', duration: 1600 });
      // 투명 PNG 지도도 잉크로 살리도록 흰 바탕 위에 눌러 둔다
      const original = await U.resizeImage(file, 1600, 0.88, '#ffffff');
      let ratio = null;
      try {
        const im = await U.loadImage(original);
        if (im.naturalWidth && im.naturalHeight) {
          ratio = Math.round((im.naturalWidth / im.naturalHeight) * 1000) / 1000;
        }
      } catch (e) { /* 비율을 몰라도 지도는 저장한다 */ }
      // 업로드 즉시 옛날 양피지 지도로 자동 변환 (원본도 함께 보관 → 툴바에서 전환)
      let parchment = null;
      try {
        parchment = await MapView.parchment(original);
      } catch (e) {
        parchment = null;
      }
      const w = W();
      w.map.imageOriginal = original;
      w.map.image = parchment || original;
      w.map.style = parchment ? 'parchment' : 'original';
      w.map.kind = 'custom';
      if (ratio) w.map.ratio = ratio;
      touch({ immediate: true });
      MapView.refresh();
      U.toast(parchment
        ? '지도를 옛날 양피지로 바꿨어요 · 위 📜 단추로 원본과 전환'
        : '지도 이미지를 올렸어요', { icon: 'i-image', duration: 2800 });
    } catch (e) {
      U.toast('이미지를 올리지 못했어요', { icon: 'i-x' });
    }
  }

  function regionDetailBody(w, m) {
    const kind = MapView.KINDS[m.kind] || MapView.KINDS.city;
    const natItem = m.nationId ? (w.lore || []).find((x) => x.id === m.nationId && x.category === 'nation') : null;
    const natName = natItem ? natItem.title : (m.nation || '');
    const facItem = m.factionId ? (w.lore || []).find((x) => x.id === m.factionId && (x.category === 'faction' || x.category === 'nation')) : null;
    const facName = facItem ? facItem.title : (m.faction || '');
    const defs = [];
    if (m.climate) defs.push(['기후', m.climate]);
    if (m.resources) defs.push(['특산물', m.resources]);
    if (m.danger) defs.push(['위험 요소', m.danger]);
    const events = w.events.filter((e) => (e.locations || []).indexOf(m.id) > -1);
    const eps = w.episodes.filter((e) => (e.locations || []).indexOf(m.id) > -1);
    let html = '<div class="mini-chips" style="margin-bottom:12px"><span class="mini-chip">' + esc(kind.label) + '</span>' +
      (natItem
        ? '<button class="mini-chip mini-chip--faction" data-open-faction="' + esc(natItem.id) + '">🏳 ' + esc(natName) + '</button>'
        : (natName ? '<span class="mini-chip">🏳 ' + esc(natName) + '</span>' : '')) +
      (facItem
        ? '<button class="mini-chip mini-chip--faction" data-open-faction="' + esc(facItem.id) + '">⚑ ' + esc(facName) + '</button>'
        : (facName ? '<span class="mini-chip">⚑ ' + esc(facName) + '</span>' : '')) +
      '</div>';
    if (w.mapLocked) html += '<p class="field-hint">🔒 지도가 고정되어 있어요 · 잠금을 해제하면 이 지역을 수정하거나 지울 수 있어요.</p>';
    if (defs.length) html += '<dl class="def-list">' + defs.map((d) => '<div class="def"><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>').join('') + '</dl>';
    if (m.notes) html += '<div class="divider"></div><p class="prose">' + esc(m.notes) + '</p>';
    const stored = (w.lore || []).filter((l) => l.category === 'item' && l.locationId === m.id);
    if (stored.length) {
      html += '<div class="divider"></div><div class="label-row"><span>보관 유물</span><span>' + stored.length + '</span></div>' +
        '<div class="mini-chips">' + stored.map((l) => '<span class="mini-chip">' + esc(l.title) + '</span>').join('') + '</div>';
    }
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
    body.addEventListener('click', (e) => {
      const fac = e.target.closest('[data-open-faction]');
      if (!fac) return;
      sheet.close();
      setTimeout(() => openFactionDetail(fac.getAttribute('data-open-faction')), 160);
    });
    const sheet = U.openSheet({
      eyebrow: 'REGION',
      title: m.name,
      full: true,
      body: body,
      foot: w.mapLocked
        ? [{ label: '닫기', className: 'btn--ghost', onClick: () => 'close' }]
        : [
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
    if (w.mapLocked) {
      U.toast('🔒 지도가 고정되어 있어요 · 잠금을 해제한 뒤 수정할 수 있어요', { icon: 'i-x', duration: 2400 });
      return;
    }
    if (MapView.state.host) {
      MapView.state.pinning = false;
      MapView.refresh();
    }
    const m = id ? w.map.markers.find((z) => z.id === id) : null;
    const kindItems = Object.keys(MapView.KINDS).map((k) => ({ value: k, label: MapView.KINDS[k].label }));
    let kind = m ? m.kind : 'city';
    let factionPick = null;
    let nationPick = null;
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
      '<div class="field"><span class="field__label">지배 국가 <span class="muted" style="font-size:10px">설정집 · 국가</span></span>' +
        '<div id="pin-nation"></div>' +
        '<span class="field-hint">설정집의 국가를 고르면 이 지역이 그 나라의 영토로 표시돼요. 비워 두면 무소속이에요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">세부 지배 세력 <span class="muted" style="font-size:10px">설정집 · 세력</span></span>' +
        '<div id="pin-faction"></div>' +
        '<span class="field-hint">국가 안의 세력까지 정하면 핀에 ⚑ 세력도 함께 보여요.</span>' +
      '</div>' +
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
        factionPick = buildLorePicker(body.querySelector('#pin-faction'), w, {
          category: 'faction', multi: false, noneLabel: '없음',
          ids: (m && m.factionId) ? [m.factionId] : [],
          legacy: (m && !m.factionId) ? (m.faction || '') : ''
        });
        nationPick = buildLorePicker(body.querySelector('#pin-nation'), w, {
          category: 'nation', multi: false, noneLabel: '무소속',
          ids: (m && m.nationId) ? [m.nationId] : [],
          legacy: ''
        });
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
        const natId = (nationPick && nationPick.ids()[0]) || null;
        const natItem = natId ? (w.lore || []).find((x) => x.id === natId && x.category === 'nation') : null;
        const facId = (factionPick && factionPick.ids()[0]) || null;
        const facItem = facId ? (w.lore || []).find((x) => x.id === facId) : null;
        const data = {
          name: name, kind: kind, x: px, y: py,
          climate: String(fd.get('climate') || '').trim(),
          nationId: natItem ? natItem.id : null,
          nation: natItem ? natItem.title : '',
          factionId: facItem ? facItem.id : null,
          faction: facItem ? facItem.title : ((factionPick && factionPick.legacy()) || '').trim(),
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
    const isRanks = App.filters.loreCat === RANKS_CAT;
    host.innerHTML =
      '<div class="section-head"><div><span class="eyebrow">Codex</span><h2>' +
        (isRanks ? '능력 · 등급 <span class="muted" style="font-size:12px" id="lore-count">' + (w.rankSystems || []).length + '</span>'
                 : '설정집 <span class="muted" style="font-size:12px" id="lore-count">' + w.lore.length + '</span>') +
      '</h2></div>' +
      '<button class="section-head__link" data-new-lore><svg width="14" height="14" style="display:inline;vertical-align:-2px"><use href="#i-plus"/></svg> ' +
        (isRanks ? '능력·등급' : '추가') + '</button></div>' +
      '<div class="toolbar"><label class="search"><svg><use href="#i-search"/></svg>' +
        '<input type="search" id="lore-search" placeholder="' + (isRanks ? '체계 이름 · 설명 · 단계 검색' : '제목 · 태그 · 본문 검색') + '" value="' + esc(App.filters.loreQuery) + '"></label></div>' +
      '<div class="chip-row" id="lore-cats">' +
        ['전체', RANKS_CAT].concat(Object.keys(CATS)).map((k) =>
          '<button class="chip chip--small' + (App.filters.loreCat === k ? ' chip--active' : '') + '" data-cat="' + esc(k) + '">' +
          esc(k === '전체' ? '전체' : (k === RANKS_CAT ? '⚔️ 능력·등급' : CATS[k])) + '</button>').join('') +
      '</div>' +
      '<div class="list" id="lore-list"></div>';

    drawLoreList();

    host.querySelector('[data-new-lore]').addEventListener('click', () => {
      if (App.filters.loreCat === RANKS_CAT) openRankForm(null, () => refreshView());
      // 지금 보고 있는 분류로 바로 새 항목을 연다(세력 탭 → 세력 폼)
      else openLoreForm(null, { category: App.filters.loreCat === '전체' ? 'rule' : App.filters.loreCat });
    });
    host.querySelector('#lore-search').addEventListener('input', (e) => {
      App.filters.loreQuery = e.target.value;
      drawLoreList();
    });
    bindHostOnce(host, 'lore', () => host.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        App.filters.loreCat = cat.dataset.cat;
        App.filters.loreQuery = '';
        renderLore();
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
      if (edit) { openLoreForm(edit.dataset.loreEdit); return; }
      const oc = e.target.closest('[data-open-char]');
      if (oc) { openCharacterDetail(oc.getAttribute('data-open-char')); return; }
      const or = e.target.closest('[data-open-region]');
      if (or) { openRegionDetail(or.getAttribute('data-open-region')); return; }
      const of = e.target.closest('[data-open-faction]');
      if (of) { openFactionDetail(of.getAttribute('data-open-faction')); }
    }));
  }

  /* 설정집 안의 '⚔️ 능력·등급' 섹션 — 목록·추가·편집을 여기서 바로 한다 */
  function drawRankSection(w, host) {
    const q = App.filters.loreQuery.trim().toLowerCase();
    const all = w.rankSystems || [];
    const list = all.filter((s) => {
      if (!q) return true;
      return [s.name, s.description, (s.tiers || []).join(' ')].join(' ').toLowerCase().indexOf(q) > -1;
    });
    const countEl = document.getElementById('lore-count');
    if (countEl) countEl.textContent = all.length;

    host.innerHTML =
      (all.length ? '' : '<div class="empty"><div class="empty__sigil">⚔️</div><h3>아직 능력·등급 체계가 없어요</h3>' +
        '<p>마법 서클, 기사단 계위, 모험가 랭크처럼<br>이 세계의 강함을 단계로 나눠 보세요.</p></div>') +
      (list.length
        ? '<div class="rank-sys-list">' + list.map((s) =>
            '<button type="button" class="rank-sys" data-rank-edit="' + esc(s.id) + '">' +
              '<span class="rank-sys__icon" style="--rank-color:' + esc(s.color) + '">' + RankIcon.render(s.icon) + '</span>' +
              '<span class="rank-sys__body">' +
                '<span class="rank-sys__name">' + esc(s.name) + '</span>' +
                (s.description ? '<span class="rank-sys__desc">' + esc(s.description) + '</span>' : '') +
                '<span class="rank-sys__meta">' + s.tiers.length + '단계 · ' + esc(s.tiers[0]) + ' ~ ' + esc(s.tiers[s.tiers.length - 1]) + ' · 인물 ' + rankUsedCount(w, s.id) + '명</span>' +
                '<span class="rank-sys__tiers">' + s.tiers.map((t) => '<span class="mini-chip">' + esc(t) + '</span>').join('') + '</span>' +
              '</span>' +
              '<span class="rank-sys__chev"><svg><use href="#i-edit"/></svg></span>' +
            '</button>').join('') + '</div>'
        : (all.length ? '<div class="empty"><div class="empty__sigil">✦</div><p>조건에 맞는 체계가 없어요.</p></div>' : '')) +
      '<button type="button" class="btn btn--gold btn--block mt-14" data-rank-new><svg><use href="#i-plus"/></svg><span>새 능력·등급 체계</span></button>' +
      '<p class="field-hint mt-8">설명·단계 수(1~15)·단계 이름을 정하면 인물 폼에서 [체계][단계]로 바로 골라 쓸 수 있어요.</p>';

    host.querySelectorAll('[data-rank-edit]').forEach((b) => b.addEventListener('click', () => {
      U.haptic(6);
      openRankForm(b.getAttribute('data-rank-edit'), () => refreshView());
    }));
    const add = host.querySelector('[data-rank-new]');
    if (add) add.addEventListener('click', () => {
      U.haptic(6);
      openRankForm(null, () => refreshView());
    });
  }

  /* 인물 · 지역처럼 설정집 밖 목록을 칩으로 고르는 작은 선택기 */
  function buildChipSelect(host, list, opts) {
    const o = opts || {};
    const noneLabel = o.noneLabel || '없음';
    let ids = Array.isArray(o.ids) ? o.ids.slice() : [];

    function draw() {
      host.innerHTML = '<div class="chip-row">' +
        '<button type="button" class="chip chip--small' + (!ids.length ? ' chip--active' : '') + '" data-pick="__none">' + esc(noneLabel) + '</button>' +
        (list || []).map((it) => '<button type="button" class="chip chip--small' + (ids.indexOf(it.id) > -1 ? ' chip--active' : '') +
          '" data-pick="' + esc(it.id) + '">' + esc(it.title) + '</button>').join('') +
        '</div>' +
        (!(list || []).length ? '<span class="field-hint">아직 고를 항목이 없어요.</span>' : '');
      host.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
        const v = b.getAttribute('data-pick');
        if (v === '__none') ids = [];
        else if (o.multi) {
          const i = ids.indexOf(v);
          if (i > -1) ids.splice(i, 1); else ids.push(v);
        } else {
          ids = ids[0] === v ? [] : [v];
        }
        U.haptic(6);
        draw();
        if (o.onChange) o.onChange(ids.slice());
      }));
    }
    draw();
    return { ids: () => ids.slice(), redraw: draw };
  }

  /* 설정집 항목 고르기 (종족·세력·능력·무기) — 설정집에 있는 것만 고를 수 있다 */
  function buildLorePicker(host, w, opts) {
    const o = opts || {};
    const category = o.category;
    const cats = (Array.isArray(o.categories) && o.categories.length) ? o.categories : [category];
    const noneLabel = o.noneLabel || '없음';
    let ids = Array.isArray(o.ids) ? o.ids.slice() : [];
    const legacy = o.legacy || '';
    let legacyOn = !!legacy && !ids.length;

    function items() {
      const list = (w.lore || []).filter((l) => cats.indexOf(l.category) > -1);
      // 국가를 먼저, 그다음 세력
      return list.sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category));
    }

    function draw() {
      const list = items();
      const short = legacy.length > 14 ? legacy.slice(0, 14) + '…' : legacy;
      host.innerHTML =
        '<div class="chip-row lore-pick">' +
          '<button type="button" class="chip chip--small lore-pick__none' + (!ids.length && !legacyOn ? ' chip--active' : '') + '" data-lore-pick="__none">' + esc(noneLabel) + '</button>' +
          list.map((l) => '<button type="button" class="chip chip--small' + (ids.indexOf(l.id) > -1 ? ' chip--active' : '') +
            '" data-lore-pick="' + esc(l.id) + '">' + esc(l.title) + '</button>').join('') +
          (legacy ? '<button type="button" class="chip chip--small' + (legacyOn ? ' chip--active' : '') +
            '" data-lore-pick="__legacy" title="' + esc(legacy) + '">' + esc(short) + '</button>' : '') +
        '</div>' +
        '<button type="button" class="lore-add" data-lore-new="' + esc(category) + '">' +
          '<svg><use href="#i-plus"/></svg>설정집에 새 항목 추가</button>' +
        (!list.length ? '<span class="field-hint">설정집에 아직 ' + esc(CATS[category] || '') + ' 항목이 없어요. 위 단추로 먼저 추가해 주세요.</span>' : '');

      host.querySelectorAll('[data-lore-pick]').forEach((b) => b.addEventListener('click', () => {
        const v = b.getAttribute('data-lore-pick');
        if (v === '__none') { ids = []; legacyOn = false; }
        else if (v === '__legacy') {
          legacyOn = !legacyOn;
          if (legacyOn && !o.multi) ids = [];
        } else if (o.multi) {
          const i = ids.indexOf(v);
          if (i > -1) ids.splice(i, 1); else ids.push(v);
          legacyOn = false;
        } else {
          ids = ids[0] === v ? [] : [v];
          legacyOn = false;
        }
        U.haptic(6);
        draw();
        if (o.onChange) o.onChange(ids.slice(), legacyOn);
      }));
      const add = host.querySelector('[data-lore-new]');
      if (add) add.addEventListener('click', () => {
        openLoreForm(null, {
          category: category,
          onSaved: (item) => {
            if (!item) return;
            if (o.multi) ids.push(item.id);
            else ids = [item.id];
            legacyOn = false;
            draw();
            if (o.onChange) o.onChange(ids.slice(), legacyOn);
          }
        });
      });
    }

    draw();
    return {
      ids: () => ids.slice(),
      legacy: () => (legacyOn ? legacy : ''),
      redraw: draw
    };
  }

  /* 국가의 주 종족 / 세력의 소속 국가 / 유물의 소지 인물·보관 지역 */
  function loreNationName(w, l) {
    const n = (w.lore || []).find((x) => x.id === l.nationId);
    return n ? n.title : '';
  }

  function itemHolders(w, l) {
    const ids = new Set();
    if (l.holderCharId) ids.add(l.holderCharId);
    (w.characters || []).forEach((c) => { if ((c.weaponIds || []).indexOf(l.id) > -1) ids.add(c.id); });
    return (w.characters || []).filter((c) => ids.has(c.id));
  }

  function itemLocation(w, l) {
    return (w.map.markers || []).find((m) => m.id === l.locationId) || null;
  }

  /* 세력의 주 종족 이름들 (설정집 raceIds → 종족 제목) */
  function loreRaceNames(w, l) {
    return ((l && l.raceIds) || []).map((id) => {
      const r = (w.lore || []).find((x) => x.id === id);
      return r ? r.title : '';
    }).filter(Boolean);
  }

  function drawLoreList() {
    const w = W();
    const host = $('#lore-list');
    if (!host) return;
    if (App.filters.loreCat === RANKS_CAT) { drawRankSection(w, host); return; }
    const q = App.filters.loreQuery.trim().toLowerCase();
    const list = w.lore.filter((l) => {
      if (App.filters.loreCat !== '전체' && l.category !== App.filters.loreCat) return false;
      if (!q) return true;
      return [l.title, l.body, (l.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) > -1;
    });
    if (!list.length) {
      host.innerHTML = w.lore.length
        ? '<div class="empty"><div class="empty__sigil">✦</div><p>조건에 맞는 설정이 없어요.</p></div>'
        : emptyBlock('설정집이 비어 있어요', '국가, 세력, 종족, 유물… 세계의 규칙을 적어 두세요.', 'add-lore', '첫 설정 쓰기');
      host.querySelectorAll('[data-act="add-lore"]').forEach((b) => b.addEventListener('click', () => openLoreForm(null)));
      return;
    }
    host.innerHTML = list.map((l) => {
      const open = !!App.openLore[l.id];
      const raceNames = l.category === 'nation' ? loreRaceNames(w, l) : [];
      const natName = l.category === 'faction' ? loreNationName(w, l) : '';
      const holders = l.category === 'item' ? itemHolders(w, l) : [];
      const loc = l.category === 'item' ? itemLocation(w, l) : null;
      const metaLine = raceNames.length ? raceNames.join(' · ')
        : (natName ? '⚑ ' + (natName || '무소속')
          : (l.category === 'item'
            ? [(holders.length ? holders.map((c) => c.name).join(', ') : '무소속'), loc ? loc.name : ''].filter(Boolean).join(' · ')
            : ''));
      return '<article class="lore-card' + (open ? ' is-open' : '') + '" data-lore="' + esc(l.id) + '">' +
        '<button type="button" class="lore-card__head" data-lore-head="' + esc(l.id) + '">' +
          '<span style="flex:1;min-width:0">' +
            '<span class="lore-card__cat">' + esc(CATS[l.category] || '기타') + '</span>' +
            '<span class="lore-card__title" style="display:block">' + esc(l.title) + '</span>' +
            (metaLine ? '<span class="lore-card__races">' + esc(metaLine) + '</span>' : '') +
          '</span>' +
          '<span class="lore-card__toggle"><svg><use href="#i-chev-down"/></svg></span>' +
        '</button>' +
        (open
          ? '<div class="lore-card__body">' + esc(l.body) +
            ((l.tags || []).length ? '<div class="tag-row">' + l.tags.map((t) => '<span class="mini-chip">#' + esc(t) + '</span>').join('') + '</div>' : '') +
            (l.category === 'nation' && raceNames.length ? '<div class="label-row"><span>주 종족</span></div><div class="mini-chips">' +
              raceNames.map((r) => '<span class="mini-chip mini-chip--race">' + esc(r) + '</span>').join('') + '</div>' : '') +
            (l.category === 'faction' ? '<div class="label-row"><span>소속 국가</span></div><div class="mini-chips">' +
              (natName ? '<button class="mini-chip mini-chip--faction" data-open-faction="' + esc(l.nationId) + '">⚑ ' + esc(natName) + '</button>'
                : '<span class="mini-chip">무소속</span>') + '</div>' : '') +
            (l.category === 'item' ? '<div class="label-row"><span>소지 · 보관</span></div><div class="mini-chips">' +
              (holders.length ? holders.map((c) => '<button class="mini-chip" data-open-char="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('')
                : '<span class="mini-chip">무소속</span>') +
              (loc ? '<button class="mini-chip" data-open-region="' + esc(loc.id) + '">📍 ' + esc(loc.name) + '</button>' : '') + '</div>' : '') +
            '<div class="btn-row mt-14"><button class="btn btn--sm" data-lore-edit="' + esc(l.id) + '"><svg><use href="#i-edit"/></svg>수정</button></div>' +
            '</div>'
          : '') +
      '</article>';
    }).join('');
  }

  function openLoreForm(id, opts) {
    const o = opts || {};
    const w = W();
    const l = id ? w.lore.find((x) => x.id === id) : null;
    let category = l ? l.category : (o.category || 'rule');
    let racePick = null, nationPick = null, holderPick = null, locPick = null;
    const cats = Object.keys(CATS).map((k) => ({ value: k, label: CATS[k] }));
    const html =
      '<div class="field"><span class="field__label">분류</span><div id="lore-cat-pick"></div></div>' +
      '<div class="field" id="lore-race-field" style="display:none">' +
        '<span class="field__label">주 종족 <span class="muted" style="font-size:10px">설정집 · 종족·몬스터</span></span>' +
        '<div id="lore-races"></div>' +
        '<span class="field-hint">이 국가를 이루는 종족이에요. 여러 종족을 고를 수 있고, 국가 카드 · 관계도에 함께 보여요.</span>' +
      '</div>' +
      '<div class="field" id="lore-nation-field" style="display:none">' +
        '<span class="field__label">소속 국가 <span class="muted" style="font-size:10px">설정집 · 국가</span></span>' +
        '<div id="lore-nations"></div>' +
        '<span class="field-hint">이 세력이 속한 국가예요. 기본은 <b>무소속</b>이고, 관계도 노드에 소속 국가가 표시돼요.</span>' +
      '</div>' +
      '<div class="field" id="lore-holder-field" style="display:none">' +
        '<span class="field__label">소지 인물 <span class="muted" style="font-size:10px">인물</span></span>' +
        '<div id="lore-holder"></div>' +
        '<span class="field-hint">이 유물을 가진 인물이에요. 인물 폼에서 무기로 연결한 인물도 함께 표시돼요.</span>' +
      '</div>' +
      '<div class="field" id="lore-loc-field" style="display:none">' +
        '<span class="field__label">보관 지역 <span class="muted" style="font-size:10px">지도 · 지역 핀</span></span>' +
        '<div id="lore-loc"></div>' +
        '<span class="field-hint">이 유물이 있는 지역이에요. 지도 핀 상세에서 바로 이동할 수 있어요.</span>' +
      '</div>' +
      U.field('제목', '<div class="input-with-action">' +
        '<input class="input" name="title" required placeholder="' + esc(category === 'race' ? '예: 엘프' : (category === 'faction' ? '예: 서약 기사단' : (category === 'item' ? '예: 서리검 「글라시엘」' : '예: 봉인술'))) + '" value="' + esc(l ? l.title : '') + '">' +
        '<button type="button" class="mini-action" id="gen-lore-title"><svg><use href="#i-sparkles"/></svg>이름 추천</button>' +
      '</div>', '✨ 버튼을 누르면 고른 분류에 어울리는 이름 8개를 추천해요.', true) +
      U.field('내용', U.textArea('body', l ? l.body : '', '규칙, 원리, 대가, 예외…', 7)) +
      U.field('태그', U.textInput('tags', l ? (l.tags || []).join(', ') : '', { placeholder: '봉인, 이름, 성소 (쉼표로 구분)' }));

    formSheet({
      eyebrow: l ? 'EDIT CODEX' : 'NEW CODEX',
      title: l ? '설정 수정' : '새 설정',
      full: true,
      html: html,
      onReady: ({ body, form }) => {
        const raceField = body.querySelector('#lore-race-field');
        const nationField = body.querySelector('#lore-nation-field');
        const holderField = body.querySelector('#lore-holder-field');
        const locField = body.querySelector('#lore-loc-field');

        racePick = buildLorePicker(body.querySelector('#lore-races'), w, {
          category: 'race', multi: true,
          ids: (l && Array.isArray(l.raceIds)) ? l.raceIds : []
        });
        nationPick = buildLorePicker(body.querySelector('#lore-nations'), w, {
          category: 'nation', multi: false, noneLabel: '무소속',
          ids: (l && l.nationId) ? [l.nationId] : []
        });
        holderPick = buildChipSelect(body.querySelector('#lore-holder'), (w.characters || []).map((c) => ({ id: c.id, title: c.name })), {
          ids: (l && l.holderCharId) ? [l.holderCharId] : [], noneLabel: '없음'
        });
        locPick = buildChipSelect(body.querySelector('#lore-loc'), (w.map.markers || []).map((m) => ({ id: m.id, title: m.name })), {
          ids: (l && l.locationId) ? [l.locationId] : [], noneLabel: '없음'
        });

        function syncCategoryFields() {
          if (raceField) raceField.style.display = category === 'nation' ? '' : 'none';
          if (nationField) nationField.style.display = category === 'faction' ? '' : 'none';
          if (holderField) holderField.style.display = category === 'item' ? '' : 'none';
          if (locField) locField.style.display = category === 'item' ? '' : 'none';
        }
        body.querySelector('#lore-cat-pick').appendChild(U.chipPicker(cats, category, {
          multi: false,
          onChange: (v) => { category = v; syncCategoryFields(); }
        }));
        syncCategoryFields();
        const genTitle = body.querySelector('#gen-lore-title');
        if (genTitle) genTitle.addEventListener('click', () => {
          Generator.open({
            mode: 'lore',
            category: category,
            contextLabel: '마음에 드는 이름을 제목 칸에 넣어요',
            onPick: (item) => {
              const el = form.querySelector('[name="title"]');
              if (el) el.value = item.name;
              U.toast('이름을 넣었어요 · ' + item.name, { icon: 'i-sparkles' });
            }
          });
        });
        if (l) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>설정 삭제';
          del.addEventListener('click', async () => {
            const users = (w.characters || []).filter((c) => c.raceId === l.id || c.factionId === l.id ||
              (c.abilityIds || []).indexOf(l.id) > -1 || (c.weaponIds || []).indexOf(l.id) > -1).length;
            const ok = await U.confirmSheet({
              title: '설정을 삭제할까요?',
              message: l.title + (users ? '\n이 항목을 쓰는 인물 ' + users + '명의 연결도 함께 풀립니다.' : ''),
              confirmText: '삭제', danger: true
            });
            if (!ok) return;
            w.lore = w.lore.filter((x) => x.id !== id);
            Store.syncLoreLinks(w);   // 이름·연결을 다른 화면과 맞춘다
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
        // 국가 → 주 종족 / 세력 → 소속 국가 / 아이템 → 소지 인물 · 보관 지역
        if (category === 'nation') {
          const raceIds = racePick.ids().filter((id) => (w.lore || []).some((x) => x.id === id && x.category === 'race'));
          data.raceIds = raceIds.filter((id, i, arr) => arr.indexOf(id) === i);
        } else if (l && l.raceIds) {
          delete l.raceIds;
        }
        if (category === 'faction') {
          const nid = (nationPick.ids()[0]) || null;
          data.nationId = (nid && (w.lore || []).some((x) => x.id === nid && x.category === 'nation')) ? nid : null;
        } else if (l && 'nationId' in l) {
          delete l.nationId;
        }
        if (category === 'item') {
          const hid = (holderPick.ids()[0]) || null;
          const lid = (locPick.ids()[0]) || null;
          data.holderCharId = (hid && (w.characters || []).some((c) => c.id === hid)) ? hid : null;
          data.locationId = (lid && (w.map.markers || []).some((m) => m.id === lid)) ? lid : null;
        } else if (l) {
          delete l.holderCharId;
          delete l.locationId;
        }
        let saved = null;
        if (l) { Object.assign(l, data); saved = l; }
        else { saved = Object.assign({ id: U.uid('l') }, data); w.lore.push(saved); }
        Store.syncLoreLinks(w);   // 제목이 바뀌면 이 항목을 가리키는 인물 표시도 같이 바뀐다
        touch({ immediate: true });
        refreshView();
        U.toast(l ? '설정을 수정했어요' : '설정을 추가했어요');
        if (o.onSaved) o.onSaved(saved);
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
          return '<div class="world-row">' +
            '<button class="row-card" data-world="' + esc(x.id) + '" style="' + (active ? 'border-color:var(--line-strong)' : '') + '">' +
              '<span class="row-card__badge">' + (active ? '✦' : '') + '</span>' +
              '<span class="row-card__body"><span class="row-card__title">' + esc(x.name) + '</span>' +
              '<span class="row-card__meta">' + esc(x.era || '') + ' · 인물 ' + x.characters.length + ' · 사건 ' + x.events.length + '</span></span>' +
              (active ? '<span class="status status--done">사용 중</span>' : '<span class="row-card__chev"><svg><use href="#i-chev-right"/></svg></span>') +
            '</button>' +
            '<button type="button" class="world-del" data-world-del="' + esc(x.id) + '" aria-label="' + esc(x.name) + ' 삭제">' +
              '<svg><use href="#i-trash"/></svg></button>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="btn-row mt-14">' +
          '<button class="btn" data-worlds-act="new"><svg><use href="#i-plus"/></svg>새 세계관</button>' +
          '<button class="btn" data-worlds-act="edit"><svg><use href="#i-edit"/></svg>현재 편집</button>' +
        '</div>' +
        '<button class="btn btn--ghost btn--block mt-8" data-worlds-act="sample"><svg><use href="#i-compass"/></svg>샘플 세계관 추가</button>';
      body.querySelectorAll('[data-world]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.world === App.state.activeId) { sheet.close(); return; }
        App.state.activeId = b.dataset.world;
        App.filters = { charQuery: '', charFaction: '전체', charRace: '전체', charRank: '', loreQuery: '', loreCat: '전체', epStatus: '전체', tlEra: '전체', relMode: 'char' };
        touch({ immediate: true });
        sheet.close();
        Graph.destroy();
        MapView.destroy();
        renderCurrent();
        U.toast(W().name + ' 세계관으로 전환');
      }));
      body.querySelectorAll('[data-world-del]').forEach((b) => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = b.getAttribute('data-world-del');
        const gone = await deleteWorld(id);
        if (gone) draw();
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

  /* 세계관 삭제 — 확인창에 규모를 보여 주고, 마지막 하나까지 지우면 빈 새 세계관으로 넘긴다 */
  async function deleteWorld(id) {
    const w = App.state.worlds.find((x) => x.id === id);
    if (!w) return false;
    const ok = await U.confirmSheet({
      title: '세계관을 삭제할까요?',
      message: '「' + w.name + '」\n인물 ' + (w.characters || []).length + '명 · 사건 ' + (w.events || []).length + '건 · 에피소드 ' +
        (w.episodes || []).length + '편 · 지역 ' + (((w.map || {}).markers) || []).length + '곳\n삭제하면 되돌릴 수 없어요.',
      confirmText: '삭제',
      danger: true
    });
    if (!ok) return false;

    const wasActive = App.state.activeId === id;
    App.state.worlds = App.state.worlds.filter((x) => x.id !== id);
    let recreated = false;
    if (!App.state.worlds.length) {
      // 마지막 세계관까지 지웠다면 앱이 비지 않도록 빈 새 세계관을 만든다
      const fresh = Store.normalizeWorld({
        id: U.uid('w'),
        name: '새 세계관',
        tagline: '',
        era: '',
        description: '',
        characters: [], relations: [], events: [], lore: [], episodes: [],
        rankSystems: [],
        map: { kind: 'sample', image: null, imageOriginal: null, style: 'parchment', markers: [], terrainStamps: [], ratio: 3 / 4 }
      });
      App.state.worlds.push(fresh);
      App.state.activeId = fresh.id;
      recreated = true;
    } else if (wasActive) {
      App.state.activeId = App.state.worlds[0].id;
    }
    App.filters = { charQuery: '', charFaction: '전체', charRace: '전체', charRank: '', loreQuery: '', loreCat: '전체', epStatus: '전체', tlEra: '전체', relMode: 'char' };
    touch({ immediate: true });
    Graph.destroy();
    MapView.destroy();
    renderCurrent();
    U.toast(recreated ? '마지막 세계관을 지워 새 세계관으로 시작해요' : '세계관을 삭제했어요', { icon: 'i-trash' });
    return true;
  }

  function openWorldForm(id) {
    const w = id ? App.state.worlds.find((x) => x.id === id) : null;
    const html =
      U.field('세계관 이름', U.textInput('name', w ? w.name : '', { placeholder: '예: 아르카디아 연대기' }), null, true) +
      U.field('한 줄 소개', U.textInput('tagline', w ? w.tagline : '', { placeholder: '잿빛 왕관이 부서진 뒤…' })) +
      U.field('현재 시대 표기', U.textInput('era', w ? w.era : '', { placeholder: '제3기 104년' })) +
      '<div class="field--slim">' +
        U.field('대표 역법', U.textInput('eraPrefix', w ? (w.eraPrefix || '') : '', { placeholder: '제국력 · 성력 · 제3기' }), '연표 사건에 자동으로 붙는 시대명이에요.') +
        U.field('현재 연도', U.textInput('eraYear', w ? String(w.eraYear || 0) : '0', { type: 'number', inputmode: 'numeric' })) +
      '</div>' +
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
      onReady: ({ form, sheet }) => {
        if (w) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'btn btn--danger btn--block mt-14';
          del.innerHTML = '<svg><use href="#i-trash"/></svg>세계관 삭제';
          del.addEventListener('click', async () => {
            const gone = await deleteWorld(w.id);
            if (gone) sheet.close();
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
          eraPrefix: String(fd.get('eraPrefix') || '').trim(),
          eraYear: Math.round(Number(fd.get('eraYear')) || 0),
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

  // 인물 폼 안의 등급 선택기 — [체계] [단계] 를 한 줄에 나란히, 능력은 행으로 추가
  function drawRankPicker(host, w, rows, sel, onManage) {
    const systems = w.rankSystems || [];
    if (!systems.length) {
      host.innerHTML = '<div class="rank-empty">' +
        '<p class="field-hint">아직 등록된 등급 체계가 없어요. 마법 서클·기사단 계위 같은 체계를 먼저 만들어 주세요.</p>' +
        '<button type="button" class="btn btn--sm" data-rank-manage><svg><use href="#i-plus"/></svg><span>등급 체계 만들기</span></button>' +
      '</div>';
      host.querySelectorAll('[data-rank-manage]').forEach((b) => b.addEventListener('click', () => { if (onManage) onManage(); }));
      return;
    }
    if (!Array.isArray(rows)) rows = [];

    const sync = () => {
      sel.clear();
      rows.forEach((r) => { if (r && r.systemId) sel.set(r.systemId, r.tier); });
    };

    if (!rows.length) {
      // 새 인물은 기본이 '없음' — [능력 추가]로만 고른다
      host.innerHTML = '<p class="field-hint rank-empty-hint">아직 고른 등급이 없어요. 아래 [능력 추가]로 체계와 단계를 고르세요.</p>' +
        '<div class="rank-actions">' +
          '<button type="button" class="btn btn--sm" data-rank-add><svg><use href="#i-plus"/></svg><span>능력 추가</span></button>' +
          '<button type="button" class="btn btn--sm btn--ghost" data-rank-manage><svg><use href="#i-shield"/></svg><span>체계 관리</span></button>' +
        '</div>';
      sync();
      host.querySelector('[data-rank-add]').addEventListener('click', () => {
        rows.push({ systemId: systems[0].id, tier: 0 });
        U.haptic(8);
        drawRankPicker(host, w, rows, sel, onManage);
      });
      host.querySelectorAll('[data-rank-manage]').forEach((b) => b.addEventListener('click', () => { if (onManage) onManage(); }));
      return;
    }

    host.innerHTML = rows.map((row, i) => {
      const sys = systems.find((s) => s.id === row.systemId) || systems[0];
      const tier = (typeof row.tier === 'number' && row.tier >= 0 && row.tier < sys.tiers.length) ? row.tier : 0;
      row.systemId = sys.id;
      row.tier = tier;
      return '<div class="rank-row" data-rank-row="' + i + '">' +
        '<div class="rank-row__picks">' +
          '<label class="rank-row__cell rank-row__cell--sys">' +
            '<span class="rank-row__label">체계</span>' +
            '<select class="select" data-row-sys="' + i + '" aria-label="능력·등급 체계">' +
              systems.map((s) => '<option value="' + esc(s.id) + '"' + (s.id === sys.id ? ' selected' : '') + '>' +
                esc(RankIcon.text(s.icon) + ' ' + s.name) + '</option>').join('') +
            '</select>' +
          '</label>' +
          '<label class="rank-row__cell rank-row__cell--tier">' +
            '<span class="rank-row__label">단계</span>' +
            '<select class="select" data-row-tier="' + i + '" aria-label="' + esc(sys.name) + ' 단계">' +
              sys.tiers.map((t, ti) => '<option value="' + ti + '"' + (ti === tier ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
            '</select>' +
          '</label>' +
          '<button type="button" class="rank-row__del" data-row-del="' + i + '" aria-label="이 능력 빼기"><svg><use href="#i-x"/></svg></button>' +
        '</div>' +
        (sys.description ? '<p class="rank-row__desc">' + esc(sys.description) + '</p>' : '') +
      '</div>';
    }).join('') +
      '<div class="rank-actions">' +
        '<button type="button" class="btn btn--sm btn--ghost" data-rank-add><svg><use href="#i-plus"/></svg><span>능력 추가</span></button>' +
        '<button type="button" class="btn btn--sm btn--ghost" data-rank-manage><svg><use href="#i-shield"/></svg><span>체계 관리</span></button>' +
      '</div>';

    sync();

    function repaint() { drawRankPicker(host, w, rows, sel, onManage); }

    host.querySelectorAll('[data-row-sys]').forEach((el) => el.addEventListener('change', () => {
      const i = Number(el.getAttribute('data-row-sys'));
      rows[i].systemId = el.value;
      rows[i].tier = 0;
      U.haptic(6);
      repaint();
    }));
    host.querySelectorAll('[data-row-tier]').forEach((el) => el.addEventListener('change', () => {
      const i = Number(el.getAttribute('data-row-tier'));
      rows[i].tier = Number(el.value) || 0;
      sync();
      U.haptic(6);
    }));
    host.querySelectorAll('[data-row-del]').forEach((b) => b.addEventListener('click', () => {
      rows.splice(Number(b.getAttribute('data-row-del')), 1);
      U.haptic(6);
      repaint();
    }));
    const add = host.querySelector('[data-rank-add]');
    if (add) add.addEventListener('click', () => {
      const used = new Set(rows.map((r) => r.systemId));
      const free = systems.find((s) => !used.has(s.id)) || systems[0];
      rows.push({ systemId: free.id, tier: 0 });
      U.haptic(8);
      repaint();
    });
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
                '<span class="rank-sys__icon" style="--rank-color:' + esc(s.color) + '">' + RankIcon.render(s.icon) + '</span>' +
                '<span class="rank-sys__body">' +
                  '<span class="rank-sys__name">' + esc(s.name) + '</span>' +
                  (s.description ? '<span class="rank-sys__desc">' + esc(s.description) + '</span>' : '') +
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

  /* ---------------------------------------------------------
     + 아이콘 만들기 — 설명 한 줄 → 인라인 SVG 문장
     --------------------------------------------------------- */
  const ICON_EXAMPLES = ['푸른 얼음 검', '황금 용의 왕관', '검은 달과 촛불', '붉은 번개', '육각 마법진', '철의 사슬'];

  function openIconForge(startIcon, onPick) {
    const body = document.createElement('div');
    let sheet = null;
    let seed = (Date.now() % 900000) + 17;
    let made = null;
    const initial = (startIcon && RankIcon.isCustom(startIcon)) ? RankIcon.name(startIcon) : '';

    body.innerHTML =
      '<p class="prose small" style="margin-bottom:14px">하고 싶은 문장을 한 줄로 적으면 <b>모티브 · 색 · 외곽 틀</b>을 읽어 인라인 SVG 문장으로 그려요.</p>' +
      '<div class="field"><span class="field__label">설명</span>' +
        '<input class="input" id="forge-desc" maxlength="40" autocomplete="off" placeholder="예: 푸른 얼음 검" value="' + esc(initial) + '">' +
        '<div class="chip-row mt-8" id="forge-ex" style="flex-wrap:wrap">' +
          ICON_EXAMPLES.map((e) => '<button type="button" class="chip chip--small" data-ex="' + esc(e) + '">' + esc(e) + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<button type="button" class="btn btn--gold btn--block" id="forge-make"><svg><use href="#i-sparkles"/></svg><span>아이콘 생성</span></button>' +
      '<div class="forge-stage">' +
        '<div class="forge-preview" id="forge-preview"><span class="muted" style="font-size:26px">✦</span></div>' +
        '<div class="forge-meta"><b id="forge-name">설명을 적고 [아이콘 생성]</b>' +
          '<span id="forge-detail">마법진 · 검 · 방패 · 불꽃 · 왕관, 금·청·적·자·녹·흑·백, 원형 룬 · 방패형 · 육각 마법진</span></div>' +
      '</div>' +
      '<div class="btn-row mt-8">' +
        '<button type="button" class="btn btn--sm btn--ghost" id="forge-again" disabled>다시 생성</button>' +
        '<button type="button" class="btn btn--sm btn--gold" id="forge-use" disabled>이 아이콘 쓰기</button>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="field"><span class="field__label">이모지 · 글자로 직접</span>' +
        '<div class="input-with-action">' +
          '<input class="input" id="forge-manual" maxlength="8" placeholder="예: ⚔ 또는 天" autocomplete="off">' +
          '<button type="button" class="mini-action" id="forge-manual-use">적용</button>' +
        '</div>' +
        '<span class="field-hint">직접 넣은 글자·이모지는 그대로 아이콘이 돼요.</span>' +
      '</div>';

    const descEl = body.querySelector('#forge-desc');
    const previewEl = body.querySelector('#forge-preview');
    const nameEl = body.querySelector('#forge-name');
    const detailEl = body.querySelector('#forge-detail');
    const againBtn = body.querySelector('#forge-again');
    const useBtn = body.querySelector('#forge-use');

    function generate(bump) {
      const desc = String(descEl.value || '').trim();
      if (!desc) { U.toast('설명을 먼저 적어 주세요', { icon: 'i-x' }); descEl.focus(); return; }
      if (bump) seed = (seed * 7919 + 13) % 900000;
      let r = null;
      try { r = RankIcon.build(desc, seed); } catch (e) { r = null; }
      if (!r) { U.toast('아이콘을 만들지 못했어요. 다른 낱말로 해 보세요.', { icon: 'i-x' }); return; }
      made = r;
      previewEl.innerHTML = RankIcon.render(r.value);
      nameEl.textContent = RankIcon.name(r.value);
      detailEl.textContent = r.summary;
      againBtn.disabled = false;
      useBtn.disabled = false;
      U.haptic(8);
    }

    function apply(value, message) {
      if (!value) return;
      if (onPick) onPick(value);
      if (sheet) sheet.close();
      U.toast(message || '아이콘을 적용했어요', { icon: 'i-sparkles' });
    }

    body.querySelector('#forge-make').addEventListener('click', () => generate(false));
    againBtn.addEventListener('click', () => generate(true));
    useBtn.addEventListener('click', () => { if (made) apply(made.value, '아이콘을 만들었어요'); });
    body.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => {
      descEl.value = b.getAttribute('data-ex');
      U.haptic(6);
      generate(false);
    }));
    descEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); generate(false); } });
    const manualEl = body.querySelector('#forge-manual');
    body.querySelector('#forge-manual-use').addEventListener('click', () => {
      const v = Array.from(String(manualEl.value || '').trim()).slice(0, 4).join('');
      if (!v) { U.toast('글자나 이모지를 넣어 주세요', { icon: 'i-x' }); return; }
      apply(v, '아이콘을 적용했어요');
    });

    sheet = U.openSheet({
      eyebrow: 'ICON FORGE',
      title: '+ 아이콘 만들기',
      sub: '설명만 적으면 이 세계관의 문장이 됩니다.',
      full: true,
      body: body
    });
    if (initial) generate(false);
    else descEl.focus();
  }

  function openRankForm(id, onDone) {
    const w = W();
    if (!w) return;
    const sys = id ? (w.rankSystems || []).find((s) => s.id === id) : null;
    let color = sys ? sys.color : RANK_COLORS[0];
    let icon = sys ? (sys.icon || '⚔️') : '⚔️';

    const html =
      U.field('체계 이름', '<div class="input-with-action">' +
        '<input class="input" name="name" required placeholder="예: 마법 서클 · 검사 계위 · 모험가 랭크" value="' + esc(sys ? sys.name : '') + '">' +
        '<button type="button" class="mini-action" id="gen-rank-name"><svg><use href="#i-sparkles"/></svg>이름 추천</button>' +
      '</div>', '세계관마다 여러 체계를 만들 수 있어요. ✨ 로 이름을 뽑을 수도 있어요.', true) +
      U.field('설명', U.textInput('description', sys ? (sys.description || '') : '', { placeholder: '예: 마나를 다루는 마법사의 경지' }), '인물 폼에서 체계를 고를 때 이 한 줄이 함께 보여요.') +
      '<div class="field"><span class="field__label">아이콘' +
          '<span class="icon-now"><span class="icon-now__badge" id="icon-now-badge"></span><b id="icon-now"></b></span>' +
        '</span>' +
        '<div class="icon-row" id="icon-row"></div>' +
        '<input type="hidden" name="icon" id="icon-value" value="' + esc(icon) + '">' +
        '<span class="field-hint">아이콘을 탭하면 바로 바뀌어요. 원하는 게 없으면 <b>+ 아이콘 만들기</b>에 &lsquo;푸른 얼음 검&rsquo;처럼 적어 보세요.</span>' +
      '</div>' +
      '<div class="field"><span class="field__label">색상</span><div class="rank-colors" id="rank-colors"></div>' +
        '<input type="hidden" name="color" value="' + esc(color) + '"></div>' +
      '<div class="field"><span class="field__label">단계 <b>*</b></span>' +
        '<div class="rank-stepper">' +
          '<button type="button" class="rstep" data-tier-step="-1" aria-label="단계 줄이기">−</button>' +
          '<div class="rank-stepper__value"><b data-tier-count>9</b><span>단계</span></div>' +
          '<button type="button" class="rstep" data-tier-step="1" aria-label="단계 늘리기">+</button>' +
          '<label class="rank-unit"><span>단위</span>' +
            '<input class="input" id="tier-prefix" placeholder="예: 서클" value="' + esc(guessTierSuffix(sys)) + '" aria-label="단계 단위"></label>' +
        '</div>' +
        '<input type="range" class="rank-range" id="tier-range" min="1" max="15" step="1" value="9" aria-label="단계 수">' +
        '<span class="field-hint">1~15단계 사이에서 고르면 아래 칸이 바로 그만큼 펼쳐져요. 이름을 비우면 <b>1단계 · 1서클</b>처럼 숫자로 자동 저장됩니다.</span>' +
        '<div class="rank-tiers" id="rank-tiers"></div>' +
      '</div>' +
      (sys ? '<button type="button" class="btn btn--danger btn--block mt-8" id="rank-delete"><svg><use href="#i-trash"/></svg><span>체계 삭제</span></button>' : '');

    formSheet({
      eyebrow: sys ? 'EDIT TIER' : 'NEW TIER',
      title: sys ? '등급 체계 수정' : '새 등급 체계',
      sub: '이름과 단계만 정하면 인물에 바로 붙일 수 있어요.',
      full: true,
      html: html,
      onReady: ({ body, form, sheet }) => {
        const genRankName = body.querySelector('#gen-rank-name');
        if (genRankName) genRankName.addEventListener('click', () => {
          Generator.open({
            mode: 'lore',
            category: 'rank',
            contextLabel: '마음에 드는 이름을 체계 이름 칸에 넣어요',
            onPick: (item) => {
              const el = form.querySelector('[name="name"]');
              if (el) el.value = item.name;
              U.toast('이름을 넣었어요 · ' + item.name, { icon: 'i-sparkles' });
            }
          });
        });

        const prefixInput = body.querySelector('#tier-prefix');
        const countOut = body.querySelector('[data-tier-count]');
        const range = body.querySelector('#tier-range');
        let count = U.clamp(sys ? sys.tiers.length : 9, 1, 15);

        function suffix() { return String(prefixInput.value || '').trim(); }
        function defaultName(no) { return no + (suffix() || '단계'); }

        function readTiers() {
          return U.$$('#rank-tiers [name="tier"]', body).map((el) => el.value);
        }

        function drawTiers(list) {
          const host = body.querySelector('#rank-tiers');
          host.innerHTML = list.map((t, i) =>
            '<div class="rank-tier-row">' +
              '<span class="rank-tier-no">' + (i + 1) + '</span>' +
              '<input class="input" name="tier" value="' + esc(t) + '" placeholder="' + esc(defaultName(i + 1) + ' (비우면 숫자 유지)') + '" aria-label="' + (i + 1) + '단계 이름">' +
            '</div>').join('');
        }

        function syncCount() {
          count = U.clamp(Math.round(count) || 1, 1, 15);
          countOut.textContent = count;
          range.value = count;
        }

        // 단계 수를 바꾸면 칸이 바로 그 개수만큼 펼쳐지고, 이미 쓴 이름은 자리를 지킨다.
        function resize(next) {
          const keep = readTiers();
          count = U.clamp(Math.round(next) || 1, 1, 15);
          const out = [];
          for (let i = 0; i < count; i++) out.push(i < keep.length ? keep[i] : '');
          syncCount();
          drawTiers(out);
        }

        function refreshPlaceholders() {
          U.$$('#rank-tiers .rank-tier-row', body).forEach((row, i) => {
            const input = row.querySelector('input');
            if (input) input.placeholder = defaultName(i + 1) + ' (비우면 숫자 유지)';
          });
        }

        // 새 체계는 이름 칸이 처음부터 count개 펼쳐져 있어야 한다(비우면 1단계·2단계로 저장)
        drawTiers((sys ? sys.tiers : new Array(count).fill('')).slice(0, count));
        syncCount();

        body.querySelectorAll('[data-tier-step]').forEach((b) => b.addEventListener('click', () => {
          resize(count + Number(b.getAttribute('data-tier-step')));
          U.haptic(8);
        }));
        range.addEventListener('input', () => resize(Number(range.value)));
        prefixInput.addEventListener('input', refreshPlaceholders);

        // --- 아이콘: 기본 5종 + [+ 아이콘 만들기] ---
        const iconInput = body.querySelector('#icon-value');
        const iconRow = body.querySelector('#icon-row');
        const iconNameOut = body.querySelector('#icon-now');
        const iconBadge = body.querySelector('#icon-now-badge');

        function paintIcons() {
          const cur = iconInput.value;
          icon = cur;
          iconRow.innerHTML =
            RankIcon.pack().map((p) =>
              '<button type="button" class="icon-cell' + (p.value === cur ? ' is-on' : '') + '" data-icon-pick="' + esc(p.value) + '" aria-label="기본 아이콘 ' + esc(p.label) + '" aria-pressed="' + (p.value === cur) + '">' +
                RankIcon.render(p.value) + '</button>').join('') +
            '<button type="button" class="icon-forge" id="icon-forge"><svg><use href="#i-sparkles"/></svg><span>+ 아이콘 만들기</span></button>';
          iconBadge.innerHTML = RankIcon.render(cur);
          iconNameOut.textContent = RankIcon.name(cur);
          iconRow.querySelectorAll('[data-icon-pick]').forEach((b) => b.addEventListener('click', () => {
            iconInput.value = b.getAttribute('data-icon-pick');
            U.haptic(6);
            paintIcons();
          }));
          const forge = iconRow.querySelector('#icon-forge');
          if (forge) forge.addEventListener('click', () => {
            U.haptic(6);
            openIconForge(cur, (picked) => {
              iconInput.value = picked;
              paintIcons();
            });
          });
        }
        paintIcons();

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
        const unit = String((body.querySelector('#tier-prefix') || {}).value || '').trim();
        // 비워 둔 칸은 숫자(1단계 / 1서클)로 자동 채운다
        const tiers = U.$$('#rank-tiers [name="tier"]', body).map((el, i) => {
          const v = String(el.value || '').trim();
          return v || ((i + 1) + (unit || '단계'));
        });
        if (!tiers.length) { U.toast('단계를 하나 이상 만들어 주세요', { icon: 'i-x' }); return false; }
        const iconRaw = String(fd.get('icon') || '').trim() || icon || '⚔️';
        const iconVal = RankIcon.isCustom(iconRaw) ? iconRaw : (Array.from(iconRaw).slice(0, 4).join('') || '⚔️');
        const description = String(fd.get('description') || '').trim().slice(0, 80);
        const data = { name: name, icon: iconVal, color: color, tiers: tiers, description: description };
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
        '<div class="def"><dt>버전</dt><dd>아르카눔 v1.4.1 · PWA</dd></div>' +
        '<div class="def"><dt>저장</dt><dd>' + (Store.isDbBroken() ? 'localStorage (자동 저장)' : 'IndexedDB + localStorage 이중 저장') + '</dd></div>' +
        '<div class="def"><dt>오프라인</dt><dd>홈 화면에 추가하면 인터넷 없이도 열립니다.</dd></div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:18px">' +
        '<button class="btn" id="btn-hard-refresh" style="width:100%">🔄 최신 버전으로 새로고침</button>' +
      '</div>' +
      '<p class="center muted small" style="margin-top:8px">캐시만 비우고 다시 엽니다 · 세계관 데이터는 그대로 남습니다</p>';

    const sheet = U.openSheet({ eyebrow: 'MORE', title: '더보기', body: body, full: true });
    const hardBtn = body.querySelector('#btn-hard-refresh');
    if (hardBtn) hardBtn.addEventListener('click', () => { sheet.close(); hardRefresh(); });
    body.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.more;
      sheet.close();
      if (act === 'lore') go('lore');
      else if (act === 'episodes') go('episodes');
      else if (act === 'story') { go('map'); setTimeout(() => MapView.setStory(true), 80); }
      else if (act === 'gen') setTimeout(() => Generator.open({}), 120);
      else if (act === 'ranks') { App.filters.loreCat = RANKS_CAT; App.filters.loreQuery = ''; go('lore'); }
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

  // 기본은 날짜 없는 고정 파일명 → 같은 폴더에 저장할 때 iOS가 '대치'를 물어본다
  function backupFileName(includeDate) {
    const safe = backupFolderName().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const base = (safe || '세계_만들기') + '_아르카눔_백업';
    if (!includeDate) return base + '.json';
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return base + '_' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
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
  async function exportBackup(forceDownload, includeDate) {
    const name = backupFileName(includeDate);
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
          // files만 넘긴다 — title/text를 함께 넘기면 iOS가 '텍스트 (n바이트)' 파일을 하나 더 저장한다
          await navigator.share({ files: [file] });
          U.toast('[파일에 저장] → ' + folder + ' 폴더 · 같은 이름이 있으면 [대치]를 누르세요', { icon: 'i-download', duration: 3800 });
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
    U.toast('백업 파일을 내보냈어요 · 같은 이름이면 [대치]로 덮어쓰세요', { icon: 'i-download', duration: 3200 });
    return 'downloaded';
  }

  function openBackupSheet() {
    const w = W();
    const folder = backupFolderName();
    const body = document.createElement('div');
    body.innerHTML =
      '<p class="prose small">세계관 ' + App.state.worlds.length + '개 전체를 JSON 한 파일로 내보냅니다. 인물 사진, 지도 이미지, 지형 스탬프까지 함께 담겨요.</p>' +
      '<button class="btn btn--gold btn--block mt-8" data-backup="export"><svg><use href="#i-download"/></svg><span>아이폰 \'' + esc(folder) + '\' 폴더에 저장</span></button>' +
      '<p class="field-hint">파일 이름은 <b>' + esc(backupFileName()) + '</b> 로 고정이라, 같은 폴더에 다시 저장할 때 <b>[대치]</b>를 누르면 기존 파일에 덮어씌워집니다. 공유 시트에서는 [파일에 저장]을 고르세요.</p>' +
      '<label class="field" style="display:flex;gap:9px;align-items:center;text-transform:none">' +
        '<input type="checkbox" id="backup-date" style="width:20px;height:20px;accent-color:#d4af37">' +
        '<span class="small">날짜를 붙여 <b>별도 파일</b>로 저장</span>' +
      '</label>' +
      '<div class="backup-guide">' +
        '<div class="backup-guide__title"><svg><use href="#i-download"/></svg>아이폰 파일 앱 \'' + esc(folder) + '\' 폴더에 저장하는 법</div>' +
        '<ol>' +
          '<li>위 <b>폴더에 저장</b> 버튼을 눌러 공유 시트를 엽니다.</li>' +
          '<li>공유 목록에서 <b>파일에 저장</b>을 선택합니다.</li>' +
              '<li>저장 위치에서 <b>' + esc(folder) + '</b> 폴더를 고르고 <b>저장</b>을 누릅니다. 같은 이름이 있으면 <b>대치</b>를 누르면 덮어써요.</li>' +
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
        const dateBox = body.querySelector('#backup-date');
        try {
          await exportBackup(act === 'export-download', !!(dateBox && dateBox.checked));
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
      else if (App.tab === 'lore') {
        // 지금 보고 있는 설정집 분류로 바로 새 항목(능력·등급이면 체계) 폼을 연다
        const cat = App.filters.loreCat;
        if (cat === RANKS_CAT) openRankForm(null, () => refreshView());
        else openLoreForm(null, { category: (cat && cat !== '전체') ? cat : 'rule' });
      }
      else if (App.tab === 'episodes') openEpisodeForm(null);
      else if (App.tab === 'map') openPinForm(50, 50, null);
    });
    window.addEventListener('beforeunload', () => { Store.save(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(true); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.tab === 'relations') Graph.clearSelection();
    });
  }

  /* 서비스워커 캐시를 비우고 최신 코드로 다시 연다.
     IndexedDB·localStorage의 세계관 데이터는 절대 건드리지 않는다 (Cache Storage만 삭제). */
  async function hardRefresh() {
    try { U.toast('최신 버전을 확인하는 중…', { icon: 'i-refresh', duration: 1200 }); } catch (e) {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => (r.update ? r.update().catch(() => {}) : null)));
        regs.forEach((r) => { try { if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {} });
      }
    } catch (e) { /* 업데이트 확인 실패해도 캐시 비우고 새로 연다 */ }
    try {
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    try { sessionStorage.setItem('arcanum.reloadAt', String(Date.now())); } catch (e) {}
    location.reload();
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    // 처음 설치(첫 클레임)에서는 새로고침하지 않는다. 이전 버전이 떠 있을 때만 다시 띄운다.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    function recentReload() {
      try {
        const t = Number(sessionStorage.getItem('arcanum.reloadAt') || 0);
        return Date.now() - t < 4000;
      } catch (e) { return false; }
    }
    function rememberReload() {
      try { sessionStorage.setItem('arcanum.reloadAt', String(Date.now())); } catch (e) {}
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      if (recentReload()) return;       // sw.js가 이미 새로 띄운 경우 두 번 새로고침하지 않는다
      reloading = true;
      try { U.toast('새 버전이 적용되어 새로고침합니다', { icon: 'i-sparkles', duration: 1400 }); } catch (e) {}
      rememberReload();
      setTimeout(() => { location.reload(); }, 650);
    });

    // updateViaCache:'none' — sw.js 자체도 HTTP 캐시에 남은 옛 사본 대신 항상 새로 받아온다
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      if (!reg) return;
      const wake = () => {
        if (!reg.waiting) return;
        try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
      };
      wake();
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => { if (sw.state === 'installed') wake(); });
      });
      // 앱을 열 때마다 새 버전이 있는지 확인한다
      try { reg.update(); } catch (e) {}
    }).catch(() => {});
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
