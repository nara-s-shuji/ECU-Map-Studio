import { state, RPM_AXIS, TPS_AXIS } from './state.js?v=2026.33';
import { closeDrawer } from './navigation.js?v=2026.33';

export function updateUISelection() {
    // Robust Fix: Force drawer to close on any selection change (Tap/Select)
    if (typeof closeDrawer === 'function') closeDrawer();
    else if (window.closeDrawer) window.closeDrawer();

    if (state.currentTabId !== 'editor') {
        const popup = document.getElementById('edit-popup-v2');
        if (popup) {
            popup.style.display = 'none';
            popup.classList.remove('active');
        }
        return;
    }

    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected-cell', 'multi-selected-cell'));
    document.querySelectorAll('.header-cell').forEach(h => h.classList.remove('selected-header'));
    document.querySelectorAll('.label-cell').forEach(l => l.classList.remove('selected-label'));

    state.selectedCells.forEach(key => {
        const [ct, cr] = key.split('-').map(Number);
        const cell = document.getElementById(`c-${ct}-${cr}`);
        if (cell) cell.classList.add('multi-selected-cell');
    });

    const selectedCell = document.getElementById(`c-${state.selT}-${state.selR}`);
    if (selectedCell) selectedCell.classList.add('selected-cell');

    const headerRow = document.getElementById('headerRow');
    if (headerRow) {
        const headerCells = headerRow.children;
        if (headerCells[state.selR + 1]) headerCells[state.selR + 1].classList.add('selected-header');
    }

    const labels = document.querySelectorAll('.label-cell');
    if (labels[state.selT]) labels[state.selT].classList.add('selected-label');

    const currentValue = state.fuelMap[state.selT][state.selR];
    const originalValue = state.originalFuelMap[state.selT][state.selR];

    const cellCount = state.selectedCells.size;
    const elCell = document.getElementById('info-cell');
    if (elCell) {
        if (cellCount > 1) elCell.innerText = `${cellCount} cells selected (Main: TPS ${TPS_AXIS[state.selT]}%, RPM ${RPM_AXIS[state.selR]})`;
        else elCell.innerText = `TPS: ${TPS_AXIS[state.selT]}%, RPM: ${RPM_AXIS[state.selR]}`;
    }

    const valDisplay = document.getElementById('info-values');
    if (valDisplay) valDisplay.innerText = `Curr:${currentValue} / Orig:${originalValue}`;

    if (window.updatePopupPosition) window.updatePopupPosition();
}

export function handleCellMouseDown(e, t, r) {
    if (state.currentTabId !== 'editor') return;
    state.selectedCells.clear();
    state.selectedCells.add(`${t}-${r}`);
    state.selectionStart = { t, r };
    state.isSelecting = true;
    state.selT = t; state.selR = r;
    updateUISelection();
}

export function handleCellMouseEnter(e, t, r) {
    if (state.currentTabId !== 'editor') return;
    if (state.isSelecting && state.selectionStart) {
        const minT = Math.min(state.selectionStart.t, t);
        const maxT = Math.max(state.selectionStart.t, t);
        const minR = Math.min(state.selectionStart.r, r);
        const maxR = Math.max(state.selectionStart.r, r);
        state.selectedCells.clear();
        for (let ti = minT; ti <= maxT; ti++) {
            for (let ri = minR; ri <= maxR; ri++) {
                state.selectedCells.add(`${ti}-${ri}`);
            }
        }
        state.selT = t; state.selR = r;
        updateUISelection();
    }
}

export function selectColumn(c) {
    state.selectedCells.clear();
    for (let t = 0; t < 21; t++) state.selectedCells.add(`${t}-${c}`);
    state.selT = 0; state.selR = c;
    state.selectionStart = { t: 0, r: c };
    updateUISelection();
}

export function selectRow(t) {
    state.selectedCells.clear();
    for (let r = 0; r < RPM_AXIS.length; r++) state.selectedCells.add(`${t}-${r}`);
    state.selT = t; state.selR = 0;
    state.selectionStart = { t, r: 0 };
    updateUISelection();
}

export function isColumnSelected(c) {
    if (state.selectedCells.size < 21) return false;
    for (let t = 0; t < 21; t++) if (!state.selectedCells.has(`${t}-${c}`)) return false;
    return true;
}

