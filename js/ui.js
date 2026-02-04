window.toggleSettings = function () {
    const menu = document.getElementById('settings-menu');
    const btn = document.getElementById('btn-menu'); // Ensure ID exists in HTML

    // Toggle
    menu.classList.toggle('active');

    // Update Button State
    if (menu.classList.contains('active')) {
        if (btn) btn.classList.add('active');
        document.body.classList.add('overlay-active'); // ADD
    } else {
        if (btn) btn.classList.remove('active');
        document.body.classList.remove('overlay-active'); // ADD
    }

    // Force Popup Update
    if (typeof updatePopupPosition === 'function') updatePopupPosition();

    // Mobile Explorer Toggle (Can be hooked to a button later or swipe)
    if (window.innerWidth <= 1024) {
        document.getElementById('explorer').classList.remove('active');
    }
};


window.switchTab = function (tabName) {
    console.log('switchTab called:', tabName);
    // Nav Items Update
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Find button that calls this tab (simplified matching index)
    // Find button that calls this tab (simplified matching index)
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) {
        console.error('Navbar not found!');
        return;
    }
    const navBtns = navContainer.children;

    // New Order: File, Edit, Graph, Monitor, Menu
    if (tabName === 'file') navBtns[0].classList.add('active');
    if (tabName === 'editor') navBtns[1].classList.add('active');
    if (tabName === 'graph') navBtns[2].classList.add('active');
    if (tabName === 'monitor') navBtns[3].classList.add('active');
    // Menu (4) is toggle

    // View Sections Update
    const views = ['editor-view', 'monitor-view', 'logger-view', 'file-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    });

    // Graph Overlay Handling
    const graphOverlay = document.getElementById('graph-overlay');
    if (tabName === 'graph') {
        graphOverlay.classList.add('active');
        document.getElementById('graph-type').value = '3d';
        setTimeout(() => {
            if (typeof updateGraph === 'function') updateGraph();
            window.dispatchEvent(new Event('resize'));
        }, 50);
    } else {
        graphOverlay.classList.remove('active');
    }

    if (tabName === 'editor') {
        const v = document.getElementById('editor-view');
        v.style.display = 'block';
        v.classList.add('active'); // CSS hook
        document.body.classList.add('mode-editor');
        setTimeout(renderTable, 10);
    } else {
        document.body.classList.remove('mode-editor');
        if (tabName === 'monitor') {
            const v = document.getElementById('monitor-view');
            v.style.display = 'flex';
            v.classList.add('active');
        } else if (tabName === 'file') {
            const v = document.getElementById('file-view');
            v.style.display = 'flex';
            v.classList.add('active');
        }
    }
};

window.toggleExplorer = function () {
    const exp = document.getElementById('explorer');
    exp.classList.toggle('active');
};

// Global State for Tab Tracking (Fix for Popup Visibility)
window.currentTabId = 'editor'; // Default

