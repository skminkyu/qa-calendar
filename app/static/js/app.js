/**
 * QA 캘린더 앱 메인 로직
 */

document.addEventListener('DOMContentLoaded', () => {
  initDefaultData();
  renderAll();
});

// ── 탭 전환 ───────────────────────────────────────────────────────────────
function showTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── 셀 편집 모달 ─────────────────────────────────────────────────────────
let _editKey = null;

function openEditModal(key, label) {
  _editKey = key;
  const text = AppState.getCell(key);
  document.getElementById('edit-textarea').value = text;
  document.getElementById('edit-modal-title').textContent = `편집: ${label.replace(/_/g,' ')}`;
  document.getElementById('modal-edit').style.display = 'flex';
  setTimeout(() => document.getElementById('edit-textarea').focus(), 50);
}

function closeEditModal() {
  document.getElementById('modal-edit').style.display = 'none';
  _editKey = null;
}

function saveCell() {
  if (!_editKey) return;
  const text = document.getElementById('edit-textarea').value;
  AppState.setCell(_editKey, text);
  AppState.autofilledKeys.delete(_editKey);
  updateCellDisplay(_editKey);
  closeEditModal();
  toast('저장되었습니다.', 'success');
}

function clearCell() {
  document.getElementById('edit-textarea').value = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeEditModal(); closeAutofillModal(); }
  if (e.key === 'Enter' && e.ctrlKey && _editKey) saveCell();
});

// ── 자동 기재 모달 ───────────────────────────────────────────────────────
function openAutofillModal() {
  document.getElementById('modal-autofill').style.display = 'flex';
}
function closeAutofillModal() {
  document.getElementById('modal-autofill').style.display = 'none';
}

function setFileName(input, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (input.files.length === 0) {
    el.textContent = '선택된 파일 없음';
  } else if (input.files.length === 1) {
    el.textContent = input.files[0].name;
  } else {
    el.textContent = `${input.files.length}개 파일 선택됨`;
  }
}

