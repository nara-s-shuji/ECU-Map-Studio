window.toggleSettings = function () {
    const menu = document.getElementById('settings-menu');
    // Mobile: Toggle Settings menu
    menu.classList.toggle('active');

    // Mobile Explorer Toggle (Can be hooked to a button later or swipe)
    if (window.innerWidth <= 1024) {
        document.getElementById('explorer').classList.remove('active');
    }
};


window.switchTab = function (tabName) {
    // Nav Items Update
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Find button that calls this tab (simplified matching index)
    const navBtns = document.getElementById('bottom-nav').children;
    if (tabName === 'editor') navBtns[1].classList.add('active'); // 0=Menu, 1=Edit
    if (tabName === 'graph') navBtns[2].classList.add('active');
    if (tabName === 'monitor') navBtns[3].classList.add('active');
    if (tabName === 'logger') navBtns[4].classList.add('active');
    // Note: Updated indices based on new order: Menu, Edit, Graph, Monitor, Log

    // View Sections Update
    document.getElementById('editor-view').style.display = 'none';
    document.getElementById('monitor-view').style.display = 'none';
    document.getElementById('logger-view').style.display = 'none';

    // Graph Overlay Handling (Mobile Tab Mode)
    const graphOverlay = document.getElementById('graph-overlay');
    if (tabName === 'graph') {
        graphOverlay.classList.add('active');
        // Force 3D mode on mobile graph tab
        document.getElementById('graph-type').value = '3d';
        // Delay graph render slightly to ensure container is visible
        setTimeout(() => {
            updateGraph();
            // Trigger resize for Plotly to fit new container
            window.dispatchEvent(new Event('resize'));
        }, 50);
    } else {
        graphOverlay.classList.remove('active');
    }

    const editorView = document.getElementById('editor-view');

    if (tabName === 'editor') {
        editorView.style.display = 'block';
        document.body.classList.add('mode-editor'); // Show Popup
        // Force redraw after display change to ensure dimensions are correct
        setTimeout(renderTable, 10);
    } else {
        document.body.classList.remove('mode-editor'); // Hide Popup

        if (tabName === 'monitor') {
            document.getElementById('monitor-view').style.display = 'flex';
        } else if (tabName === 'logger') {
            document.getElementById('logger-view').style.display = 'flex';
        }
    }
};

window.toggleExplorer = function () {
    const exp = document.getElementById('explorer');
    exp.classList.toggle('active');
};

// --- Mobile Long-Press Selection Logic ---
let longPressTimer;
let isLongPressMode = false;
let selectionStartCell = null; // {t, r} or index for header
let selectionType = null; // 'cell', 'row', 'col'

// PC Range Selection State
let lastSelectedCol = -1;
let lastSelectedRow = -1;
let isHeaderDragging = false;
let headerDragStart = -1; // Index
let headerDragType = null; // 'col' or 'row'

document.addEventListener('mouseup', () => {
    isHeaderDragging = false;
});

function handleTouchStart(e, type, index1, index2) {
    longPressTimer = setTimeout(() => {
        isLongPressMode = true;
        selectionType = type;

        if (navigator.vibrate) navigator.vibrate(50);

        if (type === 'cell') {
            const t = parseInt(index1);
            const r = parseInt(index2);
            selectionStartCell = { t, r };
            startSelection(t, r);
        } else if (type === 'col') { // RPM Header (Col)
            const c = parseInt(index1);
            selectionStartCell = c;
            selectColumn(c);
        } else if (type === 'row') { // TPS Label (Row)
            const r = parseInt(index1);
            selectionStartCell = r;
            selectRow(r);
        }
    }, 500);
}

function handleTouchMove(e) {
    if (!isLongPressMode) {
        clearTimeout(longPressTimer);
        return;
    }

    e.preventDefault();

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!target) return;

    if (selectionType === 'cell') {
        const cell = target.closest('.cell');
        if (cell && cell.id && cell.id.startsWith('c-')) {
            const parts = cell.id.split('-');
            const t = parseInt(parts[1]);
            const r = parseInt(parts[2]);
            updateSelection(t, r);
        }
    }
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
    isLongPressMode = false;
    selectionType = null;
}