// Main Tab Switching
function switchTab(tabId) {
    // 1. Update Global State
    window.currentTabId = tabId;

    // 2. Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    document.body.classList.remove('overlay-active'); // Clear overlay state

    // 3. Resolve Target Element (Handle 'editor' -> 'editor-view' mapping)
    let targetId = tabId;
    if (!document.getElementById(targetId)) {
        if (document.getElementById(tabId + '-view')) {
            targetId = tabId + '-view';
        }
    }

    // 4. Show Target
    const target = document.getElementById(targetId);
    if (target) {
        // Special Flex/Block handling
        const isFlex = (targetId === 'file-view' || targetId === 'monitor-view');
        target.style.display = isFlex ? 'flex' : 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    // 5. Update Nav Buttons
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active'); // Remove from all
    });
    // Add active to the clicked button (e.g., nav-editor)
    const navBtn = document.getElementById('nav-' + tabId);
    if (navBtn) navBtn.classList.add('active');

    // 6. Force Popup Hiding if not editor
    const popup = document.getElementById('edit-popup-v2');
    if (popup) {
        if (tabId === 'editor') {
            // Allow popup (don't force show, just allow logic)
        } else {
            popup.style.display = 'none';
            popup.classList.remove('active');
        }
    }
    // 7. Update Info Bar & Close Menu (Restored Logic)
    // Mobile Info Bar Update
    document.getElementById('info-filename').innerText = (typeof currentFileName !== 'undefined' ? currentFileName : 'No File') + ' (debug_82)';
    const headerDisplay = document.querySelector('.file-view-title');
    if (headerDisplay) headerDisplay.innerHTML = `ECU Map Studio <span style="font-size:10px; color:#888; margin-left:5px;">(debug_82)</span>`;

    // Ensure settings menu title also updates
    const menuTitle = document.querySelector('#settings-menu .file-view-title');
    if (menuTitle) menuTitle.innerHTML = `ECU Map Studio <span style="font-size:10px; color:#888; margin-left:5px;">(debug_82)</span>`;
    // Reset values display on tab switch
    const valDisplay = document.getElementById('info-values');
    if (valDisplay) valDisplay.innerText = `Orig: - / Curr: -`;

    // Auto-close menu if open
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu && menu.classList.contains('active')) {
        menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        // Update toggle button state
        const btn = document.getElementById('btn-settings');
        if (btn) btn.classList.remove('active');
    }

    // Also ensure nav-menu is not active if we switched away
    const navMenuBtn = document.getElementById('nav-menu');
    if (navMenuBtn && tabId !== 'menu') {
        navMenuBtn.classList.remove('active');
    }
}

// --- Map Selection Logic ---

let currentPriorityMap = 1; // Default 1
let currentNextMap = 2;     // Default 2
let currentFuelMapIndex = 1;
let currentIgnMapIndex = 1;

// Initialize Defaults on Load
window.addEventListener('DOMContentLoaded', () => {
    updatePriorityMapUI();
    updateNextMapUI();
});

// Select File Item (Highlight & Load)
window.selectFileItem = function (element, type) {
    // 1. Remove active class from all items
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));

    // 2. Add active class to clicked item
    if (element) {
        element.classList.add('active');
    }

    // 3. Handle Special Types
    if (type === 'map_select') {
        // Just visual selection, no data loading
        return;
    }

    currentFileType = type;

    // ... rest of loading logic
    if (type === 'fuel') {
        // ...
    } else {
        // Load other single-file items
        if (window.app && window.app.loadAdvancedItem) {
            window.app.loadAdvancedItem(type); // Assuming this exists or similar
        }
        // Actually, ui.js often calls loadFile logic directly or emits event.
        // For now, retaining existing flows.
        loadAdvancedItem(type);
    }
};

