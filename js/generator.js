/* =========================================================
   ARCANUM · 판타지 이름 / 지명 생성기
   ========================================================= */
(function (global) {
  'use strict';

  const U = global.UI;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;

  const GIVEN = {
    western: ['아엘릭', '세라핀', '토른', '리라', '코르부스', '이졸데', '말라카르', '엘린드라', '바레스', '니뮤에',
      '카시안', '오필리아', '드레이븐', '아리안', '루시안', '미렐', '타리엔', '셀린', '가웨인', '브리엔',
      '알드릭', '에스텔', '로완', '실비아', '다리안', '레오노르', '아스트라', '벨라트릭스', '카이렌', '투린',
      '에드란', '모르간', '세베린', '알리스', '로엔', '페넬로프', '하르빈', '오르넬라', '제피르', '이렌',
      '발렌', '오스윈', '세드릭', '미라벨', '테오도르', '아델하이드', '카일런', '노아', '아린', '실라스'],
    eastern: ['무진', '청운', '소하', '연화', '사혁', '도현', '은월', '백호', '경운', '진하',
      '서량', '소월', '무영', '청아', '하윤', '승하', '유진', '태산', '운학', '명월',
      '설아', '단아', '무열', '자하', '낙원', '초아', '현운', '비류', '적운', '소운',
      '연호', '단운', '무한', '청린', '설현', '하람', '도원', '진운', '월하', '소담'],
    nordic: ['브요른', '시그룬', '아스테르', '룬', '하바르드', '프레이야', '오르빈', '토르발드', '그리무르', '세이디스',
      '이바르', '스카디', '에이리크', '할바르', '군힐드', '볼프', '알프힐드', '라그나', '솔베이그', '토르케르',
      '오르라', '바르니', '하콘', '이둔', '발드르', '시그리드', '아이나르', '스베른', '튀르', '헬가',
      '울바르', '군나르', '프리다', '오르드', '레이프', '스텐', '토르비', '아스라', '보르', '하일가'],
    mythic: ['아르카누스', '벨자르', '나훔', '세멜', '탈리온', '모르두스', '아스투르', '벨리안', '칼데아', '오르무스',
      '자라이', '네페르', '탈라스', '멜리안', '자르투스', '오브렌', '카이라스', '세라투스', '미트라스', '아누비스',
      '에르투', '솔마르', '바하르', '니샤', '타르가', '오시아', '벨투스', '사르멜', '이르투', '카르멘']
  };

  const HOUSE = {
    western: ['반 다이렌', '아쉬포드', '실버홀드', '레이븐스파이어', '그레이맨틀', '듀스베인', '손우드', '윈드미어',
      '아이언하트', '발모어', '스톤브룩', '나이트셰이드', '골든리프', '엘드우드', '모르간트', '발디어',
      '카르스텐', '오르세이', '로덴', '세인트클레어', '드래곤하트', '하이델', '아르벤', '로크하트'],
    eastern: ['백', '서', '남궁', '제갈', '사마', '유', '진', '설', '하', '단',
      '위', '맹', '소', '연', '도', '곽', '양', '문', '공손', '동방', '상관', '황보', '남', '탁'],
    nordic: ['룬가르드', '아이언본', '스톰하울', '프로스트베인', '스카르드손', '할바르드손', '그레이울프', '아스펜하트',
      '토른손', '그림스톤', '바람손', '얼음손', '북풍의', '하르가르드'],
    mythic: ['의 후예', '왕조', '성좌의', '의 사제', '의 첫 왕']
  };

  const EPITHET = {
    western: ['서리검의 계승자', '잿불의 군주', '침묵의 증인', '황금 가지의 대마법사', '검은숲의 수호자', '별의 방랑자',
      '폐허의 증인', '여명의 노래', '붉은 서약', '무쇠 망치', '달의 아이', '망각의 기록자',
      '일곱 번째 봉인', '고요한 칼날', '재의 순례자', '황혼의 사냥꾼', '이름을 감춘 자', '서약 없는 자',
      '마지막 문지기', '노래하지 않는 자', '성문의 파수꾼', '얼지 않는 손', '잿빛 왕관의 마지막 소유자'],
    eastern: ['청운검선', '무영도객', '백운검존', '소요산인', '혈화마군', '천마신군', '냉월검희', '무명검수',
      '북해빙검', '낙화검객', '유운선자', '적하도인', '천외일검', '잔월검객', '무림의 그림자', '일검천하'],
    nordic: ['서리늑대', '룬의 수호자', '폭풍의 아들', '뼈의 노래', '북방의 불꽃', '바람을 읽는 자',
      '얼음다리 위의 자', '세 번 죽은 자', '뱀의 맹세', '긴 겨울의 증인'],
    mythic: ['재의 첫 왕', '이름 없는 신', '태양을 삼킨 자', '열두 번째 사제', '봉인된 목소리',
      '검은 강의 주인', '별을 세는 자', '끝나지 않는 노래']
  };

  const STYLE_LABEL = {
    western: '서양 정통 판타지',
    eastern: '동양 무협·선협',
    nordic: '북유럽·아케인',
    mythic: '고대 신화·이국'
  };

  /* ---------------- Names ---------------- */
  function makeName(style) {
    if (style === 'eastern') {
      const sur = pick(HOUSE.eastern);
      const given = pick(GIVEN.eastern);
      return { name: sur + given, sub: '성 + 두 글자 이름', epithet: pick(EPITHET.eastern), style };
    }
    if (style === 'nordic') {
      const given = pick(GIVEN.nordic);
      const form = Math.random();
      if (form < 0.55) {
        const house = pick(HOUSE.nordic);
        return { name: given + ' ' + house, sub: '이름 + 가문', epithet: pick(EPITHET.nordic), style };
      }
      if (form < 0.8) {
        const father = pick(GIVEN.nordic);
        return { name: given + ' ' + father.replace(/르$/, '르') + '손', sub: '이름 + 부칭(~의 아들)', epithet: pick(EPITHET.nordic), style };
      }
      return { name: given, sub: '단일 이름', epithet: pick(EPITHET.nordic), style };
    }
    if (style === 'mythic') {
      const given = pick(GIVEN.mythic);
      if (chance(0.35)) {
        return { name: given + ' ' + pick(['아르', '벨', '자르', '오르']) + pick(['가르', '투스', '멜', '니스']), sub: '고대식 두 마디 이름', epithet: pick(EPITHET.mythic), style };
      }
      return { name: given, sub: '고대 왕조식 이름', epithet: pick(EPITHET.mythic), style };
    }
    const given = pick(GIVEN.western);
    const form = Math.random();
    if (form < 0.6) {
      const house = pick(HOUSE.western);
      return { name: given + ' ' + house, sub: '이름 + 가문', epithet: pick(EPITHET.western), style };
    }
    if (form < 0.78) {
      return { name: given + ' 경', sub: '이름 + 작위', epithet: pick(EPITHET.western), style };
    }
    return { name: given, sub: '이름만', epithet: pick(EPITHET.western), style };
  }

  function genNames(style, count, withEpithet) {
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < (count || 8) && guard < 200) {
      guard++;
      const item = makeName(style || 'western');
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      if (!withEpithet) item.epithet = '';
      out.push(item);
    }
    return out;
  }

  /* ---------------- Places ---------------- */
  const PLACE = {
    kingdom: {
      label: '왕국 / 제국',
      roots: ['아르카디아', '발드렌', '엘드렌', '테리안', '노스가르드', '크로반', '세른', '아스텔', '로웬', '카르디아',
        '드라켄', '벨로나', '아르덴', '오르세아', '하이델', '카이로스', '벨그라드', '로사르'],
      adj: ['서리', '황금', '잿빛', '은빛', '침묵', '여명', '폐허', '일곱', '백야', '붉은', '푸른'],
      noun: ['왕관', '성좌', '서약', '문', '왕좌', '깃발', '왕가', '성화'],
      types: ['왕국', '제국', '왕조', '연방', '공국'],
      subs: ['수도와 왕실이 있는 중심국', '몰락한 옛 제국', '서약으로 묶인 연방', '재건 중인 왕국']
    },
    city: {
      label: '도시 / 항구',
      roots: ['발드렌', '솔가르드', '미렌', '카르벤', '오르사', '테른', '리엔', '하르벨', '아르덴', '노바르', '세이렌', '카일로스'],
      adj: ['은빛', '잿빛', '푸른', '붉은', '고요한', '취한', '소금', '안개'],
      noun: ['물결', '등불', '갈매기', '소금', '돛', '종', '다리'],
      types: ['항구', '성', '시', '교역소', '항', '요새'],
      subs: ['안개 잦은 항구 도시', '세관과 밀수꾼의 도시', '성벽으로 둘러싸인 교역지', '돛과 소문이 모이는 곳']
    },
    nature: {
      label: '숲 / 산맥 / 유적',
      roots: ['엘드', '모르', '발드', '세른', '아르'],
      adj: ['검은', '잿빛', '서리', '고요한', '잊힌', '노래하는', '붉은', '푸른', '달빛', '안개'],
      noun: ['숲', '봉우리', '산맥', '계곡', '늪', '폐허', '신전', '탑', '성소', '협곡', '평원', '사막'],
      subs: ['험준한 산맥과 봉인된 숲', '잊힌 신전이 잠든 유적', '안개가 걷히지 않는 계곡', '이름을 감춘 성소']
    },
    dungeon: {
      label: '던전 / 길드 / 여관',
      roots: ['발드렌', '하르벨', '오르사', '테른'],
      adj: ['붉은', '은빛', '황금', '검은', '취한', '조용한', '일곱 번째', '재의'],
      noun: ['깃펜', '두루마리', '사슬', '망치', '달', '까마귀', '서약', '등불', '잔', '뼈', '나침반'],
      types: ['여관', '길드', '던전', '미궁', '지하묘지', '상단', '도서관'],
      subs: ['모험가들이 이름을 바꾸는 여관', '값을 먼저 말하는 길드', '봉인이 남은 지하 미궁', '기록을 감춘 도서관']
    },
    eastern: {
      label: '동양풍 지명',
      roots: ['청', '백', '혈', '무', '소', '천', '옥', '금', '남', '북', '서', '동', '월', '설', '운', '화', '자', '적', '낙', '요'],
      noun: ['운', '화', '월', '설', '무', '청', '백', '룡', '하', '산', '강', '풍', '명'],
      types: ['산', '문', '루', '관', '곡', '협', '봉', '림', '원', '정', '각', '당'],
      curated: ['무릉도원', '소요문', '낙화루', '백운관', '천외천', '혈화곡', '무명협', '옥룡산', '금강문',
        '월하정', '청풍각', '황혼림', '무영봉', '백년객잔', '청운산', '설월곡', '남궁세가', '적하도장'],
      subs: ['산문과 무림 세력의 거점', '선협의 수행지', '강호의 객잔', '이름난 문파의 본산']
    }
  };

  function genPlaces(type, count) {
    const conf = PLACE[type] || PLACE.kingdom;
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < (count || 8) && guard < 240) {
      guard++;
      let name = '';
      const r = Math.random();
      if (type === 'eastern') {
        if (r < 0.42) {
          name = pick(conf.curated);
        } else {
          const a = pick(conf.roots);
          let b = pick(conf.noun);
          if (a === b) b = pick(conf.noun.filter((x) => x !== a));
          const t = pick(conf.types);
          name = r < 0.72 ? a + b + t : a + t;
        }
      } else if (type === 'kingdom') {
        if (r < 0.4) name = pick(conf.roots) + ' ' + pick(conf.types);
        else if (r < 0.7) name = pick(conf.adj) + ' ' + pick(conf.noun) + '의 ' + pick(conf.types);
        else name = pick(conf.adj) + pick(conf.roots);
      } else if (type === 'city') {
        if (r < 0.45) name = pick(conf.roots) + ' ' + pick(conf.types);
        else if (r < 0.75) name = pick(conf.adj) + ' ' + pick(conf.noun) + ' ' + pick(conf.types);
        else name = pick(conf.adj) + pick(conf.roots);
      } else if (type === 'nature') {
        if (r < 0.55) name = pick(conf.adj) + ' ' + pick(conf.noun);
        else if (r < 0.8) name = pick(conf.adj) + pick(conf.noun);
        else name = pick(conf.roots) + '의 ' + pick(conf.noun);
      } else {
        if (r < 0.5) name = pick(conf.adj) + ' ' + pick(conf.noun) + ' ' + pick(conf.types);
        else if (r < 0.8) name = pick(conf.noun) + '의 ' + pick(conf.types);
        else name = pick(conf.roots) + ' ' + pick(conf.types);
      }
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, sub: pick(conf.subs), type });
    }
    return out;
  }

  /* ---------------- Sheet UI ---------------- */
  let state = { mode: 'character', style: 'western', placeType: 'kingdom', withEpithet: true, results: [] };

  function renderResults(host, onPick, mode) {
    host.innerHTML = state.results.map((item, i) =>
      '<div class="gen-item" style="animation-delay:' + (i * 18) + 'ms">' +
        '<div class="gen-item__text">' +
          '<div class="gen-item__name">' + U.esc(item.name) + '</div>' +
          (item.epithet ? '<div class="gen-item__epi">「' + U.esc(item.epithet) + '」</div>' : '') +
          '<div class="gen-item__sub">' + U.esc(item.sub || '') + '</div>' +
        '</div>' +
        '<div class="gen-item__acts">' +
          '<button type="button" class="mini-btn" data-act="copy" data-i="' + i + '" aria-label="복사">' +
            '<svg><use href="#i-copy"/></svg></button>' +
          (onPick ? '<button type="button" class="mini-btn mini-btn--gold" data-act="pick" data-i="' + i + '" aria-label="넣기">' +
            '<svg><use href="#i-check"/></svg></button>' : '') +
        '</div>' +
      '</div>'
    ).join('');

    host.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = state.results[Number(btn.dataset.i)];
        if (!item) return;
        if (btn.dataset.act === 'copy') {
          const text = item.epithet ? item.name + ' 「' + item.epithet + '」' : item.name;
          const ok = await U.copyText(text);
          U.toast(ok ? '복사했어요 · ' + item.name : '복사가 막혔어요. 길게 눌러 복사해 주세요.', { icon: ok ? 'i-copy' : 'i-x' });
          U.haptic(8);
        } else if (btn.dataset.act === 'pick' && onPick) {
          onPick(item);
        }
      });
    });
  }

  function open(opts) {
    const o = opts || {};
    state.mode = o.mode || 'character';
    state.style = 'western';
    state.placeType = 'kingdom';
    state.withEpithet = true;

    const body = document.createElement('div');

    function refresh() {
      state.results = state.mode === 'character'
        ? genNames(state.style, 8, state.withEpithet)
        : genPlaces(state.placeType, 8);
    }

    function draw() {
      refresh();
      body.innerHTML =
        '<div class="gen-tabs">' +
          '<button type="button" class="gen-tab' + (state.mode === 'character' ? ' is-active' : '') + '" data-mode="character">' +
            '<svg><use href="#i-users"/></svg>인물 이름</button>' +
          '<button type="button" class="gen-tab' + (state.mode === 'place' ? ' is-active' : '') + '" data-mode="place">' +
            '<svg><use href="#i-pin"/></svg>지명</button>' +
        '</div>' +
        '<div class="label-row"><span>' + (state.mode === 'character' ? '스타일' : '유형') + '</span>' +
          (state.mode === 'character' ? '<span>칭호</span>' : '<span>8개씩</span>') + '</div>' +
        '<div class="chip-row" id="gen-chips"></div>' +
        (state.mode === 'character'
          ? '<button type="button" class="chip' + (state.withEpithet ? ' chip--active' : '') + '" id="gen-epithet-toggle" style="margin-bottom:4px">' +
              '칭호·이명 함께 추천</button>'
          : '') +
        '<div class="gen-results" id="gen-results"></div>' +
        '<button type="button" class="btn btn--gold btn--block mt-14" id="gen-again">' +
          '<svg><use href="#i-refresh"/></svg>다시 뽑기</button>' +
        '<p class="field-hint center mt-8">마음에 드는 이름은 복사하거나' + (o.onPick ? ' 골드 버튼으로 폼에 바로 넣을 수 있어요.' : ' 복사해서 쓸 수 있어요.') + '</p>';

      const chips = body.querySelector('#gen-chips');
      const items = state.mode === 'character'
        ? Object.keys(STYLE_LABEL).map((k) => ({ value: k, label: STYLE_LABEL[k] }))
        : Object.keys(PLACE).map((k) => ({ value: k, label: PLACE[k].label }));
      const current = state.mode === 'character' ? state.style : state.placeType;
      items.forEach((it) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip chip--small' + (it.value === current ? ' chip--active' : '');
        b.textContent = it.label;
        b.addEventListener('click', () => {
          if (state.mode === 'character') state.style = it.value;
          else state.placeType = it.value;
          draw();
          U.haptic(6);
        });
        chips.appendChild(b);
      });

      if (state.mode === 'character') {
        const toggle = body.querySelector('#gen-epithet-toggle');
        toggle.addEventListener('click', () => {
          state.withEpithet = !state.withEpithet;
          draw();
        });
      }

      const resHost = body.querySelector('#gen-results');
      const onPick = o.onPick ? (item) => { o.onPick(item); handle.close(); } : null;
      renderResults(resHost, onPick, state.mode);

      body.querySelector('#gen-again').addEventListener('click', () => {
        refresh();
        renderResults(resHost, onPick, state.mode);
        U.haptic(10);
      });

      body.querySelectorAll('[data-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.mode = btn.dataset.mode;
          draw();
        });
      });
    }

    draw();

    const handle = U.openSheet({
      eyebrow: '이름 공방 · NAME FORGE',
      title: state.mode === 'place' ? '지명 추천' : '이름 추천',
      sub: o.contextLabel || '클릭해서 복사하거나 폼에 바로 넣으세요',
      body: body,
      foot: [{ label: '다시 뽑기', icon: 'i-refresh', className: 'btn--gold', onClick: () => {
        const again = body.querySelector('#gen-again');
        if (again) again.click();
      } }]
    });
    return handle;
  }

  /* ---------------- AI 초상 프롬프트 + 이미지 ---------------- */

  // 한국어 인물 정보 → 영어 묘사 조각. 모르는 단어는 건너뛰고 아는 단서만 조합한다.
  const RACE_EN = {
    '인간': 'human', '엘프': 'elf', '하이엘프': 'high elf', '다크엘프': 'dark elf', '드워프': 'dwarf',
    '오크': 'orc', '반오크': 'half-orc', '수인': 'beastfolk', '용인': 'dragonkin', '용족': 'dragonborn',
    '마족': 'demonkin', '악마': 'demon', '천사': 'angelic being', '반신': 'demigod', '언데드': 'undead',
    '리치': 'lich', '뱀파이어': 'vampire', '정령': 'elemental spirit', '거인': 'giant', '요정': 'fairy',
    '고블린': 'goblin', '노움': 'gnome', '하플링': 'halfling', '반요': 'half-spirit'
  };

  const ROLE_EN = [
    ['대마법사', 'archmage'], ['마법사', 'wizard'], ['마도사', 'sorcerer'], ['마녀', 'witch'], ['사제', 'priest'],
    ['성기사', 'paladin'], ['기사', 'knight'], ['검사', 'swordsman'], ['검객', 'duelist'], ['왕', 'king'],
    ['여왕', 'queen'], ['공주', 'princess'], ['왕자', 'prince'], ['황제', 'emperor'], ['귀족', 'noble'],
    ['용사', 'hero'], ['모험가', 'adventurer'], ['사냥꾼', 'hunter'], ['도적', 'rogue'], ['암살자', 'assassin'],
    ['연금술사', 'alchemist'], ['소환사', 'summoner'], ['드루이드', 'druid'], ['수도승', 'monk'], ['음유시인', 'bard'],
    ['장군', 'general'], ['용병', 'mercenary'], ['상인', 'merchant'], ['학자', 'scholar'], ['현자', 'sage'],
    ['수호자', 'guardian'], ['파수꾼', 'sentinel'], ['기록자', 'chronicler'], ['사제장', 'high priest'],
    ['대장장이', 'blacksmith'], ['정찰병', 'scout'], ['해적', 'pirate'], ['선장', 'captain']
  ];

  const GEAR_EN = [
    ['얼음', 'ice and frost magic'], ['결빙', 'frost magic'], ['불', 'flame'],
    ['번개', 'lightning'], ['폭풍', 'storm'], ['바람', 'wind'], ['물', 'water'],
    ['대지', 'earth'], ['그림자', 'shadow magic'], ['빛', 'radiant light'],
    ['치유', 'healing'], ['저주', 'curse'], ['소환', 'summoning'], ['환영', 'illusion'], ['룬', 'runes'],
    ['혈', 'blood magic'], ['정령', 'elemental'], ['검', 'sword'], ['대검', 'greatsword'], ['쌍수', 'dual blades'],
    ['창', 'spear'], ['활', 'bow'], ['단검', 'dagger'], ['지팡이', 'staff'], ['마법서', 'grimoire'],
    ['방패', 'shield'], ['도끼', 'axe'], ['낫', 'scythe'], ['사슬', 'chains'], ['채찍', 'whip'],
    ['반지', 'enchanted ring'], ['왕관', 'crown'], ['갑옷', 'plate armor'], ['망토', 'cloak'], ['가면', 'mask']
  ];

  const MOOD_EN = [
    ['냉정', 'cold and composed'],
    ['냉혹', 'ruthless'], ['차가', 'cold'], ['무뚝뚝', 'stoic'],
    ['과묵', 'taciturn'], ['온화', 'gentle'], ['다정', 'kind'], ['냉소', 'sardonic'],
    ['잔혹', 'cruel'], ['교활', 'cunning'], ['충직', 'loyal'], ['고독', 'solitary'], ['오만', 'arrogant'],
    ['쾌활', 'cheerful'], ['신중', 'cautious'], ['광기', 'mad'], ['우울', 'melancholic'], ['슬픔', 'sorrowful'],
    ['분노', 'wrathful'], ['집착', 'obsessive'], ['침묵', 'silent'], ['고요', 'calm'], ['거만', 'haughty'],
    ['정의', 'righteous'], ['배신', 'treacherous'], ['두려움', 'fearful'], ['자존', 'proud'], ['순수', 'innocent'],
    ['당당', 'confident'], ['영리', 'clever'], ['우아', 'elegant'], ['호기심', 'curious']
  ];

  // 영어로 적힌 칭호에서 직업 단서만 골라내는 작은 사전
  const ROLE_WORDS = [
    ['archmage', 'archmage'], ['grandmaster', 'grandmaster'], ['knight', 'knight'], ['paladin', 'paladin'],
    ['mage', 'mage'], ['wizard', 'wizard'], ['witch', 'witch'], ['sorcerer', 'sorcerer'], ['priest', 'priest'],
    ['king', 'king'], ['queen', 'queen'], ['prince', 'prince'], ['princess', 'princess'], ['noble', 'noble'],
    ['hunter', 'hunter'], ['assassin', 'assassin'], ['captain', 'captain'], ['guardian', 'guardian'],
    ['scholar', 'scholar'], ['druid', 'druid'], ['monk', 'monk'], ['bard', 'bard'], ['merchant', 'merchant'],
    ['pirate', 'pirate'], ['soldier', 'soldier'], ['rogue', 'rogue'], ['alchemist', 'alchemist'],
    ['sentinel', 'sentinel'], ['warlord', 'warlord'], ['squire', 'squire'], ['blacksmith', 'blacksmith']
  ];

  function scanEn(text, table, limit) {
    const src = String(text || '');
    if (!src) return [];
    const out = [];
    table.forEach((pair) => {
      if (out.length >= (limit || 3)) return;
      if (src.indexOf(pair[0]) > -1 && out.indexOf(pair[1]) === -1) out.push(pair[1]);
    });
    return out.slice(0, limit || 3);
  }

  function raceEn(race) {
    const key = String(race || '').trim();
    if (!key) return 'humanoid';
    if (RACE_EN[key]) return RACE_EN[key];
    const hit = Object.keys(RACE_EN).find((k) => key.indexOf(k) > -1);
    if (hit) return RACE_EN[hit];
    if (/^[\x20-\x7E]+$/.test(key)) return key.toLowerCase();
    return 'fantasy humanoid';
  }

  function agePhrase(age) {
    const m = String(age || '').match(/(\d{1,4})\s*(?:세|살)?/);
    if (!m) return '';
    const n = Number(m[1]);
    if (!n || n > 400) return '';
    if (n < 16) return 'young adolescent';
    if (n < 25) return 'young adult';
    if (n < 40) return 'adult in their prime';
    if (n < 60) return 'seasoned middle-aged';
    if (n < 120) return 'elder';
    return 'ancient long-lived being';
  }

  // 성별: 여성 → female, 남성 → male. '기타/미상'이나 빈 값은 프롬프트에 넣지 않는다.
  function genderEn(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return '';
    if (/여|녀|female|woman|girl|f$|^f\b/.test(s)) return 'female';
    if (/남|male|man\b|boy|^m\b/.test(s)) return 'male';
    if (/nonbinary|non-binary|논바이너리/.test(s)) return 'androgynous';
    return '';
  }

  function nameForPrompt(name) {
    const s = String(name || '').trim();
    if (!s) return '';
    return /^[\x20-\x7E]+$/.test(s) ? s : '';
  }

  // 인물 세부정보 → 영어 판타지 일러스트 프롬프트
  function buildPortraitPrompt(fields) {
    const f = fields || {};
    const parts = [];
    const latinName = nameForPrompt(f.name);
    parts.push(latinName ? 'fantasy character portrait of ' + latinName : 'fantasy character portrait');

    const title = String(f.title || '').trim();
    const titleEn = /^[\x20-\x7E]+$/.test(title) ? title.toLowerCase() : '';
    if (titleEn) parts.push(titleEn);

    const race = raceEn(f.race);
    const role = scanEn(title + ' ' + f.faction, ROLE_EN, 1)[0] ||
      scanEn((title + ' ' + String(f.faction || '')).toLowerCase(), ROLE_WORDS, 1)[0] || 'wanderer';
    // 성별을 종족·역할 앞에 넣어 "a female elf knight"처럼 자연스럽게 붙인다
    const gender = genderEn(f.gender);
    const article = /^[aeiou]/i.test(race) ? 'an ' : 'a ';
    parts.push(article + (gender ? gender + ' ' : '') + race + ' ' + role);

    const age = agePhrase(f.age);
    if (age) parts.push(age);

    const gear = scanEn(String(f.abilities || '') + ' ' + String(f.title || ''), GEAR_EN, 2);
    if (gear.length) parts.push('wielding ' + gear.join(' and '));

    const mood = scanEn(String(f.personality || '') + ' ' + String(f.notes || ''), MOOD_EN, 2);
    if (mood.length) parts.push(mood.join(', ') + ' expression');

    const faction = String(f.faction || '').trim();
    if (faction) {
      parts.push(/^[\x20-\x7E]+$/.test(faction)
        ? 'member of ' + faction.toLowerCase()
        : 'bearing the sigil of a ' + (scanEn(faction, ROLE_EN, 1)[0] || 'secret order'));
    }

    const style = 'dark fantasy oil painting, painterly brushwork, dramatic chiaroscuro rim light, '
      + 'ornate engraved background, gold filigree accents, intricate costume details, '
      + 'centered vertical bust composition, looking at viewer, highly detailed face, 4k concept art';
    return parts.filter(Boolean).join(', ') + ', ' + style + ', no text, no watermark, no logo';
  }

  const IMG_ENDPOINT = 'https://image.pollinations.ai/prompt/';

  function portraitUrl(prompt, seed) {
    return IMG_ENDPOINT + encodeURIComponent(String(prompt || '').slice(0, 900)) +
      '?width=768&height=1024&seed=' + (seed || Math.floor(Math.random() * 1e9)) +
      '&nologo=true&model=flux&referrer=arcanum';
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error('이미지를 읽지 못했어요'));
      fr.readAsDataURL(blob);
    });
  }

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('시간 초과')), ms);
      promise.then((v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); });
    });
  }

  // 1) fetch(blob) → 2) <img crossOrigin> 순서로 시도. 둘 다 안 되면 예외.
  async function loadRemote(url, timeoutMs) {
    const budget = timeoutMs || 22000;
    let ctrl = null;
    let timer = 0;
    try {
      if (typeof fetch === 'function') {
        if (typeof AbortController !== 'undefined') ctrl = new AbortController();
        timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, budget);
        const res = await fetch(url, { mode: 'cors', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
        if (res && res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 512 && (!blob.type || blob.type.indexOf('image') === 0)) {
            const dataUrl = await blobToDataURL(blob);
            if (dataUrl.indexOf('data:image') === 0) return dataUrl;
          }
          throw new Error('이미지 응답이 아니에요');
        }
        throw new Error('HTTP ' + (res ? res.status : '?') );
      }
      throw new Error('fetch 없음');
    } catch (e) {
      // fetch가 막혔으면(대개 CORS) 이미지 태그로 한 번 더 — 이 시도는 짧게 끊는다
      return await withTimeout(loadViaImg(url), Math.min(9000, budget));
    } finally {
      clearTimeout(timer);
    }
  }

  function loadViaImg(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = img.naturalWidth || 768;
          cv.height = img.naturalHeight || 1024;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(cv.toDataURL('image/jpeg', 0.88));
        } catch (err) {
          reject(new Error('이미지를 캔버스에 그릴 수 없어요(CORS)'));
        }
      };
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요'));
      img.src = url;
    });
  }

  async function shrinkToPortrait(src, maxDim, quality) {
    const img = await U.loadImage(src);
    const md = maxDim || 900;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(1, md / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#171310';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', quality || 0.85);
  }

  // 원격 AI 시도 → 실패해도 앱은 멈추지 않고 { ok:false, prompt } 를 돌려준다.
  async function generatePortrait(fields, opts) {
    const o = opts || {};
    const prompt = buildPortraitPrompt(fields);
    const url = portraitUrl(prompt, o.seed);
    try {
      const raw = await loadRemote(url, o.timeoutMs || 25000);
      const dataUrl = await shrinkToPortrait(raw, o.maxDim || 900, 0.86);
      if (!dataUrl || dataUrl.length < 2000) throw new Error('빈 이미지');
      return { ok: true, dataUrl, prompt, url };
    } catch (err) {
      return { ok: false, prompt, url, reason: (err && err.message) || '연결 실패' };
    }
  }

  /* ---------------- 오프라인 폴백: 문장(紋章) 실루엣 초상화 ---------------- */
  function hashStr(s) {
    let h = 2166136261;
    const str = String(s || 'arcanum');
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fallbackPortrait(fields) {
    const f = fields || {};
    const seed = hashStr([f.name, f.title, f.race, f.faction, f.age, f.gender].join('|'));
    const rnd = mulberry32(seed);
    const W = 768, H = 1024;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    if (!ctx) return '';

    const palettes = [
      ['#121a24', '#2b1c2e', '#d4af37'],
      ['#101a16', '#22301f', '#c9b06a'],
      ['#1a1216', '#3a1d22', '#e8c67a'],
      ['#141018', '#241a34', '#b9a9d4'],
      ['#1b1509', '#33260f', '#e6cd86']
    ];
    const pal = palettes[Math.floor(rnd() * palettes.length)];
    const gold = pal[2];

    // 배경
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, pal[0]);
    bg.addColorStop(1, pal[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const radial = ctx.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.42, W * 0.92);
    radial.addColorStop(0, 'rgba(255, 240, 200, .16)');
    radial.addColorStop(.55, 'rgba(255, 240, 200, .04)');
    radial.addColorStop(1, 'rgba(0, 0, 0, .55)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // 별가루
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H * 0.8;
      ctx.globalAlpha = 0.15 + rnd() * 0.5;
      ctx.fillStyle = i % 7 === 0 ? gold : '#f6ecd4';
      ctx.beginPath();
      ctx.arc(x, y, rnd() * 1.5 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 문장 원 + 룬
    const cx = W * 0.5, cy = H * 0.40, R = W * 0.30;
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = R * 0.92, r2 = R * (i % 3 === 0 ? 1.02 : 0.98);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 실루엣(어깨 + 머리) — 성별에 따라 어깨 폭을 조금 다르게 잡는다
    const bodyGender = genderEn(f.gender);
    const shoulder = bodyGender === 'female' ? 0.30 : (bodyGender === 'male' ? 0.355 : 0.33);
    const headY = H * 0.40, headRx = W * 0.115, headRy = W * 0.145;
    ctx.save();
    const bodyGrad = ctx.createLinearGradient(0, headY, 0, H);
    bodyGrad.addColorStop(0, '#0d0a08');
    bodyGrad.addColorStop(1, '#1b1410');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - W * shoulder, H);
    ctx.bezierCurveTo(W * 0.5 - W * (shoulder + 0.01), H * 0.70, W * 0.5 - W * 0.16, H * 0.58, W * 0.5 - W * 0.075, H * 0.545);
    ctx.lineTo(W * 0.5 - W * 0.045, headY + headRy * 0.86);
    ctx.lineTo(W * 0.5 + W * 0.045, headY + headRy * 0.86);
    ctx.lineTo(W * 0.5 + W * 0.075, H * 0.545);
    ctx.bezierCurveTo(W * 0.5 + W * 0.16, H * 0.58, W * 0.5 + W * (shoulder + 0.01), H * 0.70, W * 0.5 + W * shoulder, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, headY, headRx, headRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 금빛 테두리 빛(림 라이트)
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, headY, headRx, headRy, 0, Math.PI * 0.72, Math.PI * 1.55);
    ctx.stroke();
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - W * 0.075, H * 0.545);
    ctx.bezierCurveTo(W * 0.5 - W * 0.2, H * 0.60, W * 0.5 - W * 0.3, H * 0.72, W * 0.5 - W * 0.31, H);
    ctx.stroke();
    ctx.restore();

    // 문장 표식 — 가문 문양(움직이는 빛)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.6;
    const spikes = 8 + Math.floor(rnd() * 4);
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const len = R * (i % 2 === 0 ? 0.62 : 0.38);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;

    // 하단 장식 + 이름
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(W * 0.22, H * 0.905);
    ctx.lineTo(W * 0.78, H * 0.905);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - 8, H * 0.905);
    ctx.lineTo(W * 0.5, H * 0.895);
    ctx.lineTo(W * 0.5 + 8, H * 0.905);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const name = String(f.name || '').trim();
    if (name) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f2e5c6';
      ctx.font = '600 40px "AppleMyungjo", "Nanum Myeongjo", Georgia, serif';
      ctx.fillText(name, W * 0.5, H * 0.945, W * 0.82);
    }

    // 프레임
    ctx.strokeStyle = gold;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(32, 32, W - 64, H - 64);
    ctx.globalAlpha = 1;

    try {
      return cv.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      return '';
    }
  }

  global.Generator = { open, genNames, genPlaces, STYLE_LABEL, PLACE, buildPortraitPrompt, portraitUrl, generatePortrait, fallbackPortrait };
})(window);