document.addEventListener('touchstart', function (e) {
    const cell = e.target.closest('.cell');
    if (cell && cell.id && cell.id.startsWith('c-')) {
        const parts = cell.id.split('-');
        handleTouchStart(e, 'cell', parts[1], parts[2]);
    } else if (e.target.dataset.col !== undefined) {
        handleTouchStart(e, 'col', e.target.dataset.col);
    } else if (e.target.dataset.row !== undefined) {
        handleTouchStart(e, 'row', e.target.dataset.row);
    }
}, { passive: false });

document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd);


window.updateCellColorMode = function () {
    cellColorMode = document.getElementById('cell-color-mode').value;
    if (originalFuelMap.length === 0) {
        originalFuelMap = fuelMap.map(row => row.slice());
    }
    renderTable();
};

window.toggleECUConnection = function () {
    ecuConnected = !ecuConnected;
    const btn = document.getElementById('btn-ecu-connect');
    const writeBtn = document.getElementById('btn-write');
    const readBtn = document.getElementById('btn-read');

    if (ecuConnected) {
        btn.classList.remove('ecu-disconnected');
        btn.classList.add('ecu-connected');
        btn.setAttribute('data-tooltip', 'ECUから切断');
        writeBtn.disabled = false;
        readBtn.disabled = false;
        alert('ECUに接続しました（デモ）');
    } else {
        btn.classList.remove('ecu-connected');
        btn.classList.add('ecu-disconnected');
        btn.setAttribute('data-tooltip', 'ECUに接続');
        writeBtn.disabled = true;
        readBtn.disabled = true;
        alert('ECUから切断しました（デモ）');
    }
};

window.switchPopupMode = function (mode) {
    const deltaInput = document.getElementById('popup-delta');
    const currentValue = parseFloat(deltaInput.value);

    if (popupMode === 'abs') {
        popupDeltaAbs = isNaN(currentValue) ? 10 : Math.round(currentValue);
    } else {
        popupDeltaPct = isNaN(currentValue) ? 1.0 : currentValue;
    }

    popupMode = mode;
    document.getElementById('mode-abs').classList.toggle('active', mode === 'abs');
    document.getElementById('mode-pct').classList.toggle('active', mode === 'pct');

    if (mode === 'abs') {
        deltaInput.value = Math.round(popupDeltaAbs);
        deltaInput.step = '1';
        deltaInput.min = '1';
    } else {
        deltaInput.value = popupDeltaPct.toFixed(1);
        deltaInput.step = '0.1';
        deltaInput.min = '0.1';
    }
};

window.adjustDelta = function (direction) {
    const input = document.getElementById('popup-delta');
    if (!input) return;
    let current = parseFloat(input.value);

    if (popupMode === 'abs') {
        if (direction > 0) {
            current += 1;
        } else {
            current = Math.max(1, current - 1);
        }
        popupDeltaAbs = current;
        input.value = current;
    } else {
        current = parseFloat((current + (direction * 0.1)).toFixed(1));
        if (current <= 0) current = 0.1;
        popupDeltaPct = current;
        input.value = current.toFixed(1);
    }
};

let adjustInterval;
let adjustDelayTimeout;

window.startAdjusting = function (direction) {
    // Removed implicit event usage to avoid potential reference errors
    adjustCellValue(direction);

    adjustDelayTimeout = setTimeout(() => {
        adjustInterval = setInterval(() => {
            adjustCellValue(direction);
        }, 100);
    }, 400);
};

window.stopAdjusting = function () {
    clearTimeout(adjustDelayTimeout);
    clearInterval(adjustInterval);
};

