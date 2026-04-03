import { state, RPM_AXIS, TPS_AXIS } from './state.js';

export function updateUISelection() {
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
        if (cell) {
            cell.classList.add('multi-selected-cell');
        }
    });

    const selectedCell = document.getElementById(`c-${state.selT}-${state.selR}`);
    if (selectedCell) {
        selectedCell.classList.add('selected-cell');
    }

    const headerRow = document.getElementById('headerRow');
    if (headerRow) {
        const headerCells = headerRow.children;
        if (headerCells[state.selR + 1]) {
            headerCells[state.selR + 1].classList.add('selected-header');
        }
    }

    const labels = document.querySelectorAll('.label-cell');
    if (labels[state.selT]) {
        labels[state.selT].classList.add('selected-label');
    }

    const currentValue = state.fuelMap[state.selT][state.selR];
    const originalValue = state.originalFuelMap[state.selT][state.selR];

    const cellCount = state.selectedCells.size;
    const elCell = document.getElementById('info-cell');
    if (elCell) {
        if (cellCount > 1) elCell.innerText = `${cellCount} cells selected (Main: TPS ${TPS_AXIS[state.selT]}%, RPM ${RPM_AXIS[state.selR]})`;
        else elCell.innerText = `TPS: ${TPS_AXIS[state.selT]}%, RPM: ${RPM_AXIS[state.selR]}`;
    }

    const elValue = document.getElementById('info-value');
    if (elValue) elValue.innerText = currentValue;

    const elOriginal = document.getElementById('info-original');
    if (elOriginal) elOriginal.innerText = originalValue;

    const infoFileName = document.getElementById('info-filename');
    if (infoFileName) infoFileName.innerText = state.currentFileName;
    
    const valDisplay = document.getElementById('info-values');
    if (valDisplay) valDisplay.innerText = `Curr:${currentValue} / Orig:${originalValue}`;

    if (window.updatePopupPosition) window.updatePopupPosition();
}

export function handleCellMouseDown(e, t, r) {
    if (state.currentTabId !== 'editor') return;

    if (e && (e.ctrlKey || e.metaKey)) {
        if (e.preventDefault) e.preventDefault();
        const key = `${t}-${r}`;
        if (state.selectedCells.has(key)) state.selectedCells.delete(key);
        else state.selectedCells.add(key);
        state.selT = t; state.selR = r;
    } else if (e && e.shiftKey) {
        if (e.preventDefault) e.preventDefault();
        if (state.selectionStart) {
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
        }
        state.selT = t; state.selR = r;
    } else {
        state.selectedCells.clear();
        state.selectedCells.add(`${t}-${r}`);
        state.selectionStart = { t, r };
        state.isSelecting = true;
        state.selT = t; state.selR = r;
    }
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
    for (let t = 0; t < 21; t++) {
        state.selectedCells.add(`${t}-${c}`);
    }
    state.selT = 0; state.selR = c;
    state.selectionStart = { t: 0, r: c };
    updateUISelection();
}

export function selectRow(t) {
    state.selectedCells.clear();
    for (let r = 0; r < RPM_AXIS.length; r++) {
        state.selectedCells.add(`${t}-${r}`);
    }
    state.selT = t; state.selR = 0;
    state.selectionStart = { t, r: 0 };
    updateUISelection();
}

export function isColumnSelected(c) {
    if (state.selectedCells.size < 21) return false;
    for (let t = 0; t < 21; t++) {
        if (!state.selectedCells.has(`${t}-${c}`)) return false;
    }
    return true;
}

export function isRowSelected(t) {
    if (state.selectedCells.size < RPM_AXIS.length) return false;
    for (let r = 0; r < RPM_AXIS.length; r++) {
        if (!state.selectedCells.has(`${t}-${r}`)) return false;
    }
    return true;
}

// Attach to window for legacy support if needed
window.updateUISelection = updateUISelection;
