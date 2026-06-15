/**
 * QA 캘린더 앱 메인 로직
 */

// ── 초기화 ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDefaultData();
  renderAll();
});

// ── 탭 전환 ───────────────────────────────────────────────────────────────
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  event.currentTarget.classList.add('active');
}

// ── 셀 편집 모달 ─────────────────────────────────────────────────────────
let _editKey = null;
let _editLabel = null;

function openEditModal(key, label) {
  _editKey = key;
  _editLabel = label;
  const text = AppState.getCell(key);
  document.getElementById('edit-textarea').value = text;
  document.getElementById('edit-modal-title').textContent = `셀 편집: ${label}`;
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
  // 자동기재 표시 제거 (사용자가 직접 수정)
  AppState.autofilledKeys.delete(_editKey);
  updateCellDisplay(_editKey);
  closeEditModal();
  toast('저장되었습니다.', 'success');
}

function clearCell() {
  if (!_editKey) return;
  document.getElementById('edit-textarea').value = '';
}

// Esc로 모달 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeEditModal();
    closeAutofillModal();
  }
  if (e.key === 'Enter' && e.ctrlKey) {
    if (_editKey) saveCell();
  }
});

// ── 자동 기재 모달 ───────────────────────────────────────────────────────
function openAutofillModal() {
  document.getElementById('modal-autofill').style.display = 'flex';
}
function closeAutofillModal() {
  document.getElementById('modal-autofill').style.display = 'none';
}