window.adjustCellValue = function (direction) {
    const deltaInput = document.getElementById('popup-delta');
    let deltaValue = parseFloat(deltaInput.value);

    if (isNaN(deltaValue) || deltaValue === 0) return;

    if (popupMode === 'pct') {
        popupDeltaPct = deltaValue;
        deltaInput.value = deltaValue.toFixed(1);
    } else {
        popupDeltaAbs = deltaValue;
    }

    const cellsToUpdate = selectedCells.size > 0 ? Array.from(selectedCells) : [`${selT}-${selR}`];

    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        const currentValue = fuelMap[t][r];
        const originalValue = originalFuelMap[t][r];
        let newValue;

        if (popupMode === 'abs') {
            newValue = currentValue + (direction * deltaValue);
        } else {
            const changeAmount = Math.round(originalValue * deltaValue / 100);
            newValue = currentValue + (direction * changeAmount);
        }

        fuelMap[t][r] = Math.round(newValue);

        const input = document.querySelector(`#c-${t}-${r} input`);
        if (input) {
            input.value = fuelMap[t][r];
            const cell = document.getElementById(`c-${t}-${r}`);
            cell.style.background = getColor(fuelMap[t][r], t, r);
        }
    });

    updateUISelection();
    saveHistory();

    if (document.getElementById('graph-overlay').classList.contains('active')) {
        updateGraph();
    }
};

function getColor(val, t, r) {
    if (cellColorMode === 'diff') {
        if (originalFuelMap.length === 0 || !originalFuelMap[t]) {
            return 'rgb(255, 255, 255)';
        }
        const originalVal = originalFuelMap[t][r];
        const diff = val - originalVal;

        if (diff === 0) {
            return 'rgb(255, 255, 255)';
        } else if (diff > 0) {
            const intensity = Math.min(Math.abs(diff) / 200, 1);
            const colorValue = Math.floor(255 - 155 * intensity);
            return `rgb(255, ${colorValue}, ${colorValue})`;
        } else {
            const intensity = Math.min(Math.abs(diff) / 200, 1);
            const colorValue = Math.floor(255 - 155 * intensity);
            return `rgb(${colorValue}, ${colorValue}, 255)`;
        }
    } else {
        let min = Infinity, max = -Infinity;
        for (let t = 0; t < 21; t++) {
            for (let r = 0; r < 20; r++) {
                if (fuelMap[t][r] < min) min = fuelMap[t][r];
                if (fuelMap[t][r] > max) max = fuelMap[t][r];
            }
        }

        let p = (val - min) / (max - min);
        p = Math.max(0, Math.min(1, p));

        let red, green, blue;
        if (p < 0.5) {
            const t = p * 2;
            red = 0;
            green = Math.floor(128 * t);
            blue = Math.floor(255 * (1 - t));
        } else {
            const t = (p - 0.5) * 2;
            red = Math.floor(255 * t);
            green = Math.floor(128 * (1 - t));
            blue = 0;
        }
        return `rgb(${red},${green},${blue})`;
    }
}

