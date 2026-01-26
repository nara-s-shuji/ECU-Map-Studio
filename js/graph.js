window.toggleGraph = function () {
    const overlay = document.getElementById('graph-overlay');
    const btn = document.getElementById('btn-graph');
    overlay.classList.toggle('active');
    btn.classList.toggle('active');
    // Mobile Nav Update
    const navBtn = document.getElementById('nav-graph');
    if (navBtn) navBtn.classList.toggle('active', overlay.classList.contains('active'));

    if (overlay.classList.contains('active')) {
        updateGraph();
        // グラフ表示時にリサイズハンドルを初期化
        setTimeout(() => {
            initGraphResizeHandles();
        }, 100);
    }
};

window.updateGraph = function () {
    const overlay = document.getElementById('graph-overlay');
    if (!overlay.classList.contains('active')) return;

    const mode = document.getElementById('graph-type').value;
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
            z: fuelMap, x: RPM_AXIS, y: TPS_AXIS, type: 'surface',
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
            x: TPS_AXIS, y: fuelMap.map(row => row[selR]),
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#0078d4', shape: 'linear' }
        }];
        layout.xaxis.title = "TPS (%)";
        layout.yaxis.title = "Fuel (μs)";
    } else {
        traces = [{
            x: RPM_AXIS, y: fuelMap[selT],
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#0078d4', shape: 'linear' }
        }];
        layout.xaxis.title = "RPM";
        layout.yaxis.title = "Fuel (μs)";
    }

    Plotly.newPlot('chart-container', traces, layout, { responsive: true, displayModeBar: false });
}

let graphResizeInitialized = false;

function initGraphResizeHandles() {
    if (graphResizeInitialized) return;

    const graphOverlay = document.getElementById('graph-overlay');

    // リサイズハンドル
    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    handles.forEach(dir => {
        const handle = graphOverlay.querySelector(`.resize-${dir}`);
        if (handle) {
            handle.onmousedown = function (e) {
                e.preventDefault();

                isResizing = true;
                resizeDirection = dir;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                const overlay = document.getElementById('graph-overlay');
                resizeStartWidth = overlay.offsetWidth;
                resizeStartHeight = overlay.offsetHeight;
                resizeStartLeft = overlay.offsetLeft;
                resizeStartTop = overlay.offsetTop;

                // ドキュメント全体でmousemoveとmouseupを監視
                const onMouseMove = function (e) {
                    if (!isResizing) return;
                    e.preventDefault();

                    const deltaX = e.clientX - resizeStartX;
                    const deltaY = e.clientY - resizeStartY;
                    const overlay = document.getElementById('graph-overlay');

                    let newWidth = resizeStartWidth;
                    let newHeight = resizeStartHeight;
                    let newLeft = resizeStartLeft;
                    let newTop = resizeStartTop;

                    if (resizeDirection.includes('e')) {
                        newWidth = Math.max(300, resizeStartWidth + deltaX);
                    }
                    if (resizeDirection.includes('w')) {
                        const potentialWidth = resizeStartWidth - deltaX;
                        if (potentialWidth >= 300) {
                            newWidth = potentialWidth;
                            newLeft = resizeStartLeft + deltaX;
                        }
                    }
                    if (resizeDirection.includes('s')) {
                        newHeight = Math.max(200, resizeStartHeight + deltaY);
                    }
                    if (resizeDirection.includes('n')) {
                        const potentialHeight = resizeStartHeight - deltaY;
                        if (potentialHeight >= 200) {
                            newHeight = potentialHeight;
                            newTop = resizeStartTop + deltaY;
                        }
                    }

                    overlay.style.width = newWidth + 'px';
                    overlay.style.height = newHeight + 'px';
                    overlay.style.left = newLeft + 'px';
                    overlay.style.top = newTop + 'px';
                    overlay.style.right = 'auto';
                    overlay.style.bottom = 'auto';

                    updateGraph();
                };

                const onMouseUp = function (e) {
                    isResizing = false;
                    resizeDirection = '';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
        }
    });

    graphResizeInitialized = true;
}
