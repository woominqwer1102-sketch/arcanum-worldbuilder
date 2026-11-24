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
    // 업로드한 원본과 양피지 변환본을 함께 보관하고, 어느 쪽을 보여 줄지 기억한다
    if (typeof w.map.image !== 'string' || !w.map.image) w.map.image = null;
    if (typeof w.map.imageOriginal !== 'string' || !w.map.imageOriginal) w.map.imageOriginal = null;
    if (w.map.style !== 'original' && w.map.style !== 'parchment') {
      w.map.style = w.map.imageOriginal ? 'parchment' : 'original';
    }
    if (typeof w.map.ratio !== 'number' || !isFinite(w.map.ratio) || w.map.ratio <= 0) w.map.ratio = 3 / 4;
    // 지도는 이미지 원본 비율을 그대로 따른다. 1:20 밖의 극단값만 안전하게 잘라 낸다.
    w.map.ratio = Math.min(20, Math.max(0.05, w.map.ratio));
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

    // 대표 역법(시대명) + 현재 연도
    if (typeof w.eraPrefix !== 'string') w.eraPrefix = '';
    if (typeof w.eraYear !== 'number' || !isFinite(w.eraYear)) w.eraYear = Number(w.eraYear) || 0;

    // 세력 관계도
    if (!w.factionNodes || typeof w.factionNodes !== 'object') w.factionNodes = {};
    if (!Array.isArray(w.factionRelations)) w.factionRelations = [];
    w.factionRelations = w.factionRelations.filter((r) => r && typeof r === 'object');
    w.factionRelations.forEach((r) => {
      if (!r.id) r.id = 'fr_' + Math.random().toString(36).slice(2, 9);
      if (!r.type) r.type = 'ally';
      if (!Array.isArray(r.tags)) delete r.tags;
    });

    // 강함 / 등급 체계 (rank systems)
    if (!Array.isArray(w.rankSystems)) w.rankSystems = [];
    w.rankSystems = w.rankSystems.filter((s) => s && typeof s === 'object');
    w.rankSystems.forEach((s) => {
      if (!s.id) s.id = 'rk_' + Math.random().toString(36).slice(2, 9);
      if (!s.name) s.name = '등급 체계';
      if (!Array.isArray(s.tiers)) s.tiers = [];
      s.tiers = s.tiers.map((t) => String(t === null || t === undefined ? '' : t));
      if (!s.tiers.length) s.tiers = ['1단계'];
      if (typeof s.description !== 'string') s.description = '';
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
    // 예전에 저장된 샘플 세계관에는 성별이 없으니 한 번만 채워 준다.
    const genderSeed = (w.id === 'w_arcadia' && !w.genderSeeded && global.Sample &&
      typeof global.Sample.genderDefaults === 'function') ? global.Sample.genderDefaults() : null;
    w.characters.forEach((c) => {
      if (!c.id) c.id = 'c_' + Math.random().toString(36).slice(2, 9);
      if (typeof c.gender !== 'string') c.gender = '';
      if (!c.gender && genderSeed && genderSeed[c.id]) c.gender = genderSeed[c.id];
      // 나이 · 키 · 몸무게 — 숫자 칸이 없던 예전 저장본은 '27세 · 182cm' 문자열에서 한 번 풀어 둔다
      const toNum = (v, max) => {
        const n = Number(v);
        return (isFinite(n) && n > 0) ? Math.min(max, Math.round(n)) : null;
      };
      c.ageNum = toNum(c.ageNum, 9999);
      c.heightCm = toNum(c.heightCm, 300);
      c.weightKg = toNum(c.weightKg, 500);
      if (!c.ageNum && !c.heightCm && !c.weightKg && typeof c.age === 'string' && c.age) {
        const a = c.age.match(/(\d{1,4})\s*(?:세|살)/);
        const h = c.age.match(/(\d{2,3})\s*(?:cm|센티)/i);
        const w2 = c.age.match(/(\d{2,3})\s*(?:kg|킬로)/i);
        if (a) c.ageNum = toNum(a[1], 9999);
        if (h) c.heightCm = toNum(h[1], 300);
        if (w2) c.weightKg = toNum(w2[1], 500);
      }
      const bodyBits = [];
      if (c.ageNum) bodyBits.push(c.ageNum + '세');
      if (c.heightCm) bodyBits.push(c.heightCm + 'cm');
      if (c.weightKg) bodyBits.push(c.weightKg + 'kg');
      c.age = bodyBits.length ? bodyBits.join(' · ') : (typeof c.age === 'string' ? c.age : '');
      // 설정집 연결 (종족 · 세력 · 능력 · 아이템)
      if (typeof c.raceId !== 'string') c.raceId = null;
      if (typeof c.factionId !== 'string') c.factionId = null;
      if (!Array.isArray(c.abilityIds)) c.abilityIds = [];
      if (!Array.isArray(c.weaponIds)) c.weaponIds = [];
      if (typeof c.abilityText !== 'string') c.abilityText = '';
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
    if (genderSeed) w.genderSeeded = true;
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
      if (typeof e.yearNum !== 'number' || !isFinite(e.yearNum)) e.yearNum = e.year;
    });
    w.episodes.forEach((ep, i) => {
      if (!ep.id) ep.id = 'p_' + Math.random().toString(36).slice(2, 9);
      if (typeof ep.no !== 'number') ep.no = i + 1;
      if (!ep.status) ep.status = 'idea';
      if (!Array.isArray(ep.characters)) ep.characters = [];
      if (!Array.isArray(ep.locations)) ep.locations = [];
      if (!Array.isArray(ep.scenes)) ep.scenes = [];
    });
    // 예전 샘플 세계관에는 새 기본 설정 항목이 없다 — 한 번만 채워 넣는다
    if (w.id === 'w_arcadia' && !w.loreSeeded && global.Sample && typeof global.Sample.loreDefaults === 'function') {
      try {
        const have = new Set(w.lore.map((l) => l.id));
        global.Sample.loreDefaults().forEach((l) => { if (!have.has(l.id)) w.lore.push(l); });
        w.loreSeeded = true;
      } catch (e) { /* 실패해도 기존 설정은 그대로 둔다 */ }
    }
    w.lore.forEach((l) => {
      if (!l.id) l.id = 'l_' + Math.random().toString(36).slice(2, 9);
      if (!Array.isArray(l.tags)) l.tags = [];
      // v1.4 — '마법·능력체계'(magic)를 '기타 규칙'(rule)으로 통합한다.
      // 인물의 abilityIds는 설정집 항목 id를 그대로 가리키므로 연결은 끊기지 않는다.
      if (l.category === 'magic') {
        l.category = 'rule';
        if (l.tags.indexOf('능력') === -1) l.tags.unshift('능력');
      }
      if (!l.category || l.category === 'etc') l.category = 'rule';
    });
    // v1.4 — 옛 '세력·국가'(faction)를 '국가'(nation)와 '세력'(faction)으로 나눈다(세계관마다 한 번만).
    // 관계도·인물·지역 연결은 id를 그대로 쓰므로 이름만 나뉘고 관계는 끊기지 않는다.
    if (!w.loreSplit) {
      const NATION_WORDS = /왕국|제국|왕조|황실|왕실|왕가|공국|연방|자치령|제후|왕좌|성국|국가|제정|왕권/;
      w.lore.forEach((l) => {
        if (l.category !== 'faction') return;
        const hay = [l.title, (l.tags || []).join(' ')].join(' ');
        if (NATION_WORDS.test(hay)) l.category = 'nation';
      });
      w.loreSplit = true;
    }

    // 국가의 주 종족(raceIds) · 세력의 소속 국가(nationId) · 지역의 지배 세력(factionId)
    if (!Array.isArray(w.map.terrainStamps)) w.map.terrainStamps = [];
    const raceIdSet = new Set(w.lore.filter((l) => l.category === 'race').map((l) => l.id));
    const nationIdSet = new Set(w.lore.filter((l) => l.category === 'nation').map((l) => l.id));
    const factionIdSet = new Set(w.lore.filter((l) => l.category === 'faction').map((l) => l.id));
    const placeIdSet = new Set([].concat(Array.from(nationIdSet), Array.from(factionIdSet)));
    w.lore.forEach((l) => {
      if (l.category === 'nation') {
        l.raceIds = (Array.isArray(l.raceIds) ? l.raceIds : [])
          .filter((id) => raceIdSet.has(id))
          .filter((id, i, arr) => arr.indexOf(id) === i);
      } else if (l.raceIds) {
        delete l.raceIds;
      }
      if (l.category === 'faction') {
        if (typeof l.nationId !== 'string' || !nationIdSet.has(l.nationId)) l.nationId = null;
      } else if ('nationId' in l) {
        delete l.nationId;
      }
    });
    w.map.markers.forEach((m) => {
      if (typeof m.factionId !== 'string' || !placeIdSet.has(m.factionId)) m.factionId = null;
      if (typeof m.nationId !== 'string' || !nationIdSet.has(m.nationId)) m.nationId = null;
      // 예전 핀의 '지배 세력'이 국가 항목이면 지배 국가로 옮긴다
      if (!m.nationId && m.factionId && nationIdSet.has(m.factionId)) {
        m.nationId = m.factionId;
        m.factionId = null;
      }
      if (m.nationId) {
        const nation = w.lore.find((l) => l.id === m.nationId);
        m.nation = nation ? nation.title : '';
      }
      if (typeof m.nation !== 'string') m.nation = '';
      if (typeof m.faction !== 'string') m.faction = '';
    });
    w.map.markers.forEach((m) => {
      if (!m.id) m.id = 'm_' + Math.random().toString(36).slice(2, 9);
      if (typeof m.x !== 'number') m.x = 50;
      if (typeof m.y !== 'number') m.y = 50;
      if (!m.kind) m.kind = 'city';
    });

    // 지도 고정(잠금) · 국경(영토) · 지도 위 인물 핀
    if (typeof w.mapLocked !== 'boolean') w.mapLocked = !!w.mapLocked;
    if (!Array.isArray(w.mapBorders)) w.mapBorders = [];
    w.mapBorders = w.mapBorders.filter((b) => b && typeof b === 'object');
    w.mapBorders.forEach((b) => {
      if (!b.id) b.id = 'bd_' + Math.random().toString(36).slice(2, 9);
      if (typeof b.nationId !== 'string' || !nationIdSet.has(b.nationId)) b.nationId = null;
      if (typeof b.label !== 'string') b.label = '';
      if (typeof b.color !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(b.color)) b.color = '#b4564f';
      b.points = (Array.isArray(b.points) ? b.points : [])
        .filter((p) => p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y))
        .map((p) => ({
          x: Math.min(100, Math.max(0, Math.round(p.x * 10) / 10)),
          y: Math.min(100, Math.max(0, Math.round(p.y * 10) / 10))
        }));
    });
    w.mapBorders = w.mapBorders.filter((b) => b.points.length >= 3);

    if (!Array.isArray(w.mapCharacterPins)) w.mapCharacterPins = [];
    w.mapCharacterPins = w.mapCharacterPins.filter((p) => p && typeof p === 'object');
    const pinCharIdSet = new Set(w.characters.map((c) => c.id));
    w.mapCharacterPins.forEach((p) => {
      if (!p.id) p.id = 'cp_' + Math.random().toString(36).slice(2, 9);
      if (typeof p.charId !== 'string' || !pinCharIdSet.has(p.charId)) p.charId = '';
      if (typeof p.x !== 'number' || !isFinite(p.x)) p.x = 50;
      if (typeof p.y !== 'number' || !isFinite(p.y)) p.y = 50;
      p.x = Math.min(100, Math.max(0, Math.round(p.x * 10) / 10));
      p.y = Math.min(100, Math.max(0, Math.round(p.y * 10) / 10));
      if (typeof p.note !== 'string') p.note = '';
    });
    w.mapCharacterPins = w.mapCharacterPins.filter((p) => !!p.charId);
    // 유물의 소지 인물 · 보관 지역 연결 정리
    const charIdSet = new Set(w.characters.map((c) => c.id));
    const markerIdSet = new Set(w.map.markers.map((m) => m.id));
    w.lore.forEach((l) => {
      if (l.category !== 'item') {
        if ('holderCharId' in l) delete l.holderCharId;
        if ('locationId' in l) delete l.locationId;
        return;
      }
      if (l.holderCharId && !charIdSet.has(l.holderCharId)) l.holderCharId = null;
      if (l.locationId && !markerIdSet.has(l.locationId)) l.locationId = null;
    });

    linkLoreRefs(w);
    return w;
  }

  /* 설정집 항목과 인물을 연결한다. 제목이 바뀌거나 항목이 지워져도 이 함수 하나로 맞춘다. */
  function syncLoreFields(w, c, byId) {
    const map = byId || new Map(w.lore.map((l) => [l.id, l]));
    if (c.raceId) {
      const l = map.get(c.raceId);
      if (l && l.category === 'race') c.race = l.title;
      else c.raceId = null;
    }
    if (c.factionId) {
      const l = map.get(c.factionId);
      if (l && (l.category === 'faction' || l.category === 'nation')) c.faction = l.title;
      else c.factionId = null;
    }
    c.abilityIds = (c.abilityIds || []).filter((id) => {
      const l = map.get(id);
      return !!l && l.category === 'rule';
    });
    c.weaponIds = (c.weaponIds || []).filter((id) => {
      const l = map.get(id);
      return !!l && l.category === 'item';
    });
    const names = c.abilityIds.map((id) => map.get(id).title)
      .concat(c.weaponIds.map((id) => map.get(id).title));
    if (c.abilityText) names.push(c.abilityText);
    c.abilities = names.join(' · ');
    return c;
  }

  /* 예전 자유 입력값을 설정집 항목과 맞추고, 연결된 이름을 최신 제목으로 다시 쓴다. */
  function linkLoreRefs(w) {
    const byId = new Map(w.lore.map((l) => [l.id, l]));
    const byTitle = new Map();
    w.lore.forEach((l) => { byTitle.set(l.category + '|' + l.title, l); });

    w.characters.forEach((c) => {
      if (!c.raceId && c.race) {
        const hit = byTitle.get('race|' + c.race);
        if (hit) c.raceId = hit.id;
      }
      if (!c.factionId && c.faction) {
        const hit = byTitle.get('faction|' + c.faction);
        if (hit) c.factionId = hit.id;
      }
      if (!(c.abilityIds || []).length && !(c.weaponIds || []).length && !c.abilityText && c.abilities && w.lore.length) {
        const rest = [];
        String(c.abilities).split('·').map((t) => t.trim()).filter(Boolean).forEach((token) => {
          const hit = byTitle.get('rule|' + token) || byTitle.get('item|' + token);
          if (!hit) { rest.push(token); return; }
          if (hit.category === 'rule') c.abilityIds.push(hit.id);
          else c.weaponIds.push(hit.id);
        });
        if (rest.length) c.abilityText = rest.join(' · ');
      }
      syncLoreFields(w, c, byId);
    });
  }

  /* 설정집 편집·삭제 뒤에 앱이 부르는 동기화 */
  function syncLoreLinks(w) {
    if (!w) return;
    linkLoreRefs(w);
    // 항목이 지워지면 그 항목을 가리키던 국가·세력·지역·유물 연결도 함께 정리한다
    const raceIds = new Set((w.lore || []).filter((l) => l.category === 'race').map((l) => l.id));
    const nationIds = new Set((w.lore || []).filter((l) => l.category === 'nation').map((l) => l.id));
    const factionIds = new Set((w.lore || []).filter((l) => l.category === 'faction').map((l) => l.id));
    const placeIds = new Set([].concat(Array.from(nationIds), Array.from(factionIds)));
    (w.lore || []).forEach((l) => {
      if (l.category === 'nation') {
        l.raceIds = (Array.isArray(l.raceIds) ? l.raceIds : []).filter((id) => raceIds.has(id));
      } else if (l.raceIds) {
        delete l.raceIds;
      }
      if (l.category === 'faction') {
        if (l.nationId && !nationIds.has(l.nationId)) l.nationId = null;
      } else if ('nationId' in l) {
        delete l.nationId;
      }
    });
    const charIds = new Set((w.characters || []).map((c) => c.id));
    const markerIds = new Set((((w.map || {}).markers) || []).map((m) => m.id));
    (w.lore || []).forEach((l) => {
      if (l.category !== 'item') return;
      if (l.holderCharId && !charIds.has(l.holderCharId)) l.holderCharId = null;
      if (l.locationId && !markerIds.has(l.locationId)) l.locationId = null;
    });
    (((w.map || {}).markers) || []).forEach((m) => {
      if (m.factionId && !placeIds.has(m.factionId)) m.factionId = null;
    });
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
      if (w.map) { w.map.image = null; w.map.imageOriginal = null; }
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
      normalizeWorld, randomPos, DEFAULT_BACKUP_FOLDER, syncLoreLinks, syncLoreFields,
      state: () => state,
      isDbBroken: () => dbBroken,
      LS_KEY, LS_THEME
    };
  }

  global.Store = api();
})(window);
