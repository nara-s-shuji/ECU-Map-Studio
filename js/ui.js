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
    if (tabName === 'editor') navBtns[0].classList.add('active');
    if (tabName === 'graph') navBtns[1].classList.add('active');
    if (tabName === 'monitor') navBtns[2].classList.add('active');
    if (tabName === 'logger') navBtns[3].classList.add('active');

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

    if (tabName === 'editor') {
        document.getElementById('editor-view').style.display = 'block';
        // Force redraw after display change to ensure dimensions are correct
        setTimeout(renderTable, 10);
    } else if (tabName === 'monitor') {
        document.getElementById('monitor-view').style.display = 'flex';
    } else if (tabName === 'logger') {
        document.getElementById('logger-view').style.display = 'flex';
    }
};

// Mobile Explorer Toggle (Can be hooked to a button later or swipe)
window.toggleExplorer = function () {
    const exp = document.getElementById('explorer');
    exp.classList.toggle('active');
};

// --- Mobile Long-Press Selection Logic ---
let longPressTimer;
let isLongPressMode = false;
let selectionStartCell = null; // {t, r} or index for header
let selectionType = null; // 'cell', 'row', 'col'

function handleTouchStart(e, type, index1, index2) {
    // Scroll中に誤爆しないように少し待つ
    longPressTimer = setTimeout(() => {
        isLongPressMode = true;
        selectionType = type;

        // バイブレーションなどでフィードバック
        if (navigator.vibrate) navigator.vibrate(50);

        if (type === 'cell') {
            const t = parseInt(index1);
            const r = parseInt(index2);
            selectionStartCell = { t, r };
            startSelection(t, r); // app.js function or simulate

            // Visual feedback
            console.log("Start Cell Select", t, r);
        } else if (type === 'col') { // TPS Header (Col)
            const c = parseInt(index1);
            selectionStartCell = c;
            selectColumn(c);
        } else if (type === 'row') { // RPM Header (Row)
            const r = parseInt(index1);
            selectionStartCell = r;
            selectRow(r);
        }
    }, 500); // 500ms Long Press
}

function handleTouchMove(e) {
    if (!isLongPressMode) {
        clearTimeout(longPressTimer);
        return; // Initialize scroll
    }

    e.preventDefault(); // Stop scroll when selecting

    // Find element under finger
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!target) return;

    // Detect target type
    if (selectionType === 'cell') {
        const cell = target.closest('.cell');
        if (cell && cell.id && cell.id.startsWith('c-')) {
            const parts = cell.id.split('-');
            const t = parseInt(parts[1]);
            const r = parseInt(parts[2]);
            updateSelection(t, r);
        }
    }
    // Header drag selection can be implemented here similarly if distinguishing header-cell types.
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
    isLongPressMode = false;
    selectionType = null;
}

