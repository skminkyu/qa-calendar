"""
Key Metric HTML 파서
bf3e75d7-키메트릭 HTML 파싱

컬럼 구조 (0-based, freezebar 포함):
0=rownum, 1=A, 2=상품주문일, 3=상품코드, 4=상품명, 5=주문옵션,
6=점검결과, 7=점검일, 8=MD명, 9=판매구분, 10=소싱매체,
11=업체명, 12=배송일, 13=점검목적, 14=부적합유형, 15=조치사항,
16=공인시험의뢰, 17=기타시험기관명, 18=시험기관명, 19=샘플처리,
20=QA담당자, 21=QA담당자의견
"""
import re
from bs4 import BeautifulSoup
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class InspectionRecord:
    order_date: str
    product_code: str
    product_name: str
    result: str           # 적합/부적합/해당없음
    inspection_date: str
    md_name: str
    sourcing: str         # 방송/모바일
    inspection_purpose: str  # 기획점검/동일성점검/기타/VOC이슈/대외이슈
    defect_type: str      # 부적합유형
    measure: str          # 조치사항
    qa_person: str
    qa_opinion: str
    month: str            # 01~12

    @property
    def inspection_name(self) -> str:
        """QA담당자의견에서 점검명 추출"""
        if not self.qa_opinion:
            return ''
        # 첫 번째 구분자(※, -, :) 이전 텍스트
        name = re.split(r'\s*[※\-:]\s*', self.qa_opinion)[0].strip()
        return name[:80]


def parse_keymetric_html(filepath: str) -> list:
    """
    Key Metric HTML 파싱하여 InspectionRecord 리스트 반환
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'lxml')
    rows = soup.find_all('tr')

    records = []
    for row in rows[3:]:  # 헤더 2행 + 공백 1행 건너뜀
        cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
        if len(cells) < 22:
            continue

        order_date = cells[2]
        if not order_date or '2026/' not in order_date:
            continue

        month = order_date[5:7]

        record = InspectionRecord(
            order_date=order_date,
            product_code=cells[3],
            product_name=cells[4],
            result=cells[6],
            inspection_date=cells[7],
            md_name=cells[8],
            sourcing=cells[10],
            inspection_purpose=cells[13],
            defect_type=cells[14],
            measure=cells[15],
            qa_person=cells[20],
            qa_opinion=cells[21],
            month=month,
        )
        records.append(record)

    return records


def get_암행_by_month(records: list) -> dict:
    """
    암행점검(기획점검 중 부적합) 상품을 월별·부적합유형별로 집계.
    캘린더 암행 섹션에는 기획점검 수행 중 발견된 부적합 상품이 기재됨.

    Returns:
        {
          '01': {
            '제품 표시/광고': ['상품명1', '상품명2', ...],
            '제품 품질': [...],
          },
          ...
        }
    """
    result = defaultdict(lambda: defaultdict(list))
    seen = set()

    for r in records:
        if r.inspection_purpose == '기획점검' and r.result == '부적합':
            유형 = r.defect_type or '기타'
            product = _clean_product_name(r.product_name)
            key = (r.month, 유형, product)
            if product and key not in seen:
                seen.add(key)
                result[r.month][유형].append(product)

    return dict(result)


def get_기획점검_by_month(records: list) -> dict:
    """
    기획점검 레코드를 월별·QA담당자별 점검명으로 집계 (중복 제거)

    Returns:
        {
          '01': {
            '이주민': ['유리재질 주방용품 기획점검', ...],
            ...
          }
        }
    """
    result = defaultdict(lambda: defaultdict(list))
    seen = defaultdict(set)  # (month, qa_person, name) 중복 방지

    for r in records:
        if r.inspection_purpose not in ('기획점검', '기타'):
            continue

        name = r.inspection_name
        if not name or len(name) < 4:
            continue

        key = (r.month, r.qa_person, name)
        if key in seen:
            continue
        seen.add(key)

        result[r.month][r.qa_person].append(name)

    return dict(result)


def _clean_product_name(name: str) -> str:
    """대괄호 브랜드 태그 제거 후 상품명 정리"""
    # [브랜드] 제거
    name = re.sub(r'^\[[^\]]+\]', '', name).strip()
    # 옵션 정보 제거 (긴 상품명 앞부분만 사용)
    return name[:40].strip()
