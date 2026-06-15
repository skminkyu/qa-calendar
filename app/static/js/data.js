/**
 * QA 캘린더 초기 데이터 (계획안 PPTX 구조 기반)
 * 셀 구조: {text, rowspan, colspan, type, editable, key}
 *   type: 'header' | 'season' | 'label' | 'sublabel' | 'editable' | 'issue-label' | 'issue-sublabel' | 'issue-editable'
 *   key: 고유 식별자 (데이터 저장용)
 */

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

const SEASONS = [
  '새해',
  '설 명절\n발렌타인데이',
  '신학기\n화이트데이',
  '봄(환절기)\n이사철',
  '가정의 달',
  '캠핑시즌\n물놀이',
  '하절기',
  '휴가철\n역시즌상품',
  '추석 명절',
  '가을(환절기)',
  '김장철\n수능',
  '크리스마스',
];

// 슬라이드 1 행 정의
// 각 행은 배열: [{text, rowspan=1, colspan=1, type, editable, key}, ...]
function buildSlide1Rows() {
  // Row 0: 헤더
  const r0 = [
    { text: '구분', colspan: 4, type: 'header' },
    ...MONTHS.map((m, i) => ({ text: m, type: 'header', key: `hdr_${MONTH_KEYS[i]}` }))
  ];

  // Row 1: 시즌특성
  const r1 = [
    { text: '시즌특성', colspan: 4, type: 'sublabel' },
    ...SEASONS.map((s, i) => ({ text: s, type: 'season', key: `season_${MONTH_KEYS[i]}` }))
  ];

  // Row 2: 기획점검 / 계획 / 상품
  const r2 = [
    { text: '기획\n점검', rowspan: 4, type: 'label' },
    { text: '계획', rowspan: 3, type: 'sublabel' },
    { text: '', rowspan: 3, type: 'sublabel' },
    { text: '상품', type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_plan_product_${mk}`, autofillKey: `plan_product_${mk}` }))
  ];

  // Row 3: 현장
  const r3 = [
    { text: '현장', type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_plan_field_${mk}`, autofillKey: `plan_field_${mk}` }))
  ];

  // Row 4: 모니터링
  const r4 = [
    { text: '모니터링', type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_plan_monitor_${mk}`, autofillKey: `plan_monitor_${mk}` }))
  ];

  // Row 5: 수시
  const r5 = [
    { text: '수시', colspan: 3, type: 'sublabel' },
    { text: '', type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_suisi_${mk}`, autofillKey: `suisi_${mk}` }))
  ];

  // Row 6: 대외기관/ESG
  const r6 = [
    { text: '대외기관\n/ ESG', colspan: 4, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_external_${mk}` }))
  ];

  // Row 7: 언론보도
  const r7 = [
    { text: '언론보도', colspan: 4, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_press_${mk}` }))
  ];

  // Row 8: 품질교육
  const r8 = [
    { text: '품질교육', colspan: 4, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_edu_${mk}` }))
  ];

  // Row 9: 세미나
  const r9 = [
    { text: '세미나', colspan: 4, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_seminar_${mk}` }))
  ];

  // Row 10: 품질기획 / QA정책
  const r10 = [
    { text: '품\n질\n기\n획', rowspan: 3, colspan: 2, type: 'label' },
    { text: 'QA\n정책', rowspan: 1, colspan: 2, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_qa_policy_${mk}` }))
  ];

  // Row 11: 사업추진
  const r11 = [
    { text: '사업\n추진', colspan: 2, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_business_${mk}` }))
  ];

  // Row 12: 시스템
  const r12 = [
    { text: '시스템', colspan: 2, type: 'sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'editable', editable: true, key: `s1_system_${mk}` }))
  ];

  return [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12];
}

