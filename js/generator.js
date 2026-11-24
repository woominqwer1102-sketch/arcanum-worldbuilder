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

  global.Generator = { open, genNames, genPlaces, STYLE_LABEL, PLACE };
})(window);
