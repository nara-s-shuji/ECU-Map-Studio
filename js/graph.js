import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { updatePopupPosition } from './popup.js';

let graphResizeInitialized = false;

export function toggleGraph() {
    try {
        const overlay = document.getElementById('graph-overlay');
        const btn = document.getElementById('btn-graph');
        if (!overlay || !btn) return;

        overlay.classList.toggle('active');
        const isActive = overlay.classList.contains('active');
        document.body.classList.toggle('overlay-active', isActive);
        btn.classList.toggle('active');

        const navBtn = document.getElementById('nav-graph');
        if (navBtn) navBtn.classList.toggle('active', isActive);

        updatePopupPosition();

        if (isActive) {
            updateGraph();
            setTimeout(() => initGraphResizeHandles(), 100);
        }
    } catch (e) {
        console.error('Graph Toggle Error:', e);
    }
}

export function updateGraph() {
    const overlay = document.getElementById('graph-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    const typeEl = document.getElementById('graph-type');
    const mode = typeEl ? typeEl.value : '3d';
    
    let traces = [];
    const layout = {
        paper_bgcolor: '#1e1e1e', plot_bgcolor: '#1e1e1e',
        margin: { t: 20, l: 50, r: 20, b: 50 },
        font: { color: '#888', size: 10 },
        xaxis: { gridcolor: '#333', zeroline: false },
        yaxis: { gridcolor: '#333', zeroline: false }
    };

    if (mode === '3d') {
        traces = [{
            z: state.fuelMap, x: RPM_AXIS, y: TPS_AXIS, type: 'surface',
            colorscale: [[0, 'blue'], [0.5, 'green'], [1, 'red']], showscale: false
        }];
        layout.scene = {
            xaxis: { title: 'RPM' },
            yaxis: { title: 'TPS' },
            zaxis: { title: 'Fuel' },
            camera: { eye: { x: 1.3, y: 1.3, z: 1.5 } }
        };
        layout.margin = { t: 5, l: 5, r: 5, b: 15 };
    } else if (mode === 'tps') {
        traces = [{
            x: TPS_AXIS, y: state.fuelMap.map(row => row[state.selR]),
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#0078d4', shape: 'linear' }
        }];
        layout.xaxis.title = "TPS (%)";
        layout.yaxis.title = "Fuel (μs)";
    } else {
        traces = [{
            x: RPM_AXIS, y: state.fuelMap[state.selT],
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#0078d4', shape: 'linear' }
        }];
        layout.xaxis.title = "RPM";
        layout.yaxis.title = "Fuel (μs)";
    }

    if (window.Plotly) {
        Plotly.newPlot('chart-container', traces, layout, { responsive: true, displayModeBar: false, scrollZoom: true });
    }
}

let isResizing = false;
let resizeDirection = '';
let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight, resizeStartLeft, resizeStartTop;

function initGraphResizeHandles() {
    if (graphResizeInitialized) return;
    const graphOverlay = document.getElementById('graph-overlay');
    if (!graphOverlay) return;

    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    handles.forEach(dir => {
        const handle = graphOverlay.querySelector(`.resize-${dir}`);
        if (handle) {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                resizeDirection = dir;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                resizeStartWidth = graphOverlay.offsetWidth;
                resizeStartHeight = graphOverlay.offsetHeight;
                resizeStartLeft = graphOverlay.offsetLeft;
                resizeStartTop = graphOverlay.offsetTop;

                const onMouseMove = (e) => {
                    if (!isResizing) return;
                    const deltaX = e.clientX - resizeStartX;
                    const deltaY = e.clientY - resizeStartY;

                    let newWidth = resizeStartWidth;
                    let newHeight = resizeStartHeight;
                    let newLeft = resizeStartLeft;
                    let newTop = resizeStartTop;

                    if (resizeDirection.includes('e')) newWidth = Math.max(300, resizeStartWidth + deltaX);
                    if (resizeDirection.includes('w')) {
                        const potWidth = resizeStartWidth - deltaX;
                        if (potWidth >= 300) { newWidth = potWidth; newLeft = resizeStartLeft + deltaX; }
                    }
                    if (resizeDirection.includes('s')) newHeight = Math.max(200, resizeStartHeight + deltaY);
                    if (resizeDirection.includes('n')) {
                        const potHeight = resizeStartHeight - deltaY;
                        if (potHeight >= 200) { newHeight = potHeight; newTop = resizeStartTop + deltaY; }
                    }

                    graphOverlay.style.width = newWidth + 'px';
                    graphOverlay.style.height = newHeight + 'px';
                    graphOverlay.style.left = newLeft + 'px';
                    graphOverlay.style.top = newTop + 'px';
                    graphOverlay.style.right = 'auto';
                    graphOverlay.style.bottom = 'auto';
                    updateGraph();
                };

                const onMouseUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    });
    graphResizeInitialized = true;
}

// Global exposure
window.toggleGraph = toggleGraph;
window.updateGraph = updateGraph;
