#!/usr/bin/env python3
"""
QA 캘린더 자동 작성 시스템 CLI

사용법:
    python main.py \
        --plan-inspection 기획점검계획.html \
        --plan-monitoring 모니터링계획.html \
        --keymetric 키메트릭.html \
        --biweekly 바이위클리1.pptx 바이위클리2.pptx \
        --output qa_calendar_output.xlsx
"""
import argparse
import sys
import os
from collections import defaultdict

from qa_calendar.parsers.plan_html_parser import parse_plan_html
from qa_calendar.parsers.keymetric_parser import (
    parse_keymetric_html, get_암행_by_month, get_기획점검_by_month
)
from qa_calendar.parsers.biweekly_parser import parse_biweekly, QAIssue
from qa_calendar.matcher import (
    extract_keywords, match_plan_to_keymetric, classify_keymetric_items
)
from qa_calendar.generator.excel_generator import generate_calendar_excel


MONTH_KEYS = ['01', '02', '03', '04', '05', '06',
              '07', '08', '09', '10', '11', '12']


def build_plan_items_by_month(inspection_plan: dict, monitoring_plan: dict) -> dict:
    """
    기획점검 + 모니터링 계획안을 월별 항목 딕셔너리로 통합

    Returns:
        {month_key: {'상품': [...], '현장': [...], '모니터링': [...]}}
    """
    result = defaultdict(lambda: {'상품': [], '현장': [], '모니터링': []})

    # 기획점검 계획 → 상품
    for person, months in inspection_plan.items():
        for mk, items in months.items():
            for item in items:
                if item not in result[mk]['상품']:
                    result[mk]['상품'].append(item)

    # 모니터링 계획 → 모니터링
    for person, months in monitoring_plan.items():
        for mk, items in months.items():
            for item in items:
                if item not in result[mk]['모니터링']:
                    result[mk]['모니터링'].append(item)

    return dict(result)


def build_unplanned_by_month(keymetric_records: list,
                              all_plan_items: list) -> dict:
    """
    키메트릭 기획점검 중 계획안에 없는 수시 항목 추출

    Returns:
        {month_key: [inspection_name, ...]}
    """
    plan_keywords_list = [
        (item, extract_keywords(item)) for item in all_plan_items
    ]

    seen = set()
    result = defaultdict(list)

    for r in keymetric_records:
        if r.inspection_purpose not in ('기획점검', '기타'):
            continue
        name = r.inspection_name
        if not name or len(name) < 4:
            continue

        key = (r.month, name)
        if key in seen:
            continue
        seen.add(key)

        # 계획안 매칭 여부 확인
        import re
        opinion_words = set(re.findall(r'[가-힣]{2,}', r.qa_opinion or ''))
        is_planned = False
        for plan_item, plan_kws in plan_keywords_list:
            if len(plan_kws) >= 2:
                common = plan_kws & opinion_words
                if len(common) >= min(2, len(plan_kws)):
                    is_planned = True
                    break

        if not is_planned:
            result[r.month].append(name)

    return dict(result)


def build_issue_data(biweekly_list: list, 암행_by_month: dict) -> dict:
    """
    바이위클리 QA 이슈 + 암행 데이터를 월별로 통합

    Returns:
        {month_key: {'방송상품': [QAIssue, ...], '현장QA': [...], '암행': {...}}}
    """
    result = defaultdict(lambda: {'방송상품': [], '현장QA': [], '암행': {}})

    for bw in biweekly_list:
        mk = bw.month
        for issue in bw.qa_issues:
            if issue.category == '방송상품':
                result[mk]['방송상품'].append(issue)
            elif issue.category == '현장QA':
                result[mk]['현장QA'].append(issue)
            # 암행은 키메트릭 데이터 사용

    # 암행 데이터 (키메트릭 기준)
    for mk, type_dict in 암행_by_month.items():
        result[mk]['암행'] = type_dict

    return dict(result)