async function runAutofill() {
  const formData = new FormData();

  const planInspFile = document.getElementById('file-plan-inspection').files[0];
  const planMonitorFile = document.getElementById('file-plan-monitoring').files[0];
  const keymetricFile = document.getElementById('file-keymetric').files[0];
  const biweeklyFiles = document.getElementById('file-biweekly').files;

  if (!planInspFile && !planMonitorFile && !keymetricFile && biweeklyFiles.length === 0) {
    toast('파일을 하나 이상 선택해주세요.', 'error');
    return;
  }

  if (planInspFile) formData.append('plan_inspection', planInspFile);
  if (planMonitorFile) formData.append('plan_monitoring', planMonitorFile);
  if (keymetricFile) formData.append('keymetric', keymetricFile);
  for (let i = 0; i < biweeklyFiles.length; i++) {
    formData.append(`biweekly_${i}`, biweeklyFiles[i]);
  }

  closeAutofillModal();
  showLoading('파일 분석 중...');

  try {
    const res = await fetch('/api/autofill', { method: 'POST', body: formData });
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || '알 수 없는 오류');
    }

    applyAutofillData(json.data);
    toast('자동 기재 완료! 초록색으로 표시된 셀이 자동 기재된 항목입니다.', 'success');

  } catch (err) {
    console.error(err);
    toast(`오류: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function applyAutofillData(data) {
  const newKeys = new Set();

  // 기획점검 계획/상품
  if (data.inspection_plan) {
    for (const [person, months] of Object.entries(data.inspection_plan)) {
      for (const [mk, items] of Object.entries(months)) {
        const key = `s1_plan_product_${mk}`;
        const existing = AppState.getCell(key);
        const newItems = items.filter(item => !existing.includes(item));
        if (newItems.length > 0) {
          const addText = newItems.map(i => `• ${i}`).join('\n');
          const merged = existing ? existing + '\n\n' + addText : addText;
          AppState.setCell(key, merged);
          newKeys.add(key);
        }
      }
    }
  }

  // 모니터링 계획/모니터링
  if (data.monitoring_plan) {
    for (const [person, months] of Object.entries(data.monitoring_plan)) {
      for (const [mk, items] of Object.entries(months)) {
        const key = `s1_plan_monitor_${mk}`;
        const existing = AppState.getCell(key);
        const newItems = items.filter(item => !existing.includes(item));
        if (newItems.length > 0) {
          const addText = newItems.map(i => `• ${i}`).join('\n');
          const merged = existing ? existing + '\n\n' + addText : addText;
          AppState.setCell(key, merged);
          newKeys.add(key);
        }
      }
    }
  }

  // 수시
  if (data.수시) {
    for (const [mk, items] of Object.entries(data.수시)) {
      const key = `s1_suisi_${mk}`;
      if (items && items.length > 0) {
        const text = items.map(i => `• ${i}`).join('\n');
        AppState.setCell(key, text);
        newKeys.add(key);
      }
    }
  }

  // 암행
  if (data.암행) {
    for (const [mk, typeDict] of Object.entries(data.암행)) {
      const key = `s2_secret_${mk}`;
      const lines = [];
      for (const [type, products] of Object.entries(typeDict)) {
        lines.push(`${type}(${products.length}건)`);
        for (const p of products.slice(0, 10)) {
          lines.push(`- ${p}`);
        }
        lines.push('');
      }
      if (lines.length > 0) {
        AppState.setCell(key, lines.join('\n').trim());
        newKeys.add(key);
      }
    }
  }

  // 바이위클리 이슈
  if (data.biweekly) {
    for (const [mk, cats] of Object.entries(data.biweekly)) {
      // 방송상품 (사전QA)
      if (cats.방송상품 && cats.방송상품.length > 0) {
        const key = `s2_broadcast_${mk}`;
        const lines = cats.방송상품.map(issue => {
          const resultTag = issue.result ? `[상품QA – ${issue.result}]` : '[상품QA]';
          let line = `${resultTag}\n${issue.product}`;
          if (issue.md) line += `\n(${issue.md})`;
          if (issue.issue) {
            const firstLine = issue.issue.split('\n')[0].replace(/ㆍ/g, '').trim().substring(0, 80);
            line += `\n- ${firstLine}`;
          }
          if (issue.measure) line += `\n→ ${issue.measure.substring(0, 60)}`;
          return line;
        });
        AppState.setCell(key, lines.join('\n\n'));
        newKeys.add(key);
      }

      // 현장QA
      if (cats.현장QA && cats.현장QA.length > 0) {
        const key = `s2_field_${mk}`;
        const lines = cats.현장QA.map(issue => {
          const resultTag = issue.result ? `[현장QA – ${issue.result}]` : '[현장QA]';
          let line = `${resultTag}\n${issue.product}`;
          if (issue.md) line += `\n(${issue.md})`;
          if (issue.issue) {
            const firstLine = issue.issue.split('\n')[0].replace(/ㆍ/g, '').trim().substring(0, 80);
            line += `\n- ${firstLine}`;
          }
          return line;
        });
        AppState.setCell(key, lines.join('\n\n'));
        newKeys.add(key);
      }

      // 암행 (바이위클리 상세 이슈 - 키메트릭 데이터가 없으면 보완)
      if (cats.암행 && cats.암행.length > 0) {
        const secretKey = `s2_secret_${mk}`;
        const existing = AppState.getCell(secretKey);
        if (!existing) {
          const lines = cats.암행.map(issue => {
            let line = `${issue.product}`;
            if (issue.md) line += ` (${issue.md})`;
            if (issue.issue) {
              const firstLine = issue.issue.split('\n')[0].replace(/ㆍ/g, '').trim().substring(0, 80);
              line += `\n- ${firstLine}`;
            }
            return line;
          });
          AppState.setCell(secretKey, lines.join('\n\n'));
          newKeys.add(secretKey);
        }
      }
    }
  }

  // 자동기재 표시 업데이트
  newKeys.forEach(k => AppState.autofilledKeys.add(k));

  // 전체 재렌더링
  renderAll();
}

// ── PPTX 내보내기 ─────────────────────────────────────────────────────────
async function exportPPTX() {
  showLoading('PPTX 생성 중...');

  try {
    // 현재 상태 직렬화
    const slide1Rows = serializeRows(AppState.slide1Rows);
    const slide2Rows = serializeRows(AppState.slide2Rows);

    const payload = {
      calendar: { slide1: { rows: slide1Rows } },
      issues: { slide2: { rows: slide2Rows } },
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

    // 파일 다운로드
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '26년_품질관리팀_운영캘린더.pptx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast('PPTX 내보내기 완료!', 'success');

  } catch (err) {
    console.error(err);
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

// ── 유틸리티 ─────────────────────────────────────────────────────────────
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