export function isRowSelected(t) {
    if (state.selectedCells.size < RPM_AXIS.length) return false;
    for (let r = 0; r < RPM_AXIS.length; r++) if (!state.selectedCells.has(`${t}-${r}`)) return false;
    return true;
}

export function handleTouchStart(e, type, index1, index2) {
    if (state.currentTabId !== 'editor') return;
    state.longPressTimer = setTimeout(() => {
        state.isLongPressMode = true;
        state.selectionType = type;
        if (navigator.vibrate) navigator.vibrate(50);
        if (type === 'cell') {
            const t = parseInt(index1);
            const r = parseInt(index2);
            state.selectionStartCell = { t, r };
            startSelection(t, r);
        } else if (type === 'col') {
            const c = parseInt(index1);
            state.selectionStartCell = c;
            selectColumn(c);
        } else if (type === 'row') {
            const rowIdx = parseInt(index1);
            state.selectionStartCell = rowIdx;
            selectRow(rowIdx);
        }
    }, 500);
}

export function handleTouchMove(e) {
    if (!state.isLongPressMode) {
        clearTimeout(state.longPressTimer);
        return;
    }
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    if (state.selectionType === 'cell') {
        const cell = target.closest('.cell');
        if (cell && cell.id && cell.id.startsWith('c-')) {
            const parts = cell.id.split('-');
            updateSelection(parseInt(parts[1]), parseInt(parts[2]));
        }
    } else if (state.selectionType === 'col') {
        const header = target.closest('.header-cell');
        let c = -1;
        if (header && header.dataset.col !== undefined) c = parseInt(header.dataset.col);
        else {
            const cell = target.closest('.cell');
            if (cell && cell.id && cell.id.startsWith('c-')) c = parseInt(cell.id.split('-')[2]);
        }
        if (c !== -1 && state.selectionStartCell !== null) selectColumnRange(state.selectionStartCell, c);
    } else if (state.selectionType === 'row') {
        const label = target.closest('.label-cell');
        let rowIdx = -1;
        if (label && label.dataset.row !== undefined) rowIdx = parseInt(label.dataset.row);
        else {
            const cell = target.closest('.cell');
            if (cell && cell.id && cell.id.startsWith('c-')) rowIdx = parseInt(cell.id.split('-')[1]);
        }
        if (rowIdx !== -1 && state.selectionStartCell !== null) selectRowRange(state.selectionStartCell, rowIdx);
    }
}

export function handleTouchEnd() {
    clearTimeout(state.longPressTimer);
    state.isLongPressMode = false;
    state.selectionType = null;
}

export function selectColumnRange(start, end) {
    state.selectedCells.clear();
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    for (let c = min; c <= max; c++) for (let t = 0; t < 21; t++) state.selectedCells.add(`${t}-${c}`);
    updateUISelection();
}

export function selectRowRange(start, end) {
    state.selectedCells.clear();
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    for (let r = min; r <= max; r++) for (let c = 0; c < RPM_AXIS.length; c++) state.selectedCells.add(`${r}-${c}`);
    updateUISelection();
}

export function startSelection(t, r) {
    state.selectedCells.clear();
    state.selectedCells.add(`${t}-${r}`);
    state.selT = t; state.selR = r;
    updateUISelection();
}

export function updateSelection(t, r) {
    if (!state.selectionStartCell) return;
    state.selectedCells.clear();
    const startT = Math.min(state.selectionStartCell.t, t);
    const endT = Math.max(state.selectionStartCell.t, t);
    const startR = Math.min(state.selectionStartCell.r, r);
    const endR = Math.max(state.selectionStartCell.r, r);
    for (let ci = startT; ci <= endT; ci++) for (let ri = startR; ri <= endR; ri++) state.selectedCells.add(`${ci}-${ri}`);
    state.selT = t; state.selR = r;
    updateUISelection();
}

// Legacy exports
window.updateUISelection = updateUISelection;
window.handleTouchStart = handleTouchStart;
window.handleTouchMove = handleTouchMove;
window.handleTouchEnd = handleTouchEnd;
window.startSelection = startSelection;
window.updateSelection = updateSelection;
