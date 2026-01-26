const RPM_AXIS = Array.from({ length: 20 }, (_, i) => 500 + i * 500);
const TPS_AXIS = Array.from({ length: 21 }, (_, i) => i * 5);
let fuelMap = [];
let originalFuelMap = [];
let selT = 0, selR = 0;
let cellColorMode = 'diff';

// 複数セル選択
let selectedCells = new Set(); // "t-r"形式で保存
let selectionStart = null; // {t, r}
let selectionStartMode = null; // 'cell', 'row', 'col'
let isSelecting = false;
let isShiftSelecting = false; // Shift+矢印キーでの範囲選択

// 履歴管理
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// ポップアップモード
let popupMode = 'abs'; // 'abs' or 'pct'
let popupDeltaAbs = 10; // 絶対値モードの値を保存
let popupDeltaPct = 1.0; // %モードの値を保存

// ECU接続状態
let ecuConnected = false;

// Global Event Listeners setup
document.addEventListener('DOMContentLoaded', function () {
    // Other initializations attached to DOMContentLoaded
    const graphHeader = document.getElementById('graph-header');
    const graphOverlay = document.getElementById('graph-overlay');

    if (graphHeader && graphOverlay) {
        graphHeader.addEventListener('mousedown', function (e) {
            if (e.target.id === 'graph-close' || e.target.id === 'graph-type') return;
            isDragging = true;
            initialX = e.clientX - graphOverlay.offsetLeft;
            initialY = e.clientY - graphOverlay.offsetTop;
        });
    }

    document.addEventListener('mousemove', function (e) {
        if (typeof isDragging !== 'undefined' && isDragging) {
            e.preventDefault();
            const graphOverlay = document.getElementById('graph-overlay');
            if (graphOverlay) {
                graphOverlay.style.left = (e.clientX - initialX) + 'px';
                graphOverlay.style.top = (e.clientY - initialY) + 'px';
                graphOverlay.style.right = 'auto';
            }
        }
    });

    document.addEventListener('mouseup', function () {
        if (typeof isDragging !== 'undefined') isDragging = false;
        isSelecting = false;
    });

    const resizeObserver = new ResizeObserver(() => {
        const graphOverlay = document.getElementById('graph-overlay');
        if (graphOverlay && graphOverlay.classList.contains('active')) {
            setTimeout(() => {
                if (typeof updateGraph === 'function') updateGraph();
            }, 100);
        }
    });
    if (graphOverlay) resizeObserver.observe(graphOverlay);

    // スクロール時にポップアップ位置を更新
    const mapSection = document.getElementById('map-section');
    if (mapSection) mapSection.addEventListener('scroll', updatePopupPosition);
});

window.onload = () => {
    initData();
    renderTable();
    // ensure popup visibility if default is editor
    if (document.getElementById('nav-editor').classList.contains('active')) {
        document.body.classList.add('mode-editor');
        // Force select first cell to show popup
        setTimeout(() => {
            if (window.startSelection) window.startSelection(0, 0);
        }, 100);
    }
};

let isDragging = false;
let initialX, initialY;

// グローバルキーボードショートカット
document.addEventListener('keydown', function (e) {
    // input要素にフォーカスがある場合、一部のショートカットをスキップ
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT');

    // Ctrl+O: ファイルを開く
    if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        openFile();
    }
    // Ctrl+Shift+O: 基準ファイルを開く
    else if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        openBaseFile();
    }
    // Ctrl+S: 保存
    else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
    // Ctrl+Z: 元に戻す（input以外）
    else if (e.ctrlKey && e.key === 'z' && !isInputFocused) {
        e.preventDefault();
        undo();
    }
    // Ctrl+Y: やり直し（input以外）
    else if (e.ctrlKey && e.key === 'y' && !isInputFocused) {
        e.preventDefault();
        redo();
    }
    // Ctrl+W: ECUに書き込み
    else if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (ecuConnected) writeToECU();
    }
    // Ctrl+R: ECUから読み取り
    else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (ecuConnected) readFromECU();
    }
    // Ctrl+G: グラフ表示
    else if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        toggleGraph();
    }
});
