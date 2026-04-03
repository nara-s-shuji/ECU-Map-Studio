import { state, RPM_AXIS, TPS_AXIS } from './state.js';

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

export function toggleExplorer() {
    const exp = document.getElementById('explorer');
    if (exp) exp.classList.toggle('active');
}

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

    const infoFileName = document.getElementById('info-filename');
    if (infoFileName) infoFileName.innerText = state.currentFileName + ' (modular)';
    
    const valDisplay = document.getElementById('info-values');
    if (valDisplay) valDisplay.innerText = `Orig: - / Curr: -`;
}

export function initInfoBarDrag() {
    const bar = document.getElementById('mobile-info-bar');
    const drawer = document.getElementById('file-info-drawer');
    if (!bar || !drawer) return;

    let startY = 0;
    let isDragging = false;

    bar.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    bar.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const endY = e.changedTouches[0].clientY;
        const deltaY = endY - startY;

        if (deltaY > 50) {
            drawer.style.height = '140px';
            const elName = document.getElementById('drawer-filename');
            if (elName) elName.innerText = state.currentFileName;
        } else if (deltaY < -20) {
            drawer.style.height = '0';
        }
    });

    drawer.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });

    drawer.addEventListener('touchend', (e) => {
        const endY = e.changedTouches[0].clientY;
        if (startY - endY > 30) {
            drawer.style.height = '0';
        }
    });
}
