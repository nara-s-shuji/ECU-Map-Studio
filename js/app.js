// 2000 to 15000, step 500 -> 27 columns
window.RPM_AXIS = Array.from({ length: 27 }, (_, i) => 2000 + (i * 500));
window.TPS_AXIS = Array.from({ length: 21 }, (_, i) => i * 5);
window.fuelMap = [];
window.originalFuelMap = [];
window.selT = 0;
window.selR = 0;
window.cellColorMode = 'diff';

// 複数セル選択
window.selectedCells = new Set(); // "t-r"形式で保存
window.selectionStart = null; // {t, r}
window.selectionStartMode = null; // 'cell', 'row', 'col'
window.isSelecting = false;
window.isShiftSelecting = false; // Shift+矢印キーでの範囲選択

// 履歴管理
window.historyStack = [];
window.historyIndex = -1;
const MAX_HISTORY = 50; // Const is fine

// ポップアップモード
window.popupMode = 'abs'; // 'abs' or 'pct'
window.popupDeltaAbs = 10; // 絶対値モードの値を保存
window.popupDeltaPct = 1.0; // %モードの値を保存

// ECU接続状態
window.ecuConnected = false;

// Toggle Settings Menu
function toggleSettings() {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('menu-overlay');
    const navBtn = document.getElementById('nav-menu'); // Bottom nav button

    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        if (navBtn) navBtn.classList.remove('active');
    } else {
        menu.classList.add('active');
        overlay.classList.add('active');
        if (navBtn) navBtn.classList.add('active');
    }
}

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
