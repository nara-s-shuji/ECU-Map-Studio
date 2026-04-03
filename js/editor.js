import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { getColor } from './utils.js';
import { 
    updateUISelection, 
    handleCellMouseDown, 
    handleCellMouseEnter, 
    selectColumn, 
    selectRow, 
    isColumnSelected, 
    isRowSelected 
} from './selection.js';
import { initData, saveHistory } from './data.js';

export function renderTable() {
    if (!state.fuelMap || state.fuelMap.length === 0) {
        initData();
        return;
    }
    const headerRow = document.getElementById('headerRow');
    const grid = document.getElementById('mapGrid');
    if (!headerRow || !grid) return;

    headerRow.innerHTML = '';
    grid.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'cell header-cell corner-cell';
    corner.innerText = 'TPS\\RPM';
    corner.addEventListener('click', () => {
        state.selectedCells.clear();
        for (let t = 0; t < 21; t++) {
            for (let r = 0; r < RPM_AXIS.length; r++) {
                state.selectedCells.add(`${t}-${r}`);
            }
        }
        updateUISelection();
    });
    headerRow.appendChild(corner);

    // RPM Axis (Columns) Headers
    RPM_AXIS.forEach((rpm, c) => {
        const h = document.createElement('div');
        h.className = 'cell header-cell';
        h.innerText = rpm;
        h.dataset.col = c;

        h.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 1024) return;
            state.isHeaderDragging = true;
            state.headerDragType = 'col';
            state.headerDragStart = c;

            if (e.shiftKey && state.lastSelectedCol !== -1) {
                const start = Math.min(state.lastSelectedCol, c);
                const end = Math.max(state.lastSelectedCol, c);
                state.selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let t = 0; t < 21; t++) {
                        state.selectedCells.add(`${t}-${i}`);
                    }
                }
                updateUISelection();
            } else {
                selectColumn(c);
                state.lastSelectedCol = c;
            }
        });

        h.addEventListener('mouseenter', (e) => {
            if (state.isHeaderDragging && state.headerDragType === 'col') {
                const start = Math.min(state.headerDragStart, c);
                const end = Math.max(state.headerDragStart, c);
                state.selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let t = 0; t < 21; t++) {
                        state.selectedCells.add(`${t}-${i}`);
                    }
                }
                updateUISelection();
                state.lastSelectedCol = c;
            }
        });

        if (isColumnSelected(c)) h.classList.add('selected-header');
        headerRow.appendChild(h);
    });

    // TPS Axis (Rows)
    TPS_AXIS.forEach((tps, t) => {
        const label = document.createElement('div');
        label.className = 'cell label-cell';
        label.innerText = tps + '%';
        label.dataset.row = t;

        label.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 1024) return;
            state.isHeaderDragging = true;
            state.headerDragType = 'row';
            state.headerDragStart = t;

            if (e.shiftKey && state.lastSelectedRow !== -1) {
                const start = Math.min(state.lastSelectedRow, t);
                const end = Math.max(state.lastSelectedRow, t);
                state.selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let r = 0; r < RPM_AXIS.length; r++) {
                        state.selectedCells.add(`${i}-${r}`);
                    }
                }
                updateUISelection();
            } else {
                selectRow(t);
                state.lastSelectedRow = t;
            }
        });

        label.addEventListener('mouseenter', (e) => {
            if (state.isHeaderDragging && state.headerDragType === 'row') {
                const start = Math.min(state.headerDragStart, t);
                const end = Math.max(state.headerDragStart, t);
                state.selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let r = 0; r < RPM_AXIS.length; r++) {
                        state.selectedCells.add(`${i}-${r}`);
                    }
                }
                updateUISelection();
                state.lastSelectedRow = t;
            }
        });

        if (isRowSelected(t)) label.classList.add('selected-label');
        grid.appendChild(label);

        // Data Cells
        RPM_AXIS.forEach((rpm, r) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellId = `c-${t}-${r}`;
            cell.id = cellId;

            const val = (state.fuelMap[t] && state.fuelMap[t][r] !== undefined) ? state.fuelMap[t][r] : 0;
            cell.style.background = getColor(val, t, r);

            const input = document.createElement('input');
            input.type = 'number';
            input.inputMode = 'decimal';
            input.value = val;
            input.dataset.t = t;
            input.dataset.r = r;

            if (window.innerWidth <= 1024) input.readOnly = true;

            input.addEventListener('focus', () => {
                state.selectedCells.clear();
                state.selectedCells.add(`${t}-${r}`);
                state.selT = t; state.selR = r;
                updateUISelection();
            });

            input.addEventListener('change', function (e) {
                updateData(t, r, parseInt(e.target.value));
            });
            input.addEventListener('click', function () { this.select(); });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                    const direction = e.shiftKey ? -1 : 1;
                    const nextT = Math.max(0, Math.min(20, t + direction));
                    const nextInput = document.querySelector(`#c-${nextT}-${r} input`);
                    if (nextInput) {
                        nextInput.focus();
                        handleCellMouseDown(null, nextT, r);
                    }
                }
            });

            if (state.cellColorMode === 'diff') input.classList.add('diff-mode');
            else input.classList.add('heatmap-mode');

            cell.addEventListener('mousedown', (e) => {
                if (window.innerWidth > 1024) handleCellMouseDown(e, t, r);
            });
            cell.addEventListener('mouseenter', (e) => {
                if (window.innerWidth > 1024) handleCellMouseEnter(e, t, r);
            });

            cell.appendChild(input);
            grid.appendChild(cell);
        });
    });

    updateUISelection();
}

export function updateData(t, r, val) {
    if (state.fuelMap[t] && typeof state.fuelMap[t][r] !== 'undefined') {
        val = Math.max(0, val);
        state.fuelMap[t][r] = val;
        saveHistory();
        renderTable();
        if (window.updateGraph) window.updateGraph();
    }
}

// Global exposure for non-module components if any
window.renderTable = renderTable;
window.updateData = updateData;