function renderTable() {
    if (typeof fuelMap === 'undefined' || fuelMap.length === 0) {
        if (typeof initData === 'function') initData();
        else return;
    }
    const headerRow = document.getElementById('headerRow');
    const grid = document.getElementById('mapGrid');
    if (!headerRow || !grid) return;

    headerRow.innerHTML = '';
    grid.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'cell header-cell corner-cell';
    corner.innerText = 'TPS\\RPM';
    corner.onclick = () => {
        selectedCells.clear();
        for (let t = 0; t < 21; t++) {
            for (let r = 0; r < 20; r++) {
                selectedCells.add(`${t}-${r}`);
            }
        }
        updateUISelection();
    };
    headerRow.appendChild(corner);

    // HEADERS = RPM Axis (Columns)
    RPM_AXIS.forEach((rpm, c) => {
        const h = document.createElement('div');
        h.className = 'cell header-cell';
        h.innerText = rpm;
        h.dataset.col = c;

        h.onmousedown = (e) => {
            if (window.innerWidth <= 1024) return; // Skip on mobile
            isHeaderDragging = true;
            headerDragType = 'col';
            headerDragStart = c;

            if (e.shiftKey && lastSelectedCol !== -1) {
                // Shift+Click Range
                const start = Math.min(lastSelectedCol, c);
                const end = Math.max(lastSelectedCol, c);
                selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let t = 0; t < 21; t++) {
                        selectedCells.add(`${t}-${i}`);
                    }
                }
                updateUISelection();
            } else {
                // Click / Start Drag
                selectColumn(c);
                lastSelectedCol = c;
            }
        };

        h.onmouseenter = (e) => {
            if (isHeaderDragging && headerDragType === 'col') {
                const start = Math.min(headerDragStart, c);
                const end = Math.max(headerDragStart, c);
                selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let t = 0; t < 21; t++) {
                        selectedCells.add(`${t}-${i}`);
                    }
                }
                updateUISelection();
                lastSelectedCol = c;
            }
        };

        if (isColumnSelected(c)) h.classList.add('selected-header');
        headerRow.appendChild(h);
    });

    // ROWS = TPS Axis (Labels)
    TPS_AXIS.forEach((tps, t) => {
        const label = document.createElement('div');
        label.className = 'cell label-cell';
        label.innerText = tps + '%';
        label.dataset.row = t;

        label.onmousedown = (e) => {
            if (window.innerWidth <= 1024) return;
            isHeaderDragging = true;
            headerDragType = 'row';
            headerDragStart = t;

            if (e.shiftKey && lastSelectedRow !== -1) {
                // Shift+Click Range
                const start = Math.min(lastSelectedRow, t);
                const end = Math.max(lastSelectedRow, t);
                selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let r = 0; r < 20; r++) {
                        selectedCells.add(`${i}-${r}`);
                    }
                }
                updateUISelection();
            } else {
                selectRow(t);
                lastSelectedRow = t;
            }
        };

        label.onmouseenter = (e) => {
            if (isHeaderDragging && headerDragType === 'row') {
                const start = Math.min(headerDragStart, t);
                const end = Math.max(headerDragStart, t);
                selectedCells.clear();
                for (let i = start; i <= end; i++) {
                    for (let r = 0; r < 20; r++) {
                        selectedCells.add(`${i}-${r}`);
                    }
                }
                updateUISelection();
                lastSelectedRow = t;
            }
        };

        if (isRowSelected(t)) label.classList.add('selected-label');
        grid.appendChild(label);

        // Data Cells (Iterate RPM Columns for this TPS Row)
        RPM_AXIS.forEach((rpm, r) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellId = `c-${t}-${r}`;
            cell.id = cellId;

            // Access data: fuelMap[TPS][RPM] = fuelMap[t][r]
            // This is direct access, no swap.
            const val = (fuelMap[t] && fuelMap[t][r] !== undefined) ? fuelMap[t][r] : 0;

            cell.style.background = getColor(val, t, r);
            if (selectedCells.has(`${t}-${r}`)) {
                cell.style.border = '2px solid var(--accent)';
            }

            const input = document.createElement('input');
            input.type = 'number';
            input.inputMode = 'decimal';
            input.value = val;
            input.dataset.t = t;
            input.dataset.r = r;

            if (window.innerWidth <= 1024) input.readOnly = true;

            input.onfocus = () => handleCellSelect(t, r);

            // Fix UpdateData interaction & Add Keydowns
            input.onchange = function (e) {
                updateData(t, r, parseInt(e.target.value));
            };
            input.onclick = function () { console.log('click'); this.select(); };
            input.onkeydown = function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                    if (e.shiftKey) {
                        // Up
                        const nextT = Math.max(0, t - 1);
                        const nextInput = document.querySelector(`#c-${nextT}-${r} input`);
                        if (nextInput) { nextInput.focus(); handleCellMouseDown({ ctrlKey: false, preventDefault: () => { } }, nextT, r); }
                    } else {
                        // Down
                        const nextT = Math.min(20, t + 1);
                        const nextInput = document.querySelector(`#c-${nextT}-${r} input`);
                        if (nextInput) { nextInput.focus(); handleCellMouseDown({ ctrlKey: false, preventDefault: () => { } }, nextT, r); }
                    }
                }
            };

            if (cellColorMode === 'diff') input.classList.add('diff-mode');
            else input.classList.add('heatmap-mode');

            cell.onmousedown = (e) => {
                if (window.innerWidth > 1024) handleCellMouseDown(e, t, r);
            };
            cell.onmouseenter = (e) => {
                if (window.innerWidth > 1024) handleCellMouseEnter(e, t, r);
            };

            cell.appendChild(input);
            grid.appendChild(cell);
        });
    });
}

