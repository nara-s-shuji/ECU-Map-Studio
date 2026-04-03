import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { 
    initData, 
    undo, 
    redo, 
    importFromCSV, 
    importBaseFromCSV, 
    saveFileToCSV 
} from './data.js';
import { renderTable } from './editor.js';
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
    handleCellMouseDown, 
    handleCellMouseEnter,
    handleTouchMove,
    handleTouchEnd,
    handleTouchStart
} from './selection.js';
import { 
    updatePopupPosition, 
    startApply, 
    stopApply, 
    startSpinner, 
    stopSpinner, 
    togglePopupMode,
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

    // 2. Navigation Event Listeners
    setupNavigation();

    // 3. Popup Event Listeners
    setupPopup();

    // 4. Drawer & Information Listeners (v2026.38)
    initInfoBarDrag();

    // 5. File View & Settings Listeners
    setupFileView();
    setupFileItems();

    // 6. Monitor View Listeners
    setupMonitorView();

    // 7. Graph View Listeners
    setupGraphView();

    // 8. Initial Label Update (Fix "Loading..." persistent text)
    const labelFileName = document.getElementById('info-filename');
    if (labelFileName) {
        labelFileName.innerText = state.currentFileName || '入力待ち...';
    }

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

function setupNavigation() {
    const navItems = [
        { id: 'nav-file', tab: 'file' },
        { id: 'nav-editor', tab: 'editor' },
        { id: 'nav-graph', tab: 'graph' },
        { id: 'nav-monitor', tab: 'monitor' }
    ];

    navItems.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) el.onclick = () => switchTab(item.tab);
    });

    const btnMenu = document.getElementById('nav-menu');
    if (btnMenu) btnMenu.onclick = () => toggleSettings();
    
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) settingsOverlay.onclick = () => toggleSettings(false);
}

function setupPopup() {
    const popup = document.getElementById('edit-popup-v2');
    if (!popup) return;

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
}

function setupFileView() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.onchange = (e) => importFromCSV(e.target);

    const baseInput = document.getElementById('base-file-input');
    if (baseInput) baseInput.onchange = (e) => importBaseFromCSV(e.target);

    const colorMode = document.getElementById('cell-color-mode');
    if (colorMode) colorMode.onchange = () => updateCellColorMode();
}

function setupFileItems() {
    // Map Slots
    document.querySelectorAll('.sub-btn[data-map]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll(`.sub-btn[data-map="${btn.dataset.map}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectMapSlot(btn.dataset.map, parseInt(btn.dataset.slot));
        });
    });

    // Priority Buttons
    document.querySelectorAll('.sub-btn[data-prio]').forEach(btn => {
        btn.onclick = (e) => selectPriorityMap(parseInt(btn.dataset.prio));
    });

    // Next Map (If any)
    document.querySelectorAll('.sub-btn[data-next]').forEach(btn => {
        btn.onclick = (e) => selectNextMap(parseInt(btn.dataset.next));
    });
}

function setupMonitorView() {
    const btnRecord = document.getElementById('btn-record-all');
    if (btnRecord) {
        btnRecord.onclick = () => {
            const active = monitor.toggleRecording();
            btnRecord.innerText = active ? "⏹️ ログ記録停止" : "⏺️ ログ記録開始";
            btnRecord.style.background = active ? "#ff4444" : "transparent";
        };
    }

    const btnSave = document.getElementById('btn-save-all');
    if (btnSave) btnSave.onclick = () => monitor.saveLog();
}

function setupGraphView() {
    const graphType = document.getElementById('graph-type');
    if (graphType) graphType.onchange = () => updateGraph();
}

// Global Exports for HTML inline compatibility where needed
window.saveFileToCSV = saveFileToCSV;
window.undo = undo;
window.redo = redo;
window.toggleSettings = toggleSettings;
window.toggleExplorer = toggleExplorer;
window.switchTab = switchTab;
window.resetToOriginal = resetToOriginal;
window.togglePopupMode = togglePopupMode;
window.updateCellColorMode = updateCellColorMode;
