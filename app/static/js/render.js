/**
 * 캘린더 테이블 렌더링
 */

// 병합 셀 추적: 이미 렌더링된 셀 위치 기억
function buildRowHtml(row, rowIndex, skipCols) {
  let html = '<tr>';
  let colOffset = 0;

  for (const cell of row) {
    // skip-cols: rowspan으로 이전 행에서 이미 점유된 컬럼 건너뜀
    while (skipCols.has(colOffset)) colOffset++;

    const rs = cell.rowspan || 1;
    const cs = cell.colspan || 1;
    const text = cell.key ? AppState.getCell(cell.key) : (cell.text || '');
    const displayText = text.replace(/\n/g, '<br>');

    let cls = '';
    let attrs = '';

    switch (cell.type) {
      case 'header':   cls = 'cell-header'; break;
      case 'season':   cls = 'cell-season'; break;
      case 'label':    cls = 'cell-label'; break;
      case 'sublabel': cls = 'cell-sublabel'; break;
      case 'editable':
        cls = 'cell-editable' + (text ? ' has-content' : '');
        if (cell.key && AppState.autofilledKeys.has(cell.key)) cls += ' cell-autofilled';
        attrs = `onclick="openEditModal('${cell.key}', '${escAttr(cell.key)}')"`;
        break;
      case 'issue-label':    cls = 'cell-issue-label'; break;
      case 'issue-sublabel': cls = 'cell-issue-sublabel'; break;
      case 'issue-editable':
        cls = 'cell-issue-editable' + (text ? ' has-content' : '');
        if (cell.key && AppState.autofilledKeys.has(cell.key)) cls += ' cell-autofilled';
        attrs = `onclick="openEditModal('${cell.key}', '${escAttr(cell.key)}')"`;
        break;
    }

    html += `<td class="${cls}" rowspan="${rs}" colspan="${cs}" ${attrs}>${displayText}</td>`;

    // 병합 추적
    for (let r = 1; r < rs; r++) {
      for (let c = 0; c < cs; c++) {
        const futureRow = rowIndex + r;
        const futureCol = colOffset + c;
        if (!window._mergeMap) window._mergeMap = {};
        if (!window._mergeMap[futureRow]) window._mergeMap[futureRow] = new Set();
        window._mergeMap[futureRow].add(futureCol);
      }
    }

    colOffset += cs;
  }

  html += '</tr>';
  return html;
}

function renderTable(tbodyId, rows) {
  window._mergeMap = {};
  const tbody = document.getElementById(tbodyId);
  let html = '';

  for (let ri = 0; ri < rows.length; ri++) {
    const skipCols = (window._mergeMap && window._mergeMap[ri]) || new Set();
    html += buildRowHtml(rows[ri], ri, skipCols);
  }

  tbody.innerHTML = html;
}

function renderAll() {
  renderTable('calendar-tbody', AppState.slide1Rows);
  renderTable('issues-tbody', AppState.slide2Rows);
}

function escAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 특정 셀만 업데이트 (전체 재렌더링 없이)
function updateCellDisplay(key) {
  const text = AppState.getCell(key);
  const displayText = text.replace(/\n/g, '<br>');

  // calendar-tbody와 issues-tbody 모두에서 찾기
  for (const tbodyId of ['calendar-tbody', 'issues-tbody']) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) continue;
    const cells = tbody.querySelectorAll('td[onclick]');
    for (const td of cells) {
      const onclick = td.getAttribute('onclick');
      if (onclick && onclick.includes(`'${key}'`)) {
        td.innerHTML = displayText;
        td.classList.toggle('has-content', !!text);
        td.classList.toggle('cell-autofilled', AppState.autofilledKeys.has(key));
        break;
      }
    }
  }
}
