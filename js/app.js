import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { 
    initData, 
    undo, 
    redo, 
    importFromCSV, 
    importBaseFromCSV, 
    saveFileToCSV, 
    saveHistory 
} from './data.js';
import { renderTable, updateData } from './editor.js';
import { 
    switchTab, 
    toggleSettings, 
    toggleExplorer, 
    updateCellColorMode,
    selectMapSlot,
    selectPriorityMap,
    selectNextMap,
    initInfoBarDrag
} from './navigation.js';
import { 
    updateUISelection, 
    handleCellMouseDown, 
    handleCellMouseEnter,
    handleTouchMove,
    handleTouchEnd,
    selectColumn, 
    selectRow, 
    isColumnSelected, 
    isRowSelected 
} from './selection.js';
import { 
    updatePopupPosition, 
    startApply, 
    stopApply, 
    startSpinner, 
    stopSpinner, 
    togglePopupMode,
    adjustCellValue,
    resetToOriginal
} from './popup.js';
import { initPinchZoom, updateViewportLayout } from './gestures.js';
import { toggleGraph, updateGraph } from './graph.js';
import { monitor } from './monitor.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data & UI
    initData();
    renderTable();
    initPinchZoom();

    // 2. Toolbar Event Listeners
    setupToolbar();

    // 3. Navigation Event Listeners
    setupNavigation();

    // 4. Popup Event Listeners
    setupPopup();

    // 5. Drawer & Information Listeners (RESTORED v2026.35)
    initInfoBarDrag();

    // 6. File View & Settings Listeners
    setupFileView();
    setupFileItems();

    // 7. Monitor View Listeners
    setupMonitorView();

    // 8. Graph View Listeners
    setupGraphView();

    // 9. Global State Sync
    window.addEventListener('resize', () => {
        updateViewportLayout();
        updatePopupPosition();
    });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) return;
        handleTouchMove(e);
    }, { passive: false });

    document.addEventListener('touchend', handleTouchEnd);

    document.addEventListener('mouseup', () => {
        state.isHeaderDragging = false;
        state.isSelecting = false;
    });
});

function setupToolbar() {
    const actions = {
        'open': () => document.getElementById('file-input').click(),
        'base-open': () => document.getElementById('base-file-input').click(),
        'save': () => saveFileToCSV(),
        'undo': () => undo(),
        'redo': () => redo(),
        'ecu-connect': () => toggleECUConnection(),
        'write': () => writeToECU(),
        'read': () => readFromECU(),
        'graph': () => toggleGraph(),
        'settings': () => toggleSettings(),
        'explorer': () => toggleExplorer()
    };

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        const tooltip = btn.dataset.tooltip || '';
        if (tooltip.includes('ファイルを開く')) btn.onclick = actions.open;
        else if (tooltip.includes('基準ファイル')) btn.onclick = actions['base-open'];
        else if (tooltip.includes('保存')) btn.onclick = actions.save;
        else if (btn.id === 'btn-undo') btn.onclick = actions.undo;
        else if (btn.id === 'btn-redo') btn.onclick = actions.redo;
        else if (btn.id === 'btn-ecu-connect') btn.onclick = actions['ecu-connect'];
        else if (btn.id === 'btn-write') btn.onclick = actions.write;
        else if (btn.id === 'btn-read') btn.onclick = actions.read;
        else if (btn.id === 'btn-graph') btn.onclick = actions.graph;
        else if (btn.id === 'btn-settings') btn.onclick = actions.settings;
    });

    const hamburger = document.getElementById('hamburger-btn');
    if (hamburger) hamburger.onclick = actions.explorer;
}

function setupNavigation() {
    const navMapping = [
        { selector: '#nav-file', tab: 'file' },
        { selector: '#nav-editor', tab: 'editor' },
        { selector: '#nav-graph', tab: 'graph' },
        { selector: '#nav-monitor', tab: 'monitor' },
        { selector: '#nav-menu', action: () => toggleSettings() }
    ];

    navMapping.forEach(item => {
        document.querySelectorAll(item.selector).forEach(el => {
            el.onclick = () => {
                if (item.tab) switchTab(item.tab);
                else if (item.action) item.action();
            };
        });
    });
}

function setupPopup() {
    const popup = document.getElementById('edit-popup-v2');
    if (!popup) return;

    const btnReset = popup.querySelector('.popup-btn:first-child');
    if (btnReset) btnReset.onclick = () => resetToOriginal();

    const btnMinus = document.getElementById('btn-apply-minus');
    if (btnMinus) {
        btnMinus.onmousedown = (e) => startApply(-1, e);
        btnMinus.onmouseup = stopApply;
        btnMinus.onmouseleave = stopApply;
        btnMinus.ontouchstart = (e) => startApply(-1, e);
        btnMinus.ontouchend = stopApply;
    }

    const btnPlus = document.getElementById('btn-apply-plus');
    if (btnPlus) {
        btnPlus.onmousedown = (e) => startApply(1, e);
        btnPlus.onmouseup = stopApply;
        btnPlus.onmouseleave = stopApply;
        btnPlus.ontouchstart = (e) => startApply(1, e);
        btnPlus.ontouchend = stopApply;
    }

    const spinnerDown = document.getElementById('btn-spin-down');
    if (spinnerDown) {
        spinnerDown.onmousedown = (e) => startSpinner(-1, e);
        spinnerDown.onmouseup = stopSpinner;
        spinnerDown.onmouseleave = stopSpinner;
        spinnerDown.ontouchstart = (e) => startSpinner(-1, e);
        spinnerDown.ontouchend = stopSpinner;
    }

    const spinnerUp = document.getElementById('btn-spin-up');
    if (spinnerUp) {
        spinnerUp.onmousedown = (e) => startSpinner(1, e);
        spinnerUp.onmouseup = stopSpinner;
        spinnerUp.onmouseleave = stopSpinner;
        spinnerUp.ontouchstart = (e) => startSpinner(1, e);
        spinnerUp.ontouchend = stopSpinner;
    }

    const btnMode = document.getElementById('btn-mode-toggle');
    if (btnMode) btnMode.onclick = () => togglePopupMode();
    
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) settingsOverlay.onclick = () => toggleSettings(false);
}

