"""
기획점검 계획안 HTML 파서
f1990c28-기획점검계획안 및 869729e5-모니터링계획안 HTML 파일 파싱
"""
import re
from bs4 import BeautifulSoup
from collections import defaultdict


# 월 컬럼 매핑: 컬럼 인덱스 → 월 번호 (0-based, 헤더 기준)
# D컬럼(idx 3)=01월, E(idx 4)=02월, F(idx 5)=03월,
# G(idx 6)=04월, H(idx 7)=05월, I(idx 8)=06월
MONTH_COL_MAP = {3: '01', 4: '02', 5: '03', 6: '04', 7: '05', 8: '06'}


def parse_plan_html(filepath: str) -> dict:
    """
    기획점검 or 모니터링 계획안 HTML 파싱.

    Returns:
        {
          '이주민': {
            '01': ['유리제 주방용품 배송 점검', ...],
            '02': [...],
          },
          ...
        }
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'lxml')
    rows = soup.find_all('tr')

    result = defaultdict(lambda: defaultdict(list))
    current_person = None

    for row in rows:
        cells = row.find_all(['td', 'th'])
        # freeze bar 셀 제거
        visible_cells = [c for c in cells if 'freezebar-cell' not in c.get('class', [])]

        if not visible_cells:
            continue

        cell_texts = [c.get_text(strip=True) for c in visible_cells]

        # 담당자 이름 감지 (B열 또는 C열 병합셀)
        for i, cell in enumerate(visible_cells):
            text = cell.get_text(strip=True)
            if text and _is_person_name(text):
                current_person = text
                break

        if current_person is None:
            continue

        # 항목 내용이 있는 행 처리 (D~I 컬럼 대응)
        # visible_cells 구조: [A, B(담당자or empty), 항목1..6]
        # 헤더행: [구분, 담당자, D, E, F, G, H, I] or
        # 데이터행: [A, (empty), D, E, F, G, H, I]
        # A열(idx 0), B열(idx 1, 담당자), C열(idx 2, 없음?), D~I(idx 3~8)
        # 실제로 freeze bar 제외 후 visible 구조 확인 필요

        # D~I 컬럼에 해당하는 셀들에서 항목 추출
        for col_offset, month in MONTH_COL_MAP.items():
            if col_offset < len(visible_cells):
                cell_text = visible_cells[col_offset].get_text(strip=True)
                if cell_text:
                    items = _extract_items(cell_text)
                    for item in items:
                        if item and item not in result[current_person][month]:
                            result[current_person][month].append(item)

    return dict(result)


def _is_person_name(text: str) -> bool:
    """한국어 이름 3글자 패턴 감지"""
    # 2~4글자 한글 이름, 숫자 없음
    return bool(re.match(r'^[가-힣]{2,4}$', text)) and text not in {
        '담당자', '시즌특성', '구분', '계획', '수시', '모니터링',
        '기획점검', '상품', '이슈'
    }


def _extract_items(text: str) -> list:
    """셀 텍스트에서 점검 항목 추출"""
    items = []
    # 줄바꿈으로 분리
    lines = [l.strip() for l in text.replace('\r', '\n').split('\n') if l.strip()]

    for line in lines:
        # "1. 항목명 (O)" 형식 처리
        clean = re.sub(r'^\d+\.\s*', '', line)  # 번호 제거
        clean = re.sub(r'\s*\([OX△]\)\s*$', '', clean)  # 상태 제거
        clean = clean.strip()
        if clean and len(clean) > 3:
            items.append(clean)

    return items