function handleCellMouseDown(e, t, r) {
    if (e && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const key = `${t}-${r}`;
        if (selectedCells.has(key)) selectedCells.delete(key);
        else selectedCells.add(key);
        selT = t; selR = r;
        updateUISelection();
    } else if (e && e.shiftKey) {
        if (e.preventDefault) e.preventDefault();
        if (selectionStart) {
            const minT = Math.min(selectionStart.t, t);
            const maxT = Math.max(selectionStart.t, t);
            const minR = Math.min(selectionStart.r, r);
            const maxR = Math.max(selectionStart.r, r);
            selectedCells.clear();
            for (let ti = minT; ti <= maxT; ti++) {
                for (let ri = minR; ri <= maxR; ri++) {
                    selectedCells.add(`${ti}-${ri}`);
                }
            }
        }
        selT = t; selR = r;
        updateUISelection();
    } else {
        selectedCells.clear();
        selectedCells.add(`${t}-${r}`);
        selectionStart = { t, r };
        isSelecting = true;
        selT = t; selR = r;
        updateUISelection();
    }
}

function handleCellMouseEnter(e, t, r) {
    if (isSelecting && selectionStart) {
        const minT = Math.min(selectionStart.t, t);
        const maxT = Math.max(selectionStart.t, t);
        const minR = Math.min(selectionStart.r, r);
        const maxR = Math.max(selectionStart.r, r);
        selectedCells.clear();
        for (let ti = minT; ti <= maxT; ti++) {
            for (let ri = minR; ri <= maxR; ri++) {
                selectedCells.add(`${ti}-${ri}`);
            }
        }
        selT = t; selR = r;
        updateUISelection();
    }
}

function updateUISelection() {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected-cell', 'cross-highlight', 'multi-selected-cell'));
    document.querySelectorAll('.header-cell').forEach(h => h.classList.remove('selected-header'));
    document.querySelectorAll('.label-cell').forEach(l => l.classList.remove('selected-label'));

    selectedCells.forEach(key => {
        const [ct, cr] = key.split('-').map(Number);
        const cell = document.getElementById(`c-${ct}-${cr}`);
        if (cell) {
            cell.classList.add('multi-selected-cell');
        }
    });

    const selectedCell = document.getElementById(`c-${selT}-${selR}`);
    if (selectedCell) {
        selectedCell.classList.add('selected-cell');
        for (let r = 0; r < 20; r++) {
            const cell = document.getElementById(`c-${selT}-${r}`);
            if (cell) cell.classList.add('cross-highlight');
        }
        for (let t = 0; t < 21; t++) {
            const cell = document.getElementById(`c-${t}-${selR}`);
            if (cell) cell.classList.add('cross-highlight');
        }
    }

    // Highlight Header (RPM/Column) - selR is Column Index now
    const headerCells = document.getElementById('headerRow').children;
    if (headerCells[selR + 1]) {
        headerCells[selR + 1].classList.add('selected-header');
    }

    // Highlight Label (TPS/Row) - selT is Row Index now
    const labels = document.querySelectorAll('.label-cell');
    if (labels[selT]) {
        labels[selT].classList.add('selected-label');
    }

    const currentValue = fuelMap[selT][selR];
    const originalValue = originalFuelMap[selT][selR];
    const change = currentValue - originalValue;
    const changePercent = originalValue !== 0 ? ((change / originalValue) * 100).toFixed(1) : '0.0';

    const cellCount = selectedCells.size;
    if (cellCount > 1) {
        document.getElementById('info-cell').innerText = `${cellCount} cells selected (Main: TPS ${TPS_AXIS[selT]}%, RPM ${RPM_AXIS[selR]})`;
    } else {
        document.getElementById('info-cell').innerText = `TPS: ${TPS_AXIS[selT]}%, RPM: ${RPM_AXIS[selR]}`;
    }

    document.getElementById('info-value').innerText = currentValue;
    document.getElementById('info-original').innerText = originalValue;
    // ... rest of info update

    updatePopupPosition();
}