function setupFileView() {
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
        modeToggle.onchange = () => {
            document.body.classList.toggle('basic-mode', !modeToggle.checked);
        };
    }

    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.onchange = (e) => importFromCSV(e.target);

    const baseInput = document.getElementById('base-file-input');
    if (baseInput) baseInput.onchange = (e) => importBaseFromCSV(e.target);

    const btnExplorer = document.getElementById('btn-menu-explorer');
    if (btnExplorer) btnExplorer.onclick = () => toggleExplorer();

    const btnOpen = document.getElementById('btn-menu-open');
    if (btnOpen) btnOpen.onclick = () => document.getElementById('file-input').click();

    const btnBase = document.getElementById('btn-menu-base');
    if (btnBase) btnBase.onclick = () => document.getElementById('base-file-input').click();

    const colorMode = document.getElementById('cell-color-mode');
    if (colorMode) colorMode.onchange = () => updateCellColorMode();

    const btnFileRead = document.getElementById('btn-file-read');
    if (btnFileRead) btnFileRead.onclick = () => readFromECU();

    const btnFileWrite = document.getElementById('btn-file-write');
    if (btnFileWrite) btnFileWrite.onclick = () => writeToECU();

    const btnFileOpen = document.getElementById('btn-file-open');
    if (btnFileOpen) btnFileOpen.onclick = () => document.getElementById('file-input').click();

    const btnFileSave = document.getElementById('btn-file-save');
    if (btnFileSave) btnFileSave.onclick = () => saveFileToCSV();
}

function setupFileItems() {
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const idMap = {
                'file-item-fuel': 'fuel',
                'file-item-map-sel': 'map_sel',
                'file-item-fuel-idle': 'fuel_idle',
                'file-item-start-inj': 'start_inj',
                'file-item-async-inj': 'async_inj',
                'file-item-accel': 'accel',
                'file-item-rpm-corr': 'rpm_corr',
                'file-item-oil-corr': 'oil_corr',
                'file-item-dwell': 'dwell',
                'file-item-ign-map': 'ign'
            };
            
            const mapKey = idMap[this.id];
            if (mapKey) state.currentMap = mapKey;
        });
    });

    document.querySelectorAll('.sub-btn[data-map]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectMapSlot(btn.dataset.map, parseInt(btn.dataset.slot));
        });
    });

    document.querySelectorAll('.sub-btn[data-prio]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            selectPriorityMap(parseInt(btn.dataset.prio));
        };
    });

    document.querySelectorAll('.sub-btn[data-next]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            selectNextMap(parseInt(btn.dataset.next));
        };
    });
}

function setupMonitorView() {
    const btnRecord = document.getElementById('btn-record-all');
    if (btnRecord) btnRecord.onclick = () => monitor.toggleRecording();

    const btnSave = document.getElementById('btn-save-all');
    if (btnSave) btnSave.onclick = () => monitor.saveLog();

    const btnConnects = document.querySelectorAll('.btn-connect');
    btnConnects.forEach(btn => {
        btn.onclick = () => monitor.toggleConnection();
    });
}

function setupGraphView() {
    const graphType = document.getElementById('graph-type');
    if (graphType) graphType.onchange = () => updateGraph();

    const graphClose = document.getElementById('graph-close');
    if (graphClose) graphClose.onclick = () => toggleGraph();
}

// ECU Communication Stubs (to be implemented)
function toggleECUConnection() { alert("ECU接続機能: 未実装"); }
function writeToECU() { alert("ECU書き込み機能: 未実装"); }
function readFromECU() { alert("ECU読み取り機能: 未実装"); }

// Global Exports
window.openFile = () => document.getElementById('file-input').click();
window.openBaseFile = () => document.getElementById('base-file-input').click();
window.saveFile = saveFileToCSV;
window.undo = undo;
window.redo = redo;
window.toggleECUConnection = toggleECUConnection;
window.writeToECU = writeToECU;
window.readFromECU = readFromECU;
window.toggleGraph = toggleGraph;
window.toggleSettings = toggleSettings;
window.toggleExplorer = toggleExplorer;
window.switchTab = switchTab;
window.resetToOriginal = resetToOriginal;
window.togglePopupMode = togglePopupMode;
window.updateCellColorMode = updateCellColorMode;
window.selectMapSlot = selectMapSlot;
window.selectPriorityMap = selectPriorityMap;
window.selectNextMap = selectNextMap;