window.selectMapSlot = function (type, index) {
    // Update State
    if (type === 'fuel') currentFuelMapIndex = index;
    if (type === 'ign') currentIgnMapIndex = index;

    // Update UI
    const container = type === 'fuel' ? document.getElementById('file-item-fuel') :
        (type === 'ign' ? document.querySelector(`.file-item[onclick*="'ign_map'"]`) : null);

    if (container) {
        const btns = container.querySelectorAll('.sub-btn');
        btns.forEach((btn, i) => {
            if ((i + 1) === index) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }
    console.log(`Selected ${type} map index: ${index}`);
};

window.selectPriorityMap = function (index) {
    if (currentPriorityMap === index) return; // No change

    // Conflict Resolution: If selecting same as Next, SWAP Next to old Priority
    if (currentNextMap === index) {
        currentNextMap = currentPriorityMap;
        updateNextMapUI();
    }

    currentPriorityMap = index;
    updatePriorityMapUI();
};

window.selectNextMap = function (index) {
    if (currentNextMap === index) return; // No change

    // Conflict Resolution: If selecting same as Priority, SWAP Priority to old Next
    if (currentPriorityMap === index) {
        currentPriorityMap = currentNextMap;
        updatePriorityMapUI();
    }

    currentNextMap = index;
    updateNextMapUI();
};

function updatePriorityMapUI() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-prio-${i}`);
        if (btn) {
            if (i === currentPriorityMap) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }
}

function updateNextMapUI() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-next-${i}`);
        if (btn) {
            if (i === currentNextMap) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }
}
// ---------------------------
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
    // For Headers (Col/Row), select immediately and enable drag
    if (type === 'col' || type === 'row') {
        isLongPressMode = true; // Enable drag immediately
        selectionType = type;
        if (navigator.vibrate) navigator.vibrate(50); // Immediate feedback

        if (type === 'col') {
            const c = parseInt(index1);
            selectionStartCell = c;
            selectColumn(c);
        } else if (type === 'row') {
            const r = parseInt(index1);
            selectionStartCell = r;
            selectRow(r);
        }
        return; // Skip timer
    }

    // For Cells, keep long press timer (or user didn't specify? User only mentioned headers).
    // Assuming keep cells as is for now.
    longPressTimer = setTimeout(() => {
        isLongPressMode = true;
        selectionType = type;

        if (navigator.vibrate) navigator.vibrate(50);

        if (type === 'cell') {
            const t = parseInt(index1);
            const r = parseInt(index2);
            selectionStartCell = { t, r };
            startSelection(t, r);
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
    } else if (selectionType === 'col') {
        const header = target.closest('.header-cell');
        // Fallback: if user drags onto cells below the header, map cell to Col
        let c = -1;
        if (header && header.dataset.col !== undefined) {
            c = parseInt(header.dataset.col);
        } else {
            const cell = target.closest('.cell');
            if (cell && cell.id && cell.id.startsWith('c-')) {
                c = parseInt(cell.id.split('-')[2]);
            }
        }

        if (c !== -1 && selectionStartCell !== null) {
            // Range select from start to c
            selectColumnRange(selectionStartCell, c);
        }

    } else if (selectionType === 'row') {
        const label = target.closest('.label-cell');
        // Fallback: if user drags onto cells to the right, map cell to Row
        let r = -1;
        if (label && label.dataset.row !== undefined) {
            r = parseInt(label.dataset.row);
        } else {
            const cell = target.closest('.cell');
            if (cell && cell.id && cell.id.startsWith('c-')) {
                r = parseInt(cell.id.split('-')[1]);
            }
        }

        if (r !== -1 && selectionStartCell !== null) {
            selectRowRange(selectionStartCell, r);
        }
    }
}

// Helper to select range of columns
function selectColumnRange(start, end) {
    selectedCells.clear();
    const min = Math.min(start, end);
    const max = Math.max(start, end);

    // Assuming tpsBreaks is rows (0..N) and rpmBreaks is cols (0..M)
    // Actually fuelMap is [row][col]. So `t` is Row Index (TPS), `r` is Col Index (RPM)?
    // Let's verify: c-{t}-{r}. In `startSelection(t, r)`, t is row-index, r is col-index.
    // So selectColumnRange means picking ALL rows for cols min..max.

    for (let c = min; c <= max; c++) {
        for (let r = 0; r < RPM_AXIS.length; r++) {
            selectedCells.add(`${r}-${c}`);
        }
    }
    updateUISelection();
}

// Helper to select range of rows
function selectRowRange(start, end) {
    selectedCells.clear();
    const min = Math.min(start, end);
    const max = Math.max(start, end);

    for (let r = min; r <= max; r++) {
        for (let c = 0; c < RPM_AXIS.length; c++) {
            selectedCells.add(`${r}-${c}`);
        }
    }
    updateUISelection();
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
    isLongPressMode = false;
    selectionType = null;
}

document.addEventListener('touchstart', function (e) {
    // Enable Pinch Zoom: If more than 1 point, DO NOT prevent default
    if (e.touches.length > 1) return;

    const cell = e.target.closest('.cell');
    if (cell && cell.id && cell.id.startsWith('c-')) {
        // e.preventDefault(); // allow zoom? NO, if cell interaction, we might want to block scroll/zoom?
        // Actually, for pinch zoom to work on the GRID, we must NOT preventDefault on the container unless necessary.
        // If we touch a cell to select, we process it.
        const parts = cell.id.split('-');
        handleTouchStart(e, 'cell', parts[1], parts[2]);
    } else if (e.target.dataset.col !== undefined) {
        handleTouchStart(e, 'col', e.target.dataset.col);
    } else if (e.target.dataset.row !== undefined) {
        handleTouchStart(e, 'row', e.target.dataset.row);
    }
}, { passive: false });

document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) return; // Allow pinch
    handleTouchMove(e);
}, { passive: false });
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
    popupMode = mode;
    // Defensive check to avoid TypeError if old elements are cached or ghosted
    const oldAbs = document.getElementById('mode-abs');
    const oldPct = document.getElementById('mode-pct');
    if (oldAbs) oldAbs.classList.toggle('active', mode === 'abs');
    if (oldPct) oldPct.classList.toggle('active', mode === 'pct');

    const toggleBtn = document.getElementById('btn-mode-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = (mode === 'abs') ? 'ABS' : '%';
        toggleBtn.style.color = (mode === 'abs') ? 'var(--accent)' : '#ff9900';
    }

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

