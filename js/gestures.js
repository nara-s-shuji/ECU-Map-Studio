import { state } from './state.js';

export function updateViewportLayout() {
    if (!window.visualViewport) return;

    const viewport = window.visualViewport;
    const scale = 1 / viewport.scale;
    const offsetLeft = viewport.offsetLeft;
    const offsetTop = viewport.offsetTop;

    const bottomNav = document.getElementById('bottom-nav');
    const popup = document.getElementById('edit-popup-v2');

    if (Math.abs(viewport.scale - 1.0) < 0.01) {
        if (bottomNav) {
            bottomNav.style.transform = '';
            bottomNav.style.width = '';
            bottomNav.style.left = '';
            bottomNav.style.bottom = '';
        }
        if (popup) {
            popup.style.transform = 'translateX(-50%)';
            popup.style.width = '';
        }
        return;
    }

    if (bottomNav) {
        const layoutHeight = document.documentElement.clientHeight;
        const visualBottom = offsetTop + viewport.height;
        const distFromBottom = layoutHeight - visualBottom;

        bottomNav.style.transformOrigin = 'bottom left';
        bottomNav.style.transform = `translate(${offsetLeft}px, -${distFromBottom}px) scale(${scale})`;
        bottomNav.style.width = `${viewport.width * viewport.scale}px`;
        bottomNav.style.width = `100%`;
    }

    if (popup && popup.style.display !== 'none') {
        const layoutHeight = document.documentElement.clientHeight;
        const visualBottom = offsetTop + viewport.height;
        const distFromBottom = layoutHeight - visualBottom;

        popup.style.transformOrigin = 'bottom center';
        const visualCenter = offsetLeft + (viewport.width / 2);
        const layoutCenter = document.documentElement.clientWidth / 2;
        const offsetX = visualCenter - layoutCenter;

        popup.style.transform = `translateX(-50%) translate(${offsetX}px, -${distFromBottom}px) scale(${scale})`;
    }
}

export function initPinchZoom() {
    const editorView = document.getElementById('editor-view');
    const tableWrapper = document.getElementById('table-wrapper');

    if (editorView && tableWrapper) {
        let initialDistance = 0;
        let currentZoom = 1.0;
        const minZoom = 0.5;
        const maxZoom = 3.0;

        editorView.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);
                const currentStyle = window.getComputedStyle(tableWrapper).zoom;
                currentZoom = parseFloat(currentStyle) || 1.0;
            }
        }, { passive: true });

        editorView.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY);

                if (initialDistance > 0) {
                    const diff = currentDistance - initialDistance;
                    const sensitivity = 0.005;
                    let newZoom = currentZoom + (diff * sensitivity);
                    newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
                    tableWrapper.style.zoom = newZoom;
                }
            }
        }, { passive: false });
    }
}

// Global initialization
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportLayout);
    window.visualViewport.addEventListener('scroll', updateViewportLayout);
}
