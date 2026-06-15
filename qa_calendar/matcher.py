"""
계획안 항목 vs 키메트릭 레코드 매칭 엔진

계획안의 각 항목이 키메트릭에 실제로 수행된 기록이 있는지 확인.
매칭 기준: 계획안 항목명 핵심 키워드가 QA담당자의견에 포함되는지 여부.
"""
import re
from collections import defaultdict


def extract_keywords(text: str) -> set:
    """텍스트에서 매칭용 핵심 키워드 추출 (한글 2글자 이상 단어)"""
    # 불용어 제거
    stopwords = {
        '점검', '기획', '모니터링', '및', '의', '에서', '관련', '대한', '포함',
        '기준', '규격', '사항', '대상', '여부', '확인', '진행', '상품', '제품',
        '검출', '함유', '성분', '가임상', '검사', '안전', '품질'
    }
    words = re.findall(r'[가-힣]{2,}', text)
    return {w for w in words if w not in stopwords and len(w) >= 2}


def match_plan_to_keymetric(plan_items: list, keymetric_opinions: list,
                             threshold: int = 2) -> dict:
    """
    계획안 항목 리스트 vs 키메트릭 QA의견 리스트 매칭

    Args:
        plan_items: 계획안 항목명 리스트
        keymetric_opinions: 키메트릭 QA담당자의견 리스트
        threshold: 일치 키워드 수 기준

    Returns:
        {plan_item: True/False (수행 여부)}
    """
    all_opinions_text = '\n'.join(keymetric_opinions)

    result = {}
    for item in plan_items:
        keywords = extract_keywords(item)
        if not keywords:
            result[item] = False
            continue

        match_count = sum(1 for kw in keywords if kw in all_opinions_text)
        result[item] = match_count >= min(threshold, len(keywords))

    return result


def classify_keymetric_items(keymetric_records: list, plan_items_flat: list) -> dict:
    """
    키메트릭 기획점검 레코드를 계획(matched) vs 수시(unmatched)로 분류

    Returns:
        {
          '계획': [(qa_person, inspection_name), ...],  # 계획안에 있는 항목
          '수시': [(qa_person, inspection_name), ...],  # 계획안에 없는 항목
        }
    """
    plan_keywords_list = [extract_keywords(item) for item in plan_items_flat]

    seen = set()
    classified = defaultdict(list)

    for r in keymetric_records:
        opinion = r.qa_opinion
        if not opinion:
            continue

        # 점검명 추출
        name = r.inspection_name
        if not name or len(name) < 4:
            continue

        key = (r.month, r.qa_person, name)
        if key in seen:
            continue
        seen.add(key)

        # 계획안 항목과 매칭 확인
        opinion_words_set = set(re.findall(r'[가-힣]{2,}', opinion))
        is_planned = False
        for plan_kws in plan_keywords_list:
            if len(plan_kws) >= 2:
                common = plan_kws & opinion_words_set
                if len(common) >= min(2, len(plan_kws)):
                    is_planned = True
                    break

        category = '계획' if is_planned else '수시'
        classified[category].append({
            'month': r.month,
            'qa_person': r.qa_person,
            'name': name,
        })

    return dict(classified)