window.togglePopupMode = function () {
    const newMode = (popupMode === 'abs') ? 'pct' : 'abs';
    switchPopupMode(newMode);
};

window.adjustDelta = function (direction) {
    const input = document.getElementById('popup-delta');
    if (!input) return;
    let current = parseFloat(input.value);

    // Safety check
    if (isNaN(current)) current = (popupMode === 'abs') ? 10 : 1.0;

    if (popupMode === 'abs') {
        if (direction > 0) {
            current += 1;
        } else {
            current = Math.max(1, current - 1);
        }
        // ABS Limit: 1000
        current = Math.min(1000, current);

        popupDeltaAbs = current;
        input.value = current;
    } else {
        current = parseFloat((current + (direction * 0.1)).toFixed(1));
        if (current <= 0) current = 0.1;

        // Pct Limit: 50
        current = Math.min(50, current);

        popupDeltaPct = current;
        input.value = current.toFixed(1);
    }

    // Debug
    // console.log("AdjustDelta:", direction, current);
};

// --- New Spinner Logic ---


window.adjustCellValue = function (direction) {
    // console.log("adjustCellValue called", direction); // Debug
    const deltaInput = document.getElementById('popup-delta');
    if (!deltaInput) return;
    let deltaValue = parseFloat(deltaInput.value);

    // Ensure valid delta
    if (isNaN(deltaValue) || deltaValue <= 0) {
        deltaValue = (popupMode === 'abs') ? 10 : 1.0;
    }

    // In Percent mode, direction applies to the percentage? usually map * (1 + delta/100) or map + delta%?
    // Current logic uses add/sub based on mode logic in `updateData`?
    // Let's check how we apply it. 
    // Wait, updateData takes (t, r, val). We need to calculate new val.

    if (popupMode === 'pct') {
        // ... (existing logic likely handles this)
        popupDeltaPct = deltaValue;

        deltaInput.value = deltaValue.toFixed(1);
    } else {
        popupDeltaAbs = deltaValue;
    }

    const cellsToUpdate = selectedCells.size > 0 ? Array.from(selectedCells) : [`${selT}-${selR}`];

    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        if (!fuelMap[t] || typeof fuelMap[t][r] === 'undefined') return;

        const currentValue = fuelMap[t][r];
        const originalValue = originalFuelMap[t][r];
        let newValue;

        if (popupMode === 'abs') {
            newValue = currentValue + (direction * deltaValue);
        } else {
            const changeAmount = Math.round(originalValue * deltaValue / 100);
            newValue = currentValue + (direction * changeAmount);
        }

        // Limit 0 or higher
        newValue = Math.max(0, newValue);

        fuelMap[t][r] = Math.round(newValue);

        const input = document.querySelector(`#c-${t}-${r} input`);
        if (input) {
            input.value = fuelMap[t][r];
            const cell = document.getElementById(`c-${t}-${r}`);
            if (cell) cell.style.background = getColor(fuelMap[t][r], t, r);
        }
    });

    updateUISelection();
    saveHistory();

    const graphOverlay = document.getElementById('graph-overlay');
    if (graphOverlay && graphOverlay.classList.contains('active')) {
        if (typeof updateGraph === 'function') updateGraph();
    }
};

window.getColor = getColor;

// --- Global Event Logic (Debounced) ---
let applyInterval, applyTimeout;
let spinnerInterval, spinnerTimeout;
let lastTouchTime = 0;

function handleTouchDebounce(e) {
    if (e.type === 'touchstart') {
        lastTouchTime = Date.now();
        return true; // Allow touch
    }
    if (e.type === 'mousedown') {
        if (Date.now() - lastTouchTime < 1000) {
            e.preventDefault();
            return false; // Block ghost mouse
        }
    }
    return true;
}