document.addEventListener('touchstart', function (e) {
    const cell = e.target.closest('.cell');
    // Check ID to ensure it is a data cell
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
    // 現在のモードの値を保存
    const deltaInput = document.getElementById('popup-delta');
    const currentValue = parseFloat(deltaInput.value);

    if (popupMode === 'abs') {
        popupDeltaAbs = isNaN(currentValue) ? 10 : Math.round(currentValue);
    } else {
        popupDeltaPct = isNaN(currentValue) ? 1.0 : currentValue;
    }

    // モードを切り替え
    popupMode = mode;
    document.getElementById('mode-abs').classList.toggle('active', mode === 'abs');
    document.getElementById('mode-pct').classList.toggle('active', mode === 'pct');

    // 保存されている値を復元
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

let adjustInterval;
let adjustDelayTimeout;

window.startAdjusting = function (direction) {
    // 最初の1回を実行
    adjustCellValue(direction);

    // 長押し検知タイマー
    adjustDelayTimeout = setTimeout(() => {
        adjustInterval = setInterval(() => {
            adjustCellValue(direction);
        }, 100); // 100msごとに連続実行
    }, 400); // 400ms長押しで連続モード開始
};

window.stopAdjusting = function () {
    clearTimeout(adjustDelayTimeout);
    clearInterval(adjustInterval);
};

window.adjustCellValue = function (direction) {
    const deltaInput = document.getElementById('popup-delta');
    let deltaValue = parseFloat(deltaInput.value);

    if (isNaN(deltaValue) || deltaValue === 0) return;

    // 値を保存して表示を更新
    if (popupMode === 'pct') {
        popupDeltaPct = deltaValue;
        // %モードでは常に小数点1位まで表示
        deltaInput.value = deltaValue.toFixed(1);
    } else {
        popupDeltaAbs = deltaValue;
    }

    // 選択されている全セルに対して適用
    const cellsToUpdate = selectedCells.size > 0 ? Array.from(selectedCells) : [`${selT}-${selR}`];

    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        const currentValue = fuelMap[t][r];
        const originalValue = originalFuelMap[t][r];
        let newValue;

        if (popupMode === 'abs') {
            // 絶対値での増減
            newValue = currentValue + (direction * deltaValue);
        } else {
            // 各セルのオリジナル値の指定%分を現在値に加減
            const changeAmount = Math.round(originalValue * deltaValue / 100);
            newValue = currentValue + (direction * changeAmount);
        }

        fuelMap[t][r] = Math.round(newValue);

        // セルの表示を更新
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
    // Safety Check
    if (typeof fuelMap === 'undefined' || fuelMap.length === 0) {
        if (typeof initData === 'function') {
            initData();
        } else {
            console.error("initData not found");
            return;
        }
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

    // HEADERS = TPS Axis (Columns)
    TPS_AXIS.forEach((tps, c) => {
        const h = document.createElement('div');
        h.className = 'cell header-cell';
        h.innerText = tps + '%';
        h.dataset.col = c; // Data attribute for touch

        // --- Column Selection (TPS) ---
        h.onclick = () => selectColumn(c); // Mobile tap
        h.onmousedown = (e) => { // Desktop click
            if (e.shiftKey) return;
            selectColumn(c);
        };

        if (isColumnSelected(c)) h.classList.add('selected-header');
        headerRow.appendChild(h);
    });

    // ROWS = RPM Axis
    RPM_AXIS.forEach((rpm, r) => {
        // Label Cell (Row Header)
        const label = document.createElement('div');
        label.className = 'cell label-cell';
        label.innerText = rpm;
        label.dataset.row = r;
        label.onclick = () => selectRow(r);

        if (isRowSelected(r)) label.classList.add('selected-label');
        grid.appendChild(label);

        // Data Cells (Iterate Columns for this Row)
        TPS_AXIS.forEach((tps, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const cellId = `c-${c}-${r}`;
            cell.id = cellId;

            // Access correct data: fuelMap[TPS_INDEX][RPM_INDEX]
            const val = (fuelMap[c] && fuelMap[c][r] !== undefined) ? fuelMap[c][r] : 0;

            cell.style.background = getColor(val, c, r);
            if (selectedCells.has(`${c}-${r}`)) {
                cell.style.border = '2px solid var(--accent)';
            }

            const input = document.createElement('input');
            input.type = 'number';
            input.inputMode = 'decimal'; // Mobile keyboard
            input.value = val;
            input.dataset.t = c; // Keep usage of 't' for TPS index
            input.dataset.r = r; // Keep usage of 'r' for RPM index

            if (window.innerWidth <= 1024) input.readOnly = true;

            input.onfocus = () => {
                handleCellSelect(c, r);
            };
            input.onchange = (e) => updateData(c, r, e.target.value);

            if (cellColorMode === 'diff') input.classList.add('diff-mode');
            else input.classList.add('heatmap-mode');

            // Mouse Actions
            cell.onmousedown = (e) => {
                if (window.innerWidth > 1024) handleCellMouseDown(e, c, r);
            };
            cell.onmouseenter = (e) => {
                if (window.innerWidth > 1024) handleCellMouseEnter(e, c, r);
            };

            cell.appendChild(input);
            grid.appendChild(cell);
        });
    });
}

function handleCellMouseDown(e, t, r) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const key = `${t}-${r}`;
        if (selectedCells.has(key)) selectedCells.delete(key);
        else selectedCells.add(key);
        selT = t; selR = r;
        updateUISelection();
    } else if (e.shiftKey) {
        e.preventDefault();
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

    // 複数選択されたセルをハイライト
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

    // Highlighting Logic - NEEDS TO BE UPDATED FOR NEW LAYOUT
    // selT is TPS index (Column), selR is RPM index (Row)

    // Highlight Header (TPS/Column)
    const headerCells = document.getElementById('headerRow').children;
    // index + 1 because corner cell is 0
    if (headerCells[selT + 1]) {
        headerCells[selT + 1].classList.add('selected-header');
    }

    // Highlight Label (RPM/Row)
    const labels = document.querySelectorAll('.label-cell');
    if (labels[selR]) {
        labels[selR].classList.add('selected-label');
    }

    // 情報パネルの更新
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

    const changeSign = change >= 0 ? '+' : '';
    document.getElementById('info-change').innerText = `${changeSign}${change} μs`;
    document.getElementById('info-change-percent').innerText = `${changeSign}${changePercent}%`;

    let min = Infinity, max = -Infinity;
    for (let t = 0; t < 21; t++) {
        for (let r = 0; r < 20; r++) {
            if (fuelMap[t][r] < min) min = fuelMap[t][r];
            if (fuelMap[t][r] > max) max = fuelMap[t][r];
        }
    }
    document.getElementById('info-range').innerText = `${min} - ${max} μs`;

    // ポップアップの位置更新
    updatePopupPosition();
}

function updatePopupPosition() {
    const popup = document.getElementById('cell-popup');
    const selectedCell = document.getElementById(`c-${selT}-${selR}`);
    const mapSection = document.getElementById('map-section');

    if (!selectedCell) {
        popup.classList.remove('active');
        return;
    }

    // --- Mobile Check ---
    if (window.innerWidth <= 1024) {
        // Mobile: Always show active (CSS handles docking)
        popup.classList.add('active');
        popup.style.top = '';
        popup.style.left = '';
        popup.style.display = ''; // Clear any inline display:none
        return;
    }

    // --- Desktop Logic (Original) ---
    const cellRect = selectedCell.getBoundingClientRect();
    const mapRect = mapSection.getBoundingClientRect();
    const popupWidth = 150; // ポップアップの幅（推定）
    const popupHeight = 80; // ポップアップの高さ（推定）

    // 各種境界の計算
    // ... (existing boundary calcs)
    const headerRow = document.getElementById('headerRow');
    const headerHeight = headerRow ? headerRow.offsetHeight : 28;
    const visibleTop = mapRect.top + headerHeight;
    const scrollbarHeight = mapSection.offsetHeight - mapSection.clientHeight;
    // const visibleBottom = mapRect.bottom - scrollbarHeight; // Unused
    const visibleRight = mapRect.right;
    const visibleLeft = mapRect.left + 80; // Label width
    const infoTop = document.getElementById('info-section').getBoundingClientRect().top;

    // Only hide if completely out of view (relaxed check)
    if (cellRect.bottom < mapRect.top || cellRect.top > mapRect.bottom) {
        popup.classList.remove('active');
        return;
    }

    // 左端チェック（TPS列ラベル考慮）
    if (cellRect.right < visibleLeft) {
        popup.classList.remove('active');
        return;
    }
    // 右端チェック
    if (cellRect.left > visibleRight) {
        popup.classList.remove('active');
        return;
    }

    // デフォルト位置：セルの右側
    let left = cellRect.right + 10;
    let top = cellRect.top;

    // 右側に表示スペースがない場合は左側に表示
    if (left + popupWidth > visibleRight) {
        // セルの左側に配置（セルと重ならないように十分な間隔を取る）
        left = cellRect.left - popupWidth - 45;
    }

    // 左端がラベル列より左にはみ出る場合
    if (left < visibleLeft) {
        left = visibleLeft + 5;
    }

    // 下側に表示スペースがない場合は上に調整
    // INFORMATIONペインと重ならないように
    // Offset bottom
    const visibleBottom = mapRect.bottom - scrollbarHeight;

    const maxBottom = Math.min(visibleBottom, infoTop);
    if (top + popupHeight > maxBottom) {
        top = maxBottom - popupHeight - 5;
    }

    // 上側がヘッダーより上にはみ出る場合は調整
    if (top < visibleTop) {
        top = visibleTop + 5;
    }

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.classList.add('active');
}

// Make global functions avail
window.renderTable = renderTable;
window.updateUISelection = updateUISelection;
window.updatePopupPosition = updatePopupPosition;

// --- Helper Functions for Selection (New) ---

window.selectColumn = function (c) {
    selectedCells.clear();
    // TPS Axis c (Column) -> Select all Rows for this TPS
    // Data is fuelMap[c][r]
    for (let r = 0; r < 20; r++) {
        selectedCells.add(`${c}-${r}`);
    }
    selT = c; selR = 0;
    selectionStart = { t: c, r: 0 };
    updateUISelection();
};

window.selectRow = function (r) {
    selectedCells.clear();
    // RPM Axis r (Row) -> Select all Cols for this RPM
    for (let c = 0; c < 21; c++) {
        selectedCells.add(`${c}-${r}`);
    }
    selT = 0; selR = r;
    selectionStart = { t: 0, r: r };
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
    selT = t; selR = r; // Focus follows finger
    updateUISelection();
};

window.isColumnSelected = function (c) {
    // Check if all cells in col c are selected
    if (selectedCells.size < 20) return false;
    for (let r = 0; r < 20; r++) {
        if (!selectedCells.has(`${c}-${r}`)) return false;
    }
    return true;
};

window.isRowSelected = function (r) {
    // Check if all cells in row r are selected
    if (selectedCells.size < 21) return false;
    for (let c = 0; c < 21; c++) {
        if (!selectedCells.has(`${c}-${r}`)) return false;
    }
    return true;
};

window.handleCellSelect = function (t, r) {
    // Mobile focus handler or click handler substitute
    selectedCells.clear();
    selectedCells.add(`${t}-${r}`);
    selT = t; selR = r;
    updateUISelection();
};
