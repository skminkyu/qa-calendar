"""
QA 캘린더 웹 애플리케이션
"""
import os
import re
import sys
import json
import tempfile
from pathlib import Path
from collections import defaultdict
from flask import Flask, render_template, request, jsonify, send_file

sys.path.insert(0, str(Path(__file__).parent.parent))

from qa_calendar.parsers.plan_html_parser import parse_plan_html
from qa_calendar.parsers.keymetric_parser import parse_keymetric_html, get_암행_by_month
from qa_calendar.parsers.biweekly_parser import parse_biweekly
from qa_calendar.exporter.pptx_exporter import export_to_pptx

UPLOAD_FOLDER = Path(tempfile.gettempdir()) / 'qa_calendar_uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/autofill', methods=['POST'])
def autofill():
    files = request.files
    results = {}

    try:
        # 기획점검 계획안 파싱 (계획 vs 수시 분류 기준)
        plan_items_by_month = {}   # {month: [item_text, ...]}
        if 'plan_inspection' in files:
            f = files['plan_inspection']
            path = UPLOAD_FOLDER / 'plan_inspection.html'
            f.save(str(path))
            parsed = parse_plan_html(str(path))
            # {person: {month: [items]}} → {month: [items]} 로 평탄화
            plan_items_by_month = _flatten_plan(parsed)

        # 모니터링 계획안 파싱 (그대로 사용)
        if 'plan_monitoring' in files:
            f = files['plan_monitoring']
            path = UPLOAD_FOLDER / 'plan_monitoring.html'
            f.save(str(path))
            parsed = parse_plan_html(str(path))
            results['monitoring'] = _flatten_plan(parsed)

        # 키메트릭 파싱
        if 'keymetric' in files:
            f = files['keymetric']
            path = UPLOAD_FOLDER / 'keymetric.html'
            f.save(str(path))
            records = parse_keymetric_html(str(path))

            # 기획점검 → 계획 vs 수시 분류
            planned, unplanned = _classify_inspections(records, plan_items_by_month)
            results['계획_기획점검'] = planned
            results['수시'] = unplanned

            # 암행 (기획점검 + 부적합)
            암행_data = get_암행_by_month(records)
            results['암행'] = {
                mk: dict(types) for mk, types in 암행_data.items()
            }

        # 바이위클리 파싱
        biweekly_issues = {}
        for key, f in files.items():
            if key.startswith('biweekly'):
                path = UPLOAD_FOLDER / f'biweekly_{key}.pptx'
                f.save(str(path))
                bw = parse_biweekly(str(path))
                mk = bw.month
                if mk not in biweekly_issues:
                    biweekly_issues[mk] = {'방송상품': [], '현장QA': []}

                for issue in bw.qa_issues:
                    entry = {
                        'product': issue.product_name,
                        'md': issue.md_name,
                        'issue': _summarize(issue.issue),
                        'measure': _summarize(issue.measure, 80),
                        'result': issue.result,
                    }
                    if issue.category == '방송상품':
                        biweekly_issues[mk]['방송상품'].append(entry)
                    elif issue.category == '현장QA':
                        biweekly_issues[mk]['현장QA'].append(entry)

        results['biweekly'] = biweekly_issues

        return jsonify({'success': True, 'data': results})

    except Exception as e:
        import traceback
        return jsonify({'success': False, 'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/export', methods=['POST'])
def export():
    data = request.json
    calendar_data = data.get('calendar', {})
    issues_data = data.get('issues', {})

    try:
        output_path = UPLOAD_FOLDER / 'qa_calendar_output.pptx'
        export_to_pptx(str(output_path), calendar_data, issues_data)

        return send_file(
            str(output_path),
            as_attachment=True,
            download_name='26년_품질관리팀_운영캘린더.pptx',
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
    except Exception as e:
        import traceback
        return jsonify({'success': False, 'error': str(e), 'trace': traceback.format_exc()}), 500


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────

def _flatten_plan(parsed: dict) -> dict:
    """
    {person: {month: [items]}} → {month: [unique items]} 로 평탄화
    """
    result = defaultdict(list)
    for person, months in parsed.items():
        for month, items in months.items():
            for item in items:
                if item not in result[month]:
                    result[month].append(item)
    return dict(result)


def _extract_kws(text: str) -> set:
    stopwords = {
        '점검', '기획', '모니터링', '및', '의', '에서', '관련', '대한', '포함',
        '기준', '규격', '사항', '대상', '여부', '확인', '진행', '상품', '제품'
    }
    words = re.findall(r'[가-힣]{2,}', text)
    return {w for w in words if w not in stopwords and len(w) >= 2}


def _classify_inspections(records: list, plan_items_by_month: dict) -> tuple:
    """
    key metric 기획점검 레코드를 계획안 항목과 비교하여 계획 vs 수시로 분류.

    Returns:
        (planned_dict, unplanned_dict) — 둘 다 {month: [item_name]}
    """
    # 전체 계획안 아이템 키워드 리스트 (월 무관)
    all_plan_items = []
    for items in plan_items_by_month.values():
        all_plan_items.extend(items)
    plan_kws_list = [_extract_kws(item) for item in all_plan_items]

    seen = set()
    planned = defaultdict(list)
    unplanned = defaultdict(list)

    for r in records:
        if r.inspection_purpose != '기획점검':
            continue
        name = r.inspection_name
        if not name or len(name) < 4:
            continue
        key = (r.month, name)
        if key in seen:
            continue
        seen.add(key)

        opinion_words = set(re.findall(r'[가-힣]{2,}', r.qa_opinion or ''))
        is_planned = any(
            len(pkws & opinion_words) >= min(2, len(pkws))
            for pkws in plan_kws_list
            if len(pkws) >= 2
        )
        if is_planned:
            planned[r.month].append(name)
        else:
            unplanned[r.month].append(name)

    return dict(planned), dict(unplanned)


def _summarize(text: str, max_len: int = 120) -> str:
    """긴 텍스트 요약 (첫 의미있는 줄 위주)"""
    if not text:
        return ''
    lines = [l.strip() for l in text.replace('\r', '').split('\n') if l.strip()]
    # ㆍ 등 특수문자 정리
    lines = [re.sub(r'^[ㆍ•·\-\*]\s*', '', l) for l in lines]
    lines = [l for l in lines if l]
    result = ' / '.join(lines[:3])
    return result[:max_len]


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