async function runAutofill() {
  const formData = new FormData();

  const planInspFile    = document.getElementById('file-plan-inspection').files[0];
  const planMonitorFile = document.getElementById('file-plan-monitoring').files[0];
  const keymetricFile   = document.getElementById('file-keymetric').files[0];
  const biweeklyFiles   = document.getElementById('file-biweekly').files;

  if (!planInspFile && !planMonitorFile && !keymetricFile && biweeklyFiles.length === 0) {
    toast('파일을 하나 이상 선택해주세요.', 'error');
    return;
  }

  if (planInspFile)    formData.append('plan_inspection', planInspFile);
  if (planMonitorFile) formData.append('plan_monitoring', planMonitorFile);
  if (keymetricFile)   formData.append('keymetric', keymetricFile);
  for (let i = 0; i < biweeklyFiles.length; i++) {
    formData.append(`biweekly_${i}`, biweeklyFiles[i]);
  }

  closeAutofillModal();
  showLoading('파일 분석 중...');

  try {
    const res = await fetch('/api/autofill', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '알 수 없는 오류');
    applyAutofillData(json.data);
    toast('자동 기재 완료! 초록색 배경이 자동 기재된 항목입니다.', 'success');
  } catch (err) {
    console.error(err);
    toast(`오류: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function applyAutofillData(data) {
  const newKeys = new Set();

  // 1. 기획점검/계획 (key metric 중 계획안 매칭 항목)
  if (data['계획_기획점검']) {
    for (const [mk, items] of Object.entries(data['계획_기획점검'])) {
      if (!items || items.length === 0) continue;
      const key = `s1_plan_product_${mk}`;
      const text = items.map(i => `• ${i}`).join('\n');
      AppState.setCell(key, text);
      newKeys.add(key);
    }
  }

  // 2. 모니터링 (모니터링 계획안 HTML 원문)
  if (data.monitoring) {
    for (const [mk, items] of Object.entries(data.monitoring)) {
      if (!items || items.length === 0) continue;
      const key = `s1_plan_monitor_${mk}`;
      const text = items.map(i => `• ${i}`).join('\n');
      AppState.setCell(key, text);
      newKeys.add(key);
    }
  }

  // 3. 기획점검/수시 (계획안에 없는 key metric 항목)
  if (data['수시']) {
    for (const [mk, items] of Object.entries(data['수시'])) {
      if (!items || items.length === 0) continue;
      const key = `s1_suisi_${mk}`;
      const text = items.map(i => `• ${i}`).join('\n');
      AppState.setCell(key, text);
      newKeys.add(key);
    }
  }

  // 4. 암행 (슬라이드2 — key metric 기획점검 부적합)
  if (data['암행']) {
    for (const [mk, typeDict] of Object.entries(data['암행'])) {
      const key = `s2_secret_${mk}`;
      const lines = [];
      for (const [type, products] of Object.entries(typeDict)) {
        lines.push(`[${type}] ${products.length}건`);
        for (const p of products.slice(0, 15)) {
          lines.push(`• ${p}`);
        }
      }
      if (lines.length > 0) {
        AppState.setCell(key, lines.join('\n'));
        newKeys.add(key);
      }
    }
  }

  // 5. 바이위클리 이슈 (슬라이드2)
  if (data.biweekly) {
    for (const [mk, cats] of Object.entries(data.biweekly)) {
      // 사전QA → 방송상품 칸
      if (cats['방송상품'] && cats['방송상품'].length > 0) {
        const key = `s2_broadcast_${mk}`;
        const lines = cats['방송상품'].map(issue => formatIssue(issue, '상품QA'));
        AppState.setCell(key, lines.join('\n\n'));
        newKeys.add(key);
      }
      // 현장QA → 현장 칸
      if (cats['현장QA'] && cats['현장QA'].length > 0) {
        const key = `s2_field_${mk}`;
        const lines = cats['현장QA'].map(issue => formatIssue(issue, '현장QA'));
        AppState.setCell(key, lines.join('\n\n'));
        newKeys.add(key);
      }
    }
  }

  newKeys.forEach(k => AppState.autofilledKeys.add(k));
  renderAll();
}

function formatIssue(issue, tag) {
  const resultTag = issue.result ? `[${tag} – ${issue.result}]` : `[${tag}]`;
  let line = resultTag + '\n' + (issue.product || '');
  if (issue.md) line += ` (${issue.md})`;
  if (issue.issue) {
    const summary = issue.issue.substring(0, 100);
    line += '\n- ' + summary;
  }
  if (issue.measure) {
    line += '\n→ ' + issue.measure.substring(0, 80);
  }
  return line;
}

// ── 초기화 ────────────────────────────────────────────────────────────────
function resetToDefaults() {
  if (!confirm('현재 내용을 모두 초기화하고 계획안 기본값으로 되돌리겠습니까?')) return;
  AppState.cellData = {};
  AppState.autofilledKeys = new Set();
  initDefaultData();
  renderAll();
  toast('초기화 완료', 'success');
}

// ── PPTX 내보내기 ─────────────────────────────────────────────────────────
async function exportPPTX() {
  showLoading('PPTX 생성 중...');
  try {
    const payload = {
      calendar: { slide1: { rows: serializeRows(AppState.slide1Rows) } },
      issues:   { slide2: { rows: serializeRows(AppState.slide2Rows) } },
    };
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Export 실패');
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = '26년_품질관리팀_운영캘린더.pptx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('PPTX 내보내기 완료!', 'success');
  } catch (err) {
    toast(`내보내기 오류: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function serializeRows(rows) {
  return rows.map(row =>
    row.map(cell => ({
      text: cell.key ? AppState.getCell(cell.key) : (cell.text || ''),
      rowspan: cell.rowspan || 1,
      colspan: cell.colspan || 1,
      editable: !!cell.editable,
    }))
  );
}

// ── 유틸 ──────────────────────────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || '처리 중...';
  document.getElementById('loading').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