// 슬라이드 2 행 정의
function buildSlide2Rows() {
  // Row 0: 헤더
  const r0 = [
    { text: '구분', colspan: 2, type: 'header' },
    ...MONTHS.map((m, i) => ({ text: m, type: 'header', key: `s2_hdr_${MONTH_KEYS[i]}` }))
  ];

  // Row 1: 시즌특성
  const r1 = [
    { text: '시즌특성', colspan: 2, type: 'sublabel' },
    ...SEASONS.map((s, i) => ({ text: s, type: 'season', key: `s2_season_${MONTH_KEYS[i]}` }))
  ];

  // Row 2: 방송상품
  const r2 = [
    { text: '상\n품\nQ\nA\n진\n행\n이\n슈', rowspan: 3, type: 'issue-label' },
    { text: '방송\n상품', type: 'issue-sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'issue-editable', editable: true, key: `s2_broadcast_${mk}`, autofillKey: `broadcast_${mk}` }))
  ];

  // Row 3: 현장
  const r3 = [
    { text: '현장', type: 'issue-sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'issue-editable', editable: true, key: `s2_field_${mk}`, autofillKey: `field_qa_${mk}` }))
  ];

  // Row 4: 암행
  const r4 = [
    { text: '암행', type: 'issue-sublabel' },
    ...MONTH_KEYS.map(mk => ({ text: '', type: 'issue-editable', editable: true, key: `s2_secret_${mk}`, autofillKey: `secret_${mk}` }))
  ];

  return [r0, r1, r2, r3, r4];
}

// 앱 상태
const AppState = {
  slide1Rows: buildSlide1Rows(),
  slide2Rows: buildSlide2Rows(),
  // 셀 데이터 저장소: key → text
  cellData: {},

  getCell(key) {
    return this.cellData[key] || '';
  },
  setCell(key, text) {
    this.cellData[key] = text;
  },
  // 자동기재 여부 추적
  autofilledKeys: new Set(),
};

// 계획안 초기 데이터 (PPTX 계획안 내용 기반)
const PLAN_DEFAULTS = {
  // 슬라이드 1 - 계획/상품 (월별)
  s1_plan_product_01: '특별관리 임산물 인증여부 점검\n\n건강기능식품 오메가3 영양성분 점검\n\n방한용품(신발, 마스크) 품질점검\n\n겨울철 다소비 수산물 기준 규격 점검',
  s1_plan_product_02: '의약외품 마스크 효능효과 기획점검\n\n화장품 보존료 사용 점검\n\n화장품(미스트류) CMIT/MIT 점검\n\n합성수지 어린이 제품 유해물질 점검',
  s1_plan_product_03: '건강기능식품, 종합비타민 기능성분 점검\n\n수입 건강기능식품 기능성분 함량 점검\n\n등산화 소재동일성 점검\n\n어린이용 장신구 안전기준 점검',
  s1_plan_product_04: '장기구성 건강식품 소비기한 점검\n\n보존료 무첨가 식품 점검\n\n제철과일 품질 점검\n\n자외선차단 화장품 SPF 점검',
  s1_plan_product_05: '영·유아 섭취대상 식품 점검\n\n젤리형 건강기능식품 기능성분 점검\n\n초여름 도시락/반찬 미생물 검사\n\n감귤류 중금속 점검',
  s1_plan_product_06: '기초화장품 미생물 검출 점검\n\n영양성분 강조 식품 영양성분 점검\n\n아쿠아슈즈 유해물질점검\n\n캠핑용 레토르트 점검',
  s1_plan_product_07: '슬리밍 식품 기준규격 점검\n\n선크림 화장품 점검\n\n양우산 표시사항 점검\n\n습기제거제 안전확인신고사항 점검',
  s1_plan_product_08: '단백질 보충제 기준규격 점검\n\n하절기 쿠션류 화장품 점검\n\n장마철 농수산물 점검\n\n아이스크림 및 빙과류 배송 점검',
  s1_plan_product_09: '추석 선물세트 점검\n\n분말 식품 금속성 이물점검\n\n색조 및 수입화장품 잔여 사용기한 점검\n\n추석 명절 식품 기준 규격 점검',
  s1_plan_product_10: '효소식품 기준규격 점검\n\n두뇌 건강 건강기능식품 기능성분 점검\n\n키친타올 유해물질 점검\n\n실내 운동기구 표시사항 점검',
  s1_plan_product_11: '식용유지류 잔류용매 점검\n\n젓갈류 기준규격 점검\n김장철 식재료 점검\n\n분사형 탈취제 상품 MIT/CMIT 점검',
  s1_plan_product_12: '헤어 제품 유해물질 점검\n\n겨울철 다소비 수산물 기준 규격 점검\n\n김서림방지제 점검\n\n동절기 유리용기 사용 점검',

  // 계획/현장
  s1_plan_field_01: '과일 선별장 현장점검\n\n설 명절 식품 제조공장 위생 현장점검',
  s1_plan_field_02: '패션PB, 직매입 입고대상 품질확인 현장점검',
  s1_plan_field_06: '활수산물 선별장 점검',
  s1_plan_field_07: '역시즌 PB상품 품질 점검',
  s1_plan_field_08: '패션PB, 직매입 입고대상 품질확인 현장점검',
  s1_plan_field_09: '추석 명절 식품 제조공장 위생 현장점검',
  s1_plan_field_11: '김치 업체 현장점검',
  s1_plan_field_12: '만감류, 체리류 선별장 현장점검',

  // 계획/모니터링
  s1_plan_monitor_01: '홍삼 건강기능식품 상품 정보고시 모니터링\n\n속눈썹접착제 표시광고 모니터링\n\n마스크팩 표시광고 모니터링',
  s1_plan_monitor_02: '식품 소비기한 표시 변경적용 모니터링\n\n무독성 과대광고 모니터링\n\n두피마사지기 표시광고 모니터링\n\n전동킥보드 KC인증사항 모니터링',
  s1_plan_monitor_03: '여성청결제 표시광고 모니터링\n\n어린이용 매트 환경성 표시광고 모니터링\n\n의약품 오인 화장품 표시광고 모니터링',
  s1_plan_monitor_04: '일반식품 수면, 숙면 과대광고 모니터링\n\n선크림 표시광고 모니터링\n\n자외선 차단, 태닝제품 과대광고 모니터링',
  s1_plan_monitor_05: '의료기기 광고심의필 표시광고 모니터링\n\n슬리밍 표방 화장품류 과대광고 모니터링\n\n수세미 환경성 표시광고 모니터링',
  s1_plan_monitor_06: '마사지용 화장품 광고 모니터링\n\n다이어트식품(일반식품) 모니터링 점검\n\n튼살 표현 모니터링\n\n제모 제품 표시광고 모니터링',
  s1_plan_monitor_07: '룸스프레이 안전확인신고 모니터링\n\n살리실릭에씨드 성분 과대광고 모니터링\n\n습기제거제 안전확인신고 여부 점검',
  s1_plan_monitor_08: '베이비 마사지용 화장품 과대광고 모니터링\n\n클렌징 크림 화장품 표시광고 모니터링\n\n섬유탈취제 표시사항 모니터링',
  s1_plan_monitor_09: '당류제로(무설탕) 표현관련 법규적용 모니터링\n\n친환경 유기농 식품 상품정보 모니터링\n\n여드름피부 완화 인체 기능성 화장품 모니터링',
  s1_plan_monitor_10: '아로마오일 과대광고 모니터링\n\n바디오일 표시광고 모니터링\n\n마이크로니들 표현 제품 표시광고 모니터링\n\n전기매트 KC인증사항 모니터링',
  s1_plan_monitor_11: '무알콜 음료 표시광고 모니터링\n\nLED마스크 의료기기 오인광고 모니터링\n\n운동매트 환경성 표시광고 모니터링',
  s1_plan_monitor_12: '바디용 화장품 표시광고 모니터링\n\n크리스마스 연관상품 표시광고 모니터링\n\n운동매트 환경성 표시광고 모니터링',

  // 대외기관
  s1_external_01: '[대한무역투자진흥공사]\n해외 수출 바우처 사업 지원 및 수출 컨설팅 논의\n\n[한국식품과학연구원]\n식품현장 컨설팅 및 협력 논의',
  s1_external_02: '[KOTITI시험연구원]\n식의약 CS파트 업무미팅\n\n[CESCO]\n26 Food Safety Trend 세미나',
  s1_external_03: '[한국환경공단]\n2026 EPR제도 합동 설명회\n\n[식품의약품안전처 외]\n위조 화장품 대응방안 간담회',
  s1_external_04: '[한국제품안전관리원]\n위해상품 AI 프로세스 및 도입 성과 발표\n\n[한국중소벤처기업유통원]\n직거래사업 상품 안전성 점검',
  s1_external_05: '[한국국제전시]\n서울 국제 화장품 미용산업 박람회',
  s1_external_06: '[대한무역투자진흥공사]\nSeoul Food 박람회 참석',
  s1_external_07: '[한국인정기구 KOLAS]\n효율관리제도 온라인관리 참여사 간담회',
  s1_external_08: '[한국환경산업기술원]\n온라인 유통플랫폼 협업체계 간담회',
  s1_external_09: '[한국제품안전관리원]\n어린이제품 안전관리 제도 설명회',
  s1_external_10: '[KATRI시험연구원]\n환경성 개선제품 표시광고 설명회',
  s1_external_11: '[한국환경산업기술원]\n생활화학제품 이행 협의체 간담회',

  // 언론보도
  s1_press_01: '[명절 식품 안전점검]\nQA, SCM 설명절 식품 안전 현장점검 진행',

  // 품질교육
  s1_edu_01: '[AI 품질영상 제작]\n- 립스틱 스웨팅 현상\n- 봉지과자 속 질소\n- 슬라임의 위험성',
  s1_edu_02: '[AI 품질영상 제작]\n- 화장품 자외선 차단지수\n- 농산물 특성에 따른 보관관리',
  s1_edu_03: '[AI 품질영상 제작]\n- 패딩/다운 세탁관리\n- 공기청정기 제품 선택 품질 기준',
  s1_edu_04: '[AI 품질영상 제작]\n- 프라이팬 코팅 종류와 관리법\n- 저당 밥솥의 원리와 한계',
  s1_edu_05: '[AI 품질영상 제작]\n\n[품질교육 행사]',
  s1_edu_06: '[AI 품질영상 제작]',
  s1_edu_07: '[AI 품질영상 제작]',
  s1_edu_08: '[AI 품질영상 제작]',
  s1_edu_09: '[AI 품질영상 제작]',
  s1_edu_10: '[AI 품질영상 제작]\n\n[품질교육]',
  s1_edu_11: '[AI 품질영상 제작]',
  s1_edu_12: '[AI 품질영상 제작]',

  // 세미나
  s1_seminar_02: '[한국제품안전관리원]\n전기용품 안전관리책임자 교육 온라인 기본과정',
  s1_seminar_03: '[CESCO]\nHACCP 위해요소분석 작성 실무 세미나',
  s1_seminar_04: '[FITI 시험연구원]\nQA-심의 연계 기능성 시험교육',
  s1_seminar_05: '[한국전기안전공사]\n전기사고조사전문교육',
  s1_seminar_07: '[한국제품안전관리원]\n전기용품 안전관리책임자 교육 심화과정\n\n[대한화장품산업연구원]\n화장품 GMP 내부심사원',
  s1_seminar_08: '[영업자 교육 이수]\n건강기능식품 유통전문판매원 필수 교육 이수',
  s1_seminar_10: '[CESCO]\n해충방어와 이물제어를 통한 클레임 예방관리',

  // QA정책
  s1_qa_policy_01: '[명절식품 관리계획]\n설 식품 안전관리 계획 수립, 시행\n\n[중장기 추진계획]\n팀 중장기 계획 수립',
  s1_qa_policy_02: '[PB/LB 품질간담회]\n품질관련 리뷰 및 개선방안 도출',
  s1_qa_policy_03: '[긴급품질경고(EQS)]\n론칭 3일이내 Critical 이슈 처리 기준',
  s1_qa_policy_04: '[식품 위해요소 매뉴얼]\n식품 QA 메뉴 통일화 및 위해요소 매뉴얼 작성',
  s1_qa_policy_05: '[협력사 QA Grading]\n제조등급제 도입',
  s1_qa_policy_07: '[PB/LB 품질간담회]\n품질관련 리뷰 및 개선방안 도출',
  s1_qa_policy_09: '[명절식품 관리계획]\n추석 식품 안전관리 계획 수립, 시행',
  s1_qa_policy_10: '[SQR 전문 자격 취득]\nSQR 개발자 자격증\n\n[AI 상세페이지 심의]\n자동 심의 시스템 도입',
  s1_qa_policy_11: '[ISO 심사원 자격 취득]\n품질경영시스템 내부 심사원',

  // 사업추진
  s1_business_01: '[콜드체인 모니터링]\n온도변색라벨 부착 검토\n\n[포장 개선 프로젝트]\n제품별 포장가이드 수립',
  s1_business_02: '[축산기업중앙회]\n식육판매업자 축산물 위생교육 수료증 갱신',
  s1_business_03: '[디지털 제품 여권]\n원산지, 제조공정, 시험결과 등 QR제공',
  s1_business_04: '[마포구보건소]\n의료기기판매업자자율 점검표 제출\n\n[한국환경공단]\n재활용의무대상 제품',
  s1_business_05: '[식품안전정보원]\n건강기능식품 이력추적관리시스템 정기심사',
  s1_business_06: '[식품안전가이드]\n하절기 냉동, 냉장안전가이드 배포',
  s1_business_07: '[QA가이드북]\n26년 QA Guidebook, 전자책 발간',
  s1_business_11: '[동절기 배송포장 가이드]\n포스터 제작 SCM업로드',

  // 시스템
  s1_system_02: '[RPA 대외기관정보 수신 개선]\n정보수신 대외기관 인증기관 등록 추가',
  s1_system_05: '[BO 키워드 모니터링]\nOCR 활용 상세페이지 키워드 모니터링 개선',
  s1_system_11: '[직매입 소비기한 연동]\n직매입 로트 관리 및 프론트 노출',
};

// 초기 데이터 로드
function initDefaultData() {
  for (const [key, text] of Object.entries(PLAN_DEFAULTS)) {
    AppState.cellData[key] = text;
  }
}
