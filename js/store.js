/* =========================================================
   ARCANUM · storage (IndexedDB + localStorage mirror)
   ========================================================= */
(function (global) {
  'use strict';

  const DB_NAME = 'arcanum';
  const DB_VER = 1;
  const STORE = 'state';
  const KEY = 'main';
  const LS_KEY = 'arcanum.state.v1';
  const LS_THEME = 'arcanum.theme';
  const DEFAULT_BACKUP_FOLDER = '세계 만들기';

  let db = null;
  let dbBroken = false;
  let state = null;
  let timer = 0;
  let pendingImmediate = null;

  function mergeDefaults(s) {
    const out = s && typeof s === 'object' ? s : {};
    if (!Array.isArray(out.worlds)) out.worlds = [];
    if (!out.settings) out.settings = {};
    if (out.settings.theme !== 'parchment' && out.settings.theme !== 'dark') out.settings.theme = 'dark';
    if (typeof out.settings.backupFolder !== 'string' || !out.settings.backupFolder.trim()) {
      out.settings.backupFolder = DEFAULT_BACKUP_FOLDER;
    }
    if (!out.activeId || !out.worlds.some((w) => w.id === out.activeId)) {
      out.activeId = out.worlds[0] ? out.worlds[0].id : null;
    }
    out.worlds.forEach((w) => normalizeWorld(w));
    return out;
  }

  function normalizeWorld(w) {
    if (!w.id) w.id = 'w_' + Math.random().toString(36).slice(2, 9);
    if (!w.name) w.name = '이름 없는 세계관';
    ['characters', 'relations', 'events', 'lore', 'episodes'].forEach((k) => {
      if (!Array.isArray(w[k])) w[k] = [];
    });
    if (!w.map || typeof w.map !== 'object') w.map = { kind: null, image: null, markers: [] };
    if (!Array.isArray(w.map.markers)) w.map.markers = [];
    if (!Array.isArray(w.map.terrainStamps)) w.map.terrainStamps = [];
    if (typeof w.map.ratio !== 'number' || !isFinite(w.map.ratio) || w.map.ratio <= 0) w.map.ratio = 3 / 4;
    // keep the canvas ratio inside a usable band so a very tall/wide export still fits a phone
    w.map.ratio = Math.min(2.8, Math.max(0.45, w.map.ratio));
    w.map.terrainStamps.forEach((t) => {
      if (!t.id) t.id = 't_' + Math.random().toString(36).slice(2, 9);
      if (!t.type) t.type = 'mountains';
      if (typeof t.x !== 'number') t.x = 50;
      if (typeof t.y !== 'number') t.y = 50;
      if (t.size !== 's' && t.size !== 'm' && t.size !== 'l') t.size = 'm';
    });
    if (!w.map.kind && w.map.image) w.map.kind = 'custom';
    if (!Array.isArray(w.eraOrder) || !w.eraOrder.length) {
      const eras = [];
      w.events.forEach((e) => { if (e.era && eras.indexOf(e.era) === -1) eras.push(e.era); });
      w.eraOrder = eras.length ? eras : ['제1기'];
    }

    // 강함 / 등급 체계 (rank systems)
    if (!Array.isArray(w.rankSystems)) w.rankSystems = [];
    w.rankSystems = w.rankSystems.filter((s) => s && typeof s === 'object');
    w.rankSystems.forEach((s) => {
      if (!s.id) s.id = 'rk_' + Math.random().toString(36).slice(2, 9);
      if (!s.name) s.name = '등급 체계';
      if (!Array.isArray(s.tiers)) s.tiers = [];
      s.tiers = s.tiers.map((t) => String(t === null || t === undefined ? '' : t));
      if (!s.tiers.length) s.tiers = ['1단계'];
      if (typeof s.icon !== 'string' || !s.icon) s.icon = '⚔';
      if (typeof s.color !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(s.color)) s.color = '#d4af37';
    });

    // 예전에 저장된 샘플 세계관에는 기본 등급 체계를 한 번만 붙여 준다.
    if (w.id === 'w_arcadia' && !w.rankSystems.length && !w.rankSeeded &&
        global.Sample && typeof global.Sample.rankDefaults === 'function') {
      try {
        const seed = global.Sample.rankDefaults();
        w.rankSystems = seed.systems;
        w.characters.forEach((c) => {
          if (!c.ranks && seed.ranks[c.id]) c.ranks = seed.ranks[c.id];
        });
        w.rankSeeded = true;
      } catch (e) { /* 샘플 마이그레이션은 실패해도 괜찮다 */ }
    }

    const rankSysById = new Map(w.rankSystems.map((s) => [s.id, s]));
    w.characters.forEach((c) => {
      if (!c.id) c.id = 'c_' + Math.random().toString(36).slice(2, 9);
      if (!c.pos || typeof c.pos.x !== 'number') {
        c.pos = randomPos(w.characters.length);
      }
      // 인물 등급: 체계마다 단계 하나(인덱스). 없는 체계·단계는 버린다.
      if (!Array.isArray(c.ranks)) c.ranks = [];
      const seen = new Set();
      c.ranks = c.ranks.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        const sys = rankSysById.get(r.systemId);
        if (!sys) return false;
        const tier = Number(r.tier);
        if (!isFinite(tier) || tier < 0 || tier >= sys.tiers.length) return false;
        if (seen.has(r.systemId)) return false;
        seen.add(r.systemId);
        r.tier = tier;
        return true;
      });
    });
    w.relations.forEach((r) => {
      if (!r.id) r.id = 'r_' + Math.random().toString(36).slice(2, 9);
      ['a', 'b'].forEach((k) => {
        if (typeof r[k] === 'object' && r[k]) r[k] = r[k].id;
      });
    });
    // drop relations pointing at removed characters
    const ids = new Set(w.characters.map((c) => c.id));
    w.relations = w.relations.filter((r) => ids.has(r.a) && ids.has(r.b) && r.a !== r.b);
    w.events.forEach((e) => {
      if (!e.id) e.id = 'e_' + Math.random().toString(36).slice(2, 9);
      if (!Array.isArray(e.characters)) e.characters = [];
      if (!Array.isArray(e.locations)) e.locations = [];
      if (typeof e.year !== 'number') e.year = Number(e.year) || 0;
    });
    w.episodes.forEach((ep, i) => {
      if (!ep.id) ep.id = 'p_' + Math.random().toString(36).slice(2, 9);
      if (typeof ep.no !== 'number') ep.no = i + 1;
      if (!ep.status) ep.status = 'idea';
      if (!Array.isArray(ep.characters)) ep.characters = [];
      if (!Array.isArray(ep.locations)) ep.locations = [];
      if (!Array.isArray(ep.scenes)) ep.scenes = [];
    });
    w.lore.forEach((l) => {
      if (!l.id) l.id = 'l_' + Math.random().toString(36).slice(2, 9);
      if (!l.category) l.category = 'etc';
      if (!Array.isArray(l.tags)) l.tags = [];
    });
    w.map.markers.forEach((m) => {
      if (!m.id) m.id = 'm_' + Math.random().toString(36).slice(2, 9);
      if (typeof m.x !== 'number') m.x = 50;
      if (typeof m.y !== 'number') m.y = 50;
      if (!m.kind) m.kind = 'city';
    });
    return w;
  }

  function randomPos(index) {
    const i = index || 0;
    const cx = 180, cy = 260;
    const angle = (i * 137.5) * Math.PI / 180;
    const radius = 40 + (i % 5) * 42;
    return {
      x: Math.round(Math.min(320, Math.max(40, cx + Math.cos(angle) * radius))),
      y: Math.round(Math.min(480, Math.max(40, cy + Math.sin(angle) * radius)))
    };
  }

  function openDB() {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      if (typeof indexedDB === 'undefined') return done(null);
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VER);
      } catch (e) {
        dbBroken = true;
        return done(null);
      }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => { db = req.result; done(db); };
      req.onerror = () => { dbBroken = true; done(null); };
      req.onblocked = () => done(null);
      setTimeout(() => done(db), 2500);
    });
  }

  function idbGet() {
    return new Promise((resolve) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function idbPut(value) {
    return new Promise((resolve) => {
      if (!db) return resolve(false);
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function lsGet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function compact(s) {
    const copy = JSON.parse(JSON.stringify(s));
    copy.__compact = true;
    copy.worlds.forEach((w) => {
      if (w.map) w.map.image = null;
      (w.characters || []).forEach((c) => { c.image = null; });
    });
    return copy;
  }

  function mirror() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(compact(state)));
    } catch (e) { /* ignore quota problems on the mirror */ }
  }

  async function flush() {
    if (!state) return;
    const data = JSON.stringify(state);
    const ok = await idbPut(data);
    if (!ok) {
      try {
        localStorage.setItem(LS_KEY, data);
      } catch (e) {
        mirror();
      }
    } else {
      mirror();
    }
  }

  function save(immediate) {
    if (immediate) {
      clearTimeout(timer);
      return flush();
    }
    clearTimeout(timer);
    timer = setTimeout(() => { flush(); }, 320);
    return Promise.resolve();
  }

  function seedState() {
    const fresh = mergeDefaults({
      worlds: [global.Sample.world()],
      activeId: 'w_arcadia',
      settings: { theme: 'dark', seeded: true },
      version: 1
    });
    return fresh;
  }

  let themeChosen = null;
  function readStoredTheme() {
    try { const t = localStorage.getItem(LS_THEME); return (t === 'parchment' || t === 'dark') ? t : null; } catch (e) { return null; }
  }

  async function init() {
    await openDB();
    let loaded = await idbGet();
    if (loaded && typeof loaded === 'string') {
      try { loaded = JSON.parse(loaded); } catch (e) { loaded = null; }
    }
    if (!loaded) loaded = lsGet();
    if (loaded && loaded.worlds && loaded.worlds.length) {
      state = mergeDefaults(loaded);
    } else {
      state = seedState();
      await save(true);
    }
    const theme = readStoredTheme();
    if (theme) state.settings.theme = theme;
    themeChosen = state.settings.theme;
    return state;
  }

  function get() { return state; }

  function setTheme(theme) {
    if (!state) return;
    state.settings.theme = theme;
    try { localStorage.setItem(LS_THEME, theme); } catch (e) {}
    save();
  }

  function exportPayload() {
    return {
      app: 'arcanum',
      version: 1,
      exportedAt: new Date().toISOString(),
      activeId: state.activeId,
      settings: state.settings,
      worlds: state.worlds
    };
  }

  function parseImport(text) {
    const raw = JSON.parse(text);
    let worlds = null;
    let activeId = null;
    let settings = null;
    if (raw && Array.isArray(raw.worlds)) {
      worlds = raw.worlds;
      activeId = raw.activeId || null;
      settings = raw.settings || null;
    } else if (raw && (Array.isArray(raw.characters) || raw.name)) {
      worlds = [raw];
    }
    if (!worlds || !worlds.length) throw new Error('세계관 데이터를 찾지 못했어요.');
    worlds = worlds.filter((w) => w && typeof w === 'object');
    if (!worlds.length) throw new Error('세계관 데이터를 찾지 못했어요.');
    worlds.forEach((w) => {
      w.id = w.id || 'w_' + Math.random().toString(36).slice(2, 9);
    });
    const next = mergeDefaults({
      worlds: worlds,
      activeId: activeId && worlds.some((w) => w.id === activeId) ? activeId : worlds[0].id,
      settings: settings && settings.theme ? settings : state.settings,
      version: 1
    });
    return next;
  }

  function applyImport(next) {
    state = next;
    save(true);
    return state;
  }

  function api() {
    return {
      init, get, save, setTheme, exportPayload, parseImport, applyImport,
      normalizeWorld, randomPos, DEFAULT_BACKUP_FOLDER,
      state: () => state,
      isDbBroken: () => dbBroken,
      LS_KEY, LS_THEME
    };
  }

  global.Store = api();
})(window);
