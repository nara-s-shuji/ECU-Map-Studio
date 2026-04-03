import { state, RPM_AXIS, TPS_AXIS } from './state.js';

// Global references for absolute reliability
window.drawerTimeout = null;

/**
 * Force-closes the info drawer.
 * Attached to window.closeDrawer for access by other modules without circular imports.
 */
export function closeDrawer() {
    const drawer = document.getElementById('file-info-drawer');
    if (drawer) {
        drawer.classList.remove('open');
        console.log("Drawer HARD CLOSED (v2026.35)");
    }
    if (window.drawerTimeout) {
        clearTimeout(window.drawerTimeout);
        window.drawerTimeout = null;
    }
}
window.closeDrawer = closeDrawer;

export function openDrawer() {
    const drawer = document.getElementById('file-info-drawer');
    if (!drawer) return;
    
    drawer.classList.add('open');
    console.log("Drawer HARD OPENED (v2026.35)");

    const elName = document.getElementById('drawer-filename');
    if (elName) elName.innerText = state.currentFileName || 'Unnamed_Map.csv';
    
    // Auto-close after 5 seconds
    if (window.drawerTimeout) clearTimeout(window.drawerTimeout);
    window.drawerTimeout = setTimeout(() => {
        closeDrawer();
    }, 5000);
}
window.openDrawer = openDrawer;

export function initInfoBarDrag() {
    const bar = document.getElementById('mobile-info-bar');
    const drawer = document.getElementById('file-info-drawer');
    if (!bar || !drawer) return;

    let startY = 0;
    let isDragging = false;

    // Slide logic on the info bar
    bar.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    bar.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const deltaY = e.changedTouches[0].clientY - startY;
        if (deltaY > 40) openDrawer();
        else if (deltaY < -20) closeDrawer();
    }, { passive: true });

    // Global "Touch Anywhere to Close" (Capture Phase)
    // This catches touches BEFORE they reach other elements that might call preventDefault()
    window.addEventListener('touchstart', (e) => {
        const drawerEl = document.getElementById('file-info-drawer');
        if (drawerEl && drawerEl.classList.contains('open')) {
            const barEl = document.getElementById('mobile-info-bar');
            const isClickInside = (barEl && barEl.contains(e.target)) || drawerEl.contains(e.target);
            if (!isClickInside) {
                closeDrawer();
            }
        }
    }, true); 

    // Manual slide up on drawer itself to close
    drawer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });

    drawer.addEventListener('touchend', (e) => {
        if (startY - e.changedTouches[0].clientY > 30) closeDrawer();
    }, { passive: true });
}

export function toggleSettings(forceState) {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('settings-overlay');
    const navBtn = document.getElementById('nav-menu');
    if (!menu) return;

    let isActive = menu.classList.contains('active');
    let targetState = (typeof forceState !== 'undefined') ? forceState : !isActive;

    if (targetState) {
        menu.classList.add('active');
        if (overlay) overlay.classList.add('active');
        if (navBtn) navBtn.classList.add('active');
    } else {
        menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (navBtn) navBtn.classList.remove('active');
    }
}
window.toggleSettings = toggleSettings;

export function toggleExplorer() {
    const exp = document.getElementById('explorer');
    if (exp) exp.classList.toggle('active');
}
window.toggleExplorer = toggleExplorer;

export function switchTab(tabId) {
    state.currentTabId = tabId;

    document.querySelectorAll('.view-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    document.body.classList.remove('overlay-active');

    let targetId = tabId;
    if (!document.getElementById(targetId)) {
        if (document.getElementById(tabId + '-view')) {
            targetId = tabId + '-view';
        }
    }

    const target = document.getElementById(targetId);
    if (target) {
        const isFlex = (targetId === 'file-view' || targetId === 'monitor-view');
        target.style.display = isFlex ? 'flex' : 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    const graphOverlay = document.getElementById('graph-overlay');
    if (tabId === 'graph') {
        if (graphOverlay) {
            graphOverlay.classList.add('active');
            const typeSel = document.getElementById('graph-type');
            if (typeSel && !typeSel.value) typeSel.value = '3d';

            setTimeout(() => {
                if (window.updateGraph) window.updateGraph();
                window.dispatchEvent(new Event('resize'));
            }, 50);
        }
    } else {
        if (graphOverlay) graphOverlay.classList.remove('active');
    }

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const navBtn = document.getElementById('nav-' + tabId);
    if (navBtn) navBtn.classList.add('active');

    const popup = document.getElementById('edit-popup-v2');
    if (popup) {
        if (tabId === 'editor') {
            if (window.updatePopupPosition && state.selectedCells.size > 0) {
                setTimeout(() => {
                    window.updatePopupPosition();
                }, 50);
            }
        } else {
            popup.style.display = 'none';
            popup.classList.remove('active');
        }
    }

    toggleSettings(false);
    
    // Update main info display
    const labelFileName = document.getElementById('info-filename');
    if (labelFileName) labelFileName.innerText = state.currentFileName || 'Unnamed';
}
window.switchTab = switchTab;

export function selectMapSlot(type, index) {
    if (type === 'fuel') state.currentFuelMapIndex = index;
    if (type === 'ign') state.currentIgnMapIndex = index;
    // ...
}
window.selectMapSlot = selectMapSlot;

export function selectPriorityMap(index) {
    state.currentPriorityMap = index;
    updatePriorityMapUI();
}
window.selectPriorityMap = selectPriorityMap;

export function selectNextMap(index) {
    state.currentNextMap = index;
    updateNextMapUI();
}
window.selectNextMap = selectNextMap;

export function updatePriorityMapUI() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-prio-${i}`);
        if (btn) btn.classList.toggle('active', i === state.currentPriorityMap);
    }
}

export function updateNextMapUI() {
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-next-${i}`);
        if (btn) btn.classList.toggle('active', i === state.currentNextMap);
    }
}

export function updateCellColorMode() {
    const el = document.getElementById('cell-color-mode');
    if (el) state.cellColorMode = el.value;
    // renderTable is usually called via events
}
window.updateCellColorMode = updateCellColorMode;