window.addEventListener('mouseup', () => { stopApply(); stopSpinner(); });
window.addEventListener('touchend', () => { stopApply(); stopSpinner(); });

window.startApply = function (direction, e) {
    if (e && e.type === 'touchstart') e.preventDefault();
    if (e && !handleTouchDebounce(e)) return;

    adjustCellValue(direction); // Initial
    clearTimeout(applyTimeout); clearInterval(applyInterval);
    applyTimeout = setTimeout(() => {
        applyInterval = setInterval(() => adjustCellValue(direction), 100);
    }, 500);
};

window.stopApply = function (e) {
    if (e) {
        // e.preventDefault(); // Optional, but might interfere with click? Left out for safety unless needed
    }
    clearTimeout(applyTimeout);
    clearInterval(applyInterval);
};

window.startSpinner = function (direction, e) {
    if (e && !handleTouchDebounce(e)) return;

    adjustDelta(direction);

    clearTimeout(spinnerTimeout); clearInterval(spinnerInterval);
    spinnerTimeout = setTimeout(() => {
        spinnerInterval = setInterval(() => adjustDelta(direction), 100);
    }, 500);
};

window.stopSpinner = function (e) {
    clearTimeout(spinnerTimeout);
    clearInterval(spinnerInterval);
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
            for (let r = 0; r < fuelMap[t].length; r++) {
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
            for (let r = 0; r < RPM_AXIS.length; r++) {
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
                    for (let r = 0; r < RPM_AXIS.length; r++) {
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
                    for (let r = 0; r < RPM_AXIS.length; r++) {
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
            // Removed inline border to rely on updateUISelection classes


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

    // Restore highlights for selected cells after re-rendering
    updateUISelection();
}

function handleCellMouseDown(e, t, r) {
    // GUARD: Universal Visibility Check
    if (window.currentTabId !== 'editor') return;

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
    // GUARD: Universal Visibility Check
    if (window.currentTabId !== 'editor') return;

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
    // GUARD: Logic-Based Visibility Check
    if (window.currentTabId !== 'editor') {
        const popup = document.getElementById('edit-popup-v2');
        if (popup) {
            popup.style.display = 'none';
            popup.classList.remove('active');
        }
        return;
    }

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
        // Removed cross-highlight logic as requested
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

    // Display values for the primary selected cell (Focus)
    // selT, selR are updated on click/drag to the latest focus
    const currentValue = fuelMap[selT][selR];
    const originalValue = originalFuelMap[selT][selR];

    const cellCount = selectedCells.size;
    let infoText = "";
    if (cellCount > 1) {
        infoText = `${cellCount} cells selected`;
    } else {
        infoText = `TPS: ${TPS_AXIS[selT]}%, RPM: ${RPM_AXIS[selR]}`;
    }

    // Safely update elements that might be removed
    const elCell = document.getElementById('info-cell');
    if (elCell) {
        if (cellCount > 1) elCell.innerText = `${cellCount} cells selected (Main: TPS ${TPS_AXIS[selT]}%, RPM ${RPM_AXIS[selR]})`;
        else elCell.innerText = infoText;
    }

    const elValue = document.getElementById('info-value');
    if (elValue) elValue.innerText = currentValue;

    const elOriginal = document.getElementById('info-original');
    if (elOriginal) elOriginal.innerText = originalValue;

    // --- Update Mobile Info Bar ---
    document.getElementById('info-filename').innerText = (typeof currentFileName !== 'undefined' ? currentFileName : 'No File') + ' (debug_82)';
    // Use the focused cell values
    document.getElementById('info-values').innerText = `Curr:${currentValue} / Orig:${originalValue}`;
    // -----------------------------

    updatePopupPosition();
}

// ALIAS FOR HTML CALLS
window.resetToOriginal = function () {
    if (typeof resetCellToOriginal === 'function') {
        resetCellToOriginal();
    } else {
        console.error('resetCellToOriginal function not found!');
    }
};

window.updateFileInfo = function () {
    // Helper to just update the filename independent of selection
    const el = document.getElementById('info-filename');
    if (el) el.innerText = (typeof currentFileName !== 'undefined' ? currentFileName : 'No File') + ' (debug_82)';
};

// Expose closePopup globally
window.closePopup = function () {
    const popup = document.getElementById('edit-popup-v2');
    if (popup) {
        popup.classList.remove('active');
        popup.style.display = 'none'; // Force hide
        document.body.classList.remove('popup-active');
    }
};

window.togglePopupMode = function () {
    popupMode = (popupMode === 'abs') ? 'pct' : 'abs';
    const btn = document.getElementById('btn-mode-toggle');
    const input = document.getElementById('popup-delta');

    if (btn) {
        btn.innerText = (popupMode === 'abs') ? 'ABS' : '%';
        btn.style.color = (popupMode === 'abs') ? 'var(--accent)' : '#ff9900';
    }

    // Update input value
    if (input) {
        if (popupMode === 'abs') {
            popupDeltaAbs = 10; // Default or saved? Using 10 as reset
            input.value = popupDeltaAbs;
        } else {
            popupDeltaPct = 1.0;
            input.value = popupDeltaPct.toFixed(1);
        }
    }
};

function updatePopupPosition() {
    const popup = document.getElementById('edit-popup-v2');

    // GUARD: Universal Visibility Check (Strict State)
    if (window.currentTabId !== 'editor') {
        if (popup) {
            popup.classList.remove('active');
            popup.style.display = 'none';
        }
        return;
    }

    // NEW: Check for Graph Overlay OR Settings Menu
    const graphOverlay = document.getElementById('graph-overlay');
    const settingsMenu = document.getElementById('settings-menu');

    if ((graphOverlay && graphOverlay.classList.contains('active')) ||
        (settingsMenu && settingsMenu.classList.contains('active'))) {
        if (popup) {
            popup.classList.remove('active');
            popup.style.display = 'none';
        }
        return;
    }

    // Previous DOM checks removed as they were unreliable/confusing
    const editorView = document.getElementById('editor-view');
    if (editorView && (!editorView.classList.contains('active') || editorView.offsetParent === null)) {
        if (popup) {
            popup.classList.remove('active');
            popup.style.display = 'none';
        }
        return;
    }

    const selectedCell = document.getElementById(`c-${selT}-${selR}`);
    if (!selectedCell) {
        if (popup) {
            popup.classList.remove('active');
            popup.style.display = 'none';
        }
        return;
    }

    // Force display block/flex when active
    if (popup) {
        popup.classList.add('active');
        popup.style.display = 'flex';
    }

    if (window.innerWidth <= 1024) {
        if (popup) {
            popup.classList.add('active');
            popup.style.top = '';
            // CRITICAL FIX: Keep left at 50% so translateX(-50%) works as intended (Centering)
            popup.style.left = '50%';
            popup.style.display = '';
        }
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

    popup.classList.add('active');
}

window.renderTable = renderTable;
window.updateUISelection = updateUISelection;
window.updatePopupPosition = updatePopupPosition;

// New Functions
window.updateData = function (t, r, val) {
    if (fuelMap[t] && typeof fuelMap[t][r] !== 'undefined') {
        val = Math.max(0, val); // Limit 0
        fuelMap[t][r] = val;
        saveHistory();
        renderTable(); // Re-render to update colors/diffs
        if (document.getElementById('graph-overlay') && document.getElementById('graph-overlay').classList.contains('active')) {
            if (typeof updateGraph === 'function') updateGraph();
        }
    }
};

// Old resetCellToOriginal removed


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
    for (let r = 0; r < RPM_AXIS.length; r++) {
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
    if (selectedCells.size < RPM_AXIS.length) return false;
    for (let r = 0; r < RPM_AXIS.length; r++) {
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

window.resetCellToOriginal = function () {
    let targets = [];
    if (selectedCells.size > 0) {
        selectedCells.forEach(key => {
            const [t, r] = key.split('-').map(Number);
            targets.push({ t, r });
        });
    } else {
        targets.push({ t: selT, r: selR });
    }

    let changed = false;
    targets.forEach(({ t, r }) => {
        if (fuelMap[t] && originalFuelMap[t] && typeof fuelMap[t][r] !== 'undefined') {
            const currentVal = fuelMap[t][r];
            const originalVal = originalFuelMap[t][r];
            if (currentVal !== originalVal) {
                fuelMap[t][r] = originalVal;
                changed = true;

                // Direct DOM update for responsiveness
                const input = document.querySelector(`#c-${t}-${r} input`);
                if (input) {
                    input.value = originalVal;
                    // Update color simplified
                    const cell = document.getElementById(`c-${t}-${r}`);
                    if (cell) cell.style.background = getColor(originalVal, t, r);
                }
            }
        }
    });

    if (changed) {
        saveHistory();
        renderTable(); // Ensure everything is consistent
        updateUISelection();
        const graphOverlay = document.getElementById('graph-overlay');
        if (graphOverlay && graphOverlay.classList.contains('active')) {
            if (typeof updateGraph === 'function') updateGraph();
        }
    }
};

// --- File Menu Logic ---
window.toggleFileMode = function () {
    const toggle = document.getElementById('mode-toggle');
    if (toggle && toggle.checked) {
        document.body.classList.remove('basic-mode');
    } else {
        document.body.classList.add('basic-mode');
    }
};

window.selectFileItem = function (el, type) {
    // UI Update
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('active');
        item.style.border = "1px solid #3c3c3c"; // Reset inline
    });

    el.classList.add('active');
    el.style.border = "2px solid #0078d4";

    // Logic to switch data would go here
    console.log("Selected Item:", type);
};

// Initialize Basic Mode
// --- Visual Viewport Handling for Mobile Zoom ---
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportLayout);
    window.visualViewport.addEventListener('scroll', updateViewportLayout);
}

function updateViewportLayout() {
    if (!window.visualViewport) return;

    const viewport = window.visualViewport;
    const scale = 1 / viewport.scale; // Inverse scale
    const offsetLeft = viewport.offsetLeft;
    const offsetTop = viewport.offsetTop;

    // Target Elements: Bottom Nav, Fixed Info Bar, Popup
    const bottomNav = document.getElementById('main-nav') || document.getElementById('bottom-nav');
    const infoBar = document.getElementById('mobile-info-bar');
    const popup = document.getElementById('edit-popup-v2');

    // 1. Bottom Nav (Fixed Bottom)
    if (bottomNav) {
        // Keep it visual bottom
        // Logic: transform scale(inverse) and translate to keep position relative to viewport
        // Simpler approach: Just scale to keep size, but position:fixed usually handles placement unless zoomed in deeply.
        // If zoomed in, position:fixed sticks to layout viewport, not visual viewport.
        // We need to move it to visual viewport bottom.

        // However, most modern browsers handle position:fixed reasonably well for bottom bars, 
        // BUT when zoomed, they can be huge.

        bottomNav.style.transformOrigin = 'bottom left';
        // We need to translate it to the visual viewport's bottom
        // Total Height - (offsetTop + height) ... complex.

        // Let's stick to just scaling SIZE for now, as user requested "Menu and Popup shouldn't enlarge"
        bottomNav.style.transform = `scale(${scale})`;
        bottomNav.style.width = `${viewport.width}px`; // Match visual width
        bottomNav.style.left = `${offsetLeft}px`;      // Move to visual left
        bottomNav.style.bottom = `${0}px`; // This might need offset calculation if browser bars hide/show

        // Actually, simpler to just set width 100% of visual viewport and scale.
        // But 'fixed' elements usually stick to Layout Viewport.
        // To stick to Visual Viewport, we often need absolute positioning relative to window + scrolling.

        // REVISED STRATEGY: 
        // Use transform to Scale AND Translate to visual viewport location.
        // But since they are position:fixed, they are relative to Layout Viewport.

        // Calculate offset from Layout Viewport Bottom to Visual Viewport Bottom
        // LayoutHeight - (VisualTop + VisualHeight)
        const layoutHeight = document.documentElement.clientHeight;
        const visualBottom = offsetTop + viewport.height;
        const distFromBottom = layoutHeight - visualBottom;

        bottomNav.style.transformOrigin = 'bottom left';
        bottomNav.style.transform = `translate(${offsetLeft}px, -${distFromBottom}px) scale(${scale})`;
        bottomNav.style.width = `${viewport.width * viewport.scale}px`; // Counteract scale? No.
        bottomNav.style.width = `100%`; // Keep 100% of transformed container
    }

    // 2. Edit Popup (Center Bottom)
    if (popup && popup.style.display !== 'none') {
        const layoutHeight = document.documentElement.clientHeight;
        const visualBottom = offsetTop + viewport.height;
        const distFromBottom = layoutHeight - visualBottom;

        // Popup base style: left: 50%, translateX(-50%), bottom: 60px
        // We need to keep it centered in Visual Viewport and size-maintained.

        popup.style.transformOrigin = 'bottom center';

        // Calculate Center of Visual Viewport relative to Layout Viewport
        const visualCenter = offsetLeft + (viewport.width / 2);

        // We want the element's center to be at 'visualCenter'.
        // Original CSS: left: 50% (of layout), translateX(-50%)

        // Let's rely on transforms.
        // TranslateY to stick to visual bottom (taking into account the 60px nav offset)
        // TranslateX to stick to visual center (offset from layout center)

        const layoutCenter = document.documentElement.clientWidth / 2;
        const offsetX = visualCenter - layoutCenter;

        // Base Transform is translateX(-50%). We add to that.
        // And we add scale.
        popup.style.transform = `translateX(-50%) translate(${offsetX}px, -${distFromBottom}px) scale(${scale})`;

        // Note: This assumes the popup's original 'bottom' (60px) is respected relative to the shifted baseline.
    }

    // 3. Info Bar (Top) - Optional, user didn't explicitly ask, but good for consistency
    if (infoBar) {
        infoBar.style.transformOrigin = 'top left';
        infoBar.style.width = `100%`;
    }
}
// ---------------------------------------------
// Initialize Basic Mode
// --- Virtual Pinch Zoom Implementation (Stable) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Virtual Zoom on #map-section or #editor-view
    const editorView = document.getElementById('editor-view');
    const tableWrapper = document.getElementById('table-wrapper');

    if (editorView && tableWrapper) {
        let initialDistance = 0;
        let panned = false; // Flag to differentiate pinch from scroll
        let currentZoom = 1.0;
        const minZoom = 0.5;
        const maxZoom = 3.0;

        editorView.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Determine initial distance
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
                // Prevent native behavior if possible
                // e.preventDefault(); // Might block scroll, be careful. 
                // We rely on touch-action: movement in CSS usually, but for custom pinch we might need preventDefault() on move.
            }
        }, { passive: false });

        editorView.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); // Stop native zoom/scroll interference

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);

                if (initialDistance > 0) {
                    const diff = currentDistance - initialDistance;
                    const sensitivity = 0.005; // Adjust sensitivity

                    let newZoom = currentZoom + (diff * sensitivity);

                    // Clamp
                    newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));

                    // Apply
                    tableWrapper.style.zoom = newZoom;

                    // Update state for next move (optional, but better to keep accumulative from initial usually, 
                    // or differential? Differential is safer for 'style.zoom' since it's absolute)
                    // Actually, for smooth pinch, we usually want delta.
                    // But here we are updating 'currentZoom' continuously? 
                    // No, 'initialDistance' is fixed at start. So we calculated delta from START.

                    // We need to store 'startZoom' at touchstart.
                }
            }
        }, { passive: false });

        editorView.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Capture Start Zoom to apply delta relative to it
                const currentStyle = window.getComputedStyle(tableWrapper).zoom;
                currentZoom = parseFloat(currentStyle) || 1.0;
            }
        }, { passive: true }); // Passive true for the second listener just to capture state is fine

    }

    // Default Basic? Toggle unchecked = Basic
    // Ensure element exists before checking
    const toggle = document.getElementById('mode-toggle');
    if (toggle && !toggle.checked) {
        document.body.classList.add('basic-mode');
    }

    // Also re-apply scroll fixes just in case
    const mapSection = document.getElementById('map-section');
    if (mapSection) mapSection.scrollTop = 0;

    // Ensure Editor View is active initially
    if (typeof switchTab === 'function') {
        switchTab('editor');
    }
});
