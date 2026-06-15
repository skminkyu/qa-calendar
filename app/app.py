"""
QA 캘린더 웹 애플리케이션
"""
import os
import sys
import json
import tempfile
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_file

# 상위 디렉토리의 qa_calendar 패키지 임포트
sys.path.insert(0, str(Path(__file__).parent.parent))

from qa_calendar.parsers.plan_html_parser import parse_plan_html
from qa_calendar.parsers.keymetric_parser import parse_keymetric_html, get_암행_by_month
from qa_calendar.parsers.biweekly_parser import parse_biweekly
from qa_calendar.exporter.pptx_exporter import export_to_pptx

UPLOAD_FOLDER = Path(tempfile.gettempdir()) / 'qa_calendar_uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/autofill', methods=['POST'])
def autofill():
    """업로드된 파일들로 자동 기재"""
    files = request.files

    results = {}

    try:
        # 1. 기획점검 계획안 파싱
        if 'plan_inspection' in files:
            f = files['plan_inspection']
            path = UPLOAD_FOLDER / 'plan_inspection.html'
            f.save(str(path))
            inspection_plan = parse_plan_html(str(path))
            results['inspection_plan'] = inspection_plan

        # 2. 모니터링 계획안 파싱
        if 'plan_monitoring' in files:
            f = files['plan_monitoring']
            path = UPLOAD_FOLDER / 'plan_monitoring.html'
            f.save(str(path))
            monitoring_plan = parse_plan_html(str(path))
            results['monitoring_plan'] = monitoring_plan

        # 3. 키메트릭 파싱
        if 'keymetric' in files:
            f = files['keymetric']
            path = UPLOAD_FOLDER / 'keymetric.html'
            f.save(str(path))
            records = parse_keymetric_html(str(path))

            # 암행 부적합 집계
            암행_data = get_암행_by_month(records)
            results['암행'] = {
                mk: {
                    유형: products
                    for 유형, products in types.items()
                }
                for mk, types in 암행_data.items()
            }

            # 기획점검 수시 항목 (계획안과 비교)
            all_plan_items = []
            for plan_key in ['inspection_plan', 'monitoring_plan']:
                if plan_key in results:
                    for person, months in results[plan_key].items():
                        for items in months.values():
                            all_plan_items.extend(items)

            results['수시'] = _get_unplanned(records, all_plan_items)

        # 4. 바이위클리 파싱
        biweekly_issues = {}  # {month: {'방송상품': [...], '현장QA': [...], '암행': [...]}}
        for key, f in files.items():
            if key.startswith('biweekly'):
                path = UPLOAD_FOLDER / f'biweekly_{key}.pptx'
                f.save(str(path))
                bw = parse_biweekly(str(path))
                mk = bw.month
                if mk not in biweekly_issues:
                    biweekly_issues[mk] = {'방송상품': [], '현장QA': [], '암행': []}

                for issue in bw.qa_issues:
                    entry = {
                        'product': issue.product_name,
                        'md': issue.md_name,
                        'issue': issue.issue,
                        'measure': issue.measure,
                        'result': issue.result,
                    }
                    if issue.category == '방송상품':
                        biweekly_issues[mk]['방송상품'].append(entry)
                    elif issue.category == '현장QA':
                        biweekly_issues[mk]['현장QA'].append(entry)
                    elif issue.category == '암행':
                        biweekly_issues[mk]['암행'].append(entry)

        results['biweekly'] = biweekly_issues

        return jsonify({'success': True, 'data': results})

    except Exception as e:
        import traceback
        return jsonify({'success': False, 'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/export', methods=['POST'])
def export():
    """현재 캘린더 상태를 PPTX로 내보내기"""
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


def _get_unplanned(records, all_plan_items):
    """계획안에 없는 수시 항목 추출"""
    import re
    from collections import defaultdict

    def extract_kws(text):
        stopwords = {'점검', '기획', '모니터링', '및', '의', '관련', '대한', '포함', '기준', '규격'}
        words = re.findall(r'[가-힣]{2,}', text)
        return {w for w in words if w not in stopwords}

    plan_kws_list = [extract_kws(item) for item in all_plan_items]
    seen = set()
    result = defaultdict(list)

    for r in records:
        if r.inspection_purpose not in ('기획점검', '기타'):
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
            len(plan_kws & opinion_words) >= min(2, len(plan_kws))
            for plan_kws in plan_kws_list
            if len(plan_kws) >= 2
        )
        if not is_planned:
            result[r.month].append(name)

    return dict(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