def main():
    parser = argparse.ArgumentParser(
        description='QA 캘린더 자동 작성 시스템',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--plan-inspection', required=True,
        help='기획점검 계획안 HTML 파일 경로'
    )
    parser.add_argument(
        '--plan-monitoring', required=True,
        help='모니터링 계획안 HTML 파일 경로'
    )
    parser.add_argument(
        '--keymetric', required=True,
        help='키메트릭 HTML 파일 경로'
    )
    parser.add_argument(
        '--biweekly', nargs='+', default=[],
        help='바이위클리 PPTX 파일 경로 (복수 지정 가능)'
    )
    parser.add_argument(
        '--output', default='qa_calendar_output.xlsx',
        help='출력 Excel 파일 경로 (기본값: qa_calendar_output.xlsx)'
    )

    args = parser.parse_args()

    # 파일 존재 확인
    for filepath in [args.plan_inspection, args.plan_monitoring, args.keymetric]:
        if not os.path.exists(filepath):
            print(f"❌ 파일을 찾을 수 없습니다: {filepath}", file=sys.stderr)
            sys.exit(1)

    print("📂 파일 파싱 중...")

    # 1. 계획안 파싱
    print(f"  • 기획점검 계획안: {args.plan_inspection}")
    inspection_plan = parse_plan_html(args.plan_inspection)
    print(f"    → 담당자 {len(inspection_plan)}명 파싱 완료")

    print(f"  • 모니터링 계획안: {args.plan_monitoring}")
    monitoring_plan = parse_plan_html(args.plan_monitoring)
    print(f"    → 담당자 {len(monitoring_plan)}명 파싱 완료")

    # 2. 키메트릭 파싱
    print(f"  • 키메트릭: {args.keymetric}")
    keymetric_records = parse_keymetric_html(args.keymetric)
    print(f"    → {len(keymetric_records)}개 레코드 파싱 완료")

    # 3. 바이위클리 파싱
    biweekly_list = []
    for bw_path in args.biweekly:
        if not os.path.exists(bw_path):
            print(f"  ⚠️  바이위클리 파일 없음 (건너뜀): {bw_path}", file=sys.stderr)
            continue
        print(f"  • 바이위클리: {bw_path}")
        bw = parse_biweekly(bw_path)
        biweekly_list.append(bw)
        print(f"    → {bw.date} 데이터 ({len(bw.qa_issues)}개 이슈) 파싱 완료")

    print("\n🔧 데이터 처리 중...")

    # 계획안 전체 항목 수집
    all_plan_items = []
    for person, months in inspection_plan.items():
        for items in months.values():
            all_plan_items.extend(items)
    for person, months in monitoring_plan.items():
        for items in months.values():
            all_plan_items.extend(items)

    # 월별 계획 항목 구성
    plan_by_month = build_plan_items_by_month(inspection_plan, monitoring_plan)
    print(f"  • 계획안 항목: {sum(len(v.get('상품',[])) for v in plan_by_month.values())}개 (상품), "
          f"{sum(len(v.get('모니터링',[])) for v in plan_by_month.values())}개 (모니터링)")

    # 수시 항목 구성
    unplanned_by_month = build_unplanned_by_month(keymetric_records, all_plan_items)
    total_unplanned = sum(len(v) for v in unplanned_by_month.values())
    print(f"  • 수시점검 항목: {total_unplanned}개")

    # 암행 데이터
    암행_by_month = get_암행_by_month(keymetric_records)
    total_암행 = sum(
        sum(len(products) for products in types.values())
        for types in 암행_by_month.values()
    )
    print(f"  • 암행점검 부적합: {total_암행}건")

    # 이슈 데이터
    issue_data = build_issue_data(biweekly_list, 암행_by_month)

    print(f"\n📊 Excel 생성 중: {args.output}")
    generate_calendar_excel(
        output_path=args.output,
        plan_items_by_month=plan_by_month,
        unplanned_items_by_month=unplanned_by_month,
        issue_data=issue_data,
    )

    # 요약 출력
    print("\n📋 처리 결과 요약:")
    for mk in MONTH_KEYS:
        items_count = len(plan_by_month.get(mk, {}).get('상품', []))
        monitor_count = len(plan_by_month.get(mk, {}).get('모니터링', []))
        suisi_count = len(unplanned_by_month.get(mk, []))
        방송_count = len(issue_data.get(mk, {}).get('방송상품', []))
        현장_count = len(issue_data.get(mk, {}).get('현장QA', []))
        암행_types = issue_data.get(mk, {}).get('암행', {})
        암행_count = sum(len(v) for v in 암행_types.values())

        if any([items_count, monitor_count, suisi_count, 방송_count, 현장_count, 암행_count]):
            print(f"  {mk}월: 기획점검{items_count}+모니터링{monitor_count}+수시{suisi_count} | "
                  f"방송{방송_count}/현장{현장_count}/암행{암행_count}건")


if __name__ == '__main__':
    main()