function updatePopupPosition() {
    const popup = document.getElementById('cell-popup');
    const selectedCell = document.getElementById(`c-${selT}-${selR}`);
    if (!selectedCell) {
        popup.classList.remove('active');
        return;
    }

    // Logic updated to respect CSS classes primarily, but needs position info?
    // In CSS we set fixed positions for mobile/landscape.
    if (window.innerWidth <= 1024) {
        popup.classList.add('active');
        popup.style.top = '';
        popup.style.left = '';
        popup.style.display = '';
        return;
    }

    // Desktop Logic (legacy)
    const mapSection = document.getElementById('map-section');
    const cellRect = selectedCell.getBoundingClientRect();
    const mapRect = mapSection.getBoundingClientRect();

    // ... Simplified desktop positioning or copy original ...
    const popupWidth = 150;
    const popupHeight = 80;
    const headerRow = document.getElementById('headerRow');
    const headerHeight = headerRow ? headerRow.offsetHeight : 28;
    const visibleTop = mapRect.top + headerHeight;
    const visibleRight = mapRect.right;
    const visibleLeft = mapRect.left + 80;

    if (cellRect.bottom < mapRect.top || cellRect.top > mapRect.bottom) {
        popup.classList.remove('active');
        return;
    }

    let left = cellRect.right + 10;
    let top = cellRect.top;

    if (left + popupWidth > visibleRight) {
        left = cellRect.left - popupWidth - 45;
    }
    if (left < visibleLeft) {
        left = visibleLeft + 5;
    }

    if (top < visibleTop) {
        top = visibleTop + 5;
    }

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.classList.add('active');
}

window.renderTable = renderTable;
window.updateUISelection = updateUISelection;
window.updatePopupPosition = updatePopupPosition;

// New Functions
window.updateData = function (t, r, val) {
    if (fuelMap[t] && typeof fuelMap[t][r] !== 'undefined') {
        fuelMap[t][r] = val;
        saveHistory();
        renderTable(); // Re-render to update colors/diffs
        if (document.getElementById('graph-overlay') && document.getElementById('graph-overlay').classList.contains('active')) {
            if (typeof updateGraph === 'function') updateGraph();
        }
    }
};

window.resetCellToOriginal = function () {
    if (selectionStart) {
        const { t, r } = selectionStart;
        if (originalFuelMap[t] && typeof originalFuelMap[t][r] !== 'undefined') {
            updateData(t, r, originalFuelMap[t][r]);
            handleCellMouseEnter(null, t, r); // Update Info panel
        }
    }
};

window.selectColumn = function (c) {
    selectedCells.clear();
    // RPM Axis c (Column) -> Select all Rows (TPS)
    for (let t = 0; t < 21; t++) {
        selectedCells.add(`${t}-${c}`);
    }
    selT = 0; selR = c;
    selectionStart = { t: 0, r: c };
    updateUISelection();
};

window.selectRow = function (t) {
    selectedCells.clear();
    // TPS Axis t (Row) -> Select all Cols (RPM)
    for (let r = 0; r < 20; r++) {
        selectedCells.add(`${t}-${r}`);
    }
    selT = t; selR = 0;
    selectionStart = { t: t, r: 0 };
    updateUISelection();
};

window.startSelection = function (t, r) {
    selectedCells.clear();
    selectedCells.add(`${t}-${r}`);
    selT = t; selR = r;
    updateUISelection();
};

window.updateSelection = function (t, r) {
    if (!selectionStartCell) return;

    selectedCells.clear();
    const startT = Math.min(selectionStartCell.t, t);
    const endT = Math.max(selectionStartCell.t, t);
    const startR = Math.min(selectionStartCell.r, r);
    const endR = Math.max(selectionStartCell.r, r);

    for (let ci = startT; ci <= endT; ci++) {
        for (let ri = startR; ri <= endR; ri++) {
            selectedCells.add(`${ci}-${ri}`);
        }
    }
    selT = t; selR = r;
    updateUISelection();
};

window.isColumnSelected = function (c) {
    // Check if column c (RPM) is selected (all 21 TPS rows)
    if (selectedCells.size < 21) return false;
    for (let t = 0; t < 21; t++) {
        if (!selectedCells.has(`${t}-${c}`)) return false;
    }
    return true;
};

window.isRowSelected = function (t) {
    // Check if row t (TPS) is selected (all 20 RPM cols)
    if (selectedCells.size < 20) return false;
    for (let r = 0; r < 20; r++) {
        if (!selectedCells.has(`${t}-${r}`)) return false;
    }
    return true;
};

window.handleCellSelect = function (t, r) {
    selectedCells.clear();
    selectedCells.add(`${t}-${r}`);
    selT = t; selR = r;
    updateUISelection();
};
