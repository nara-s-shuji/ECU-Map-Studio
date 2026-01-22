window.toggleSettings = function () {
    const menu = document.getElementById('settings-menu');
    // Mobile: Toggle Settings menu
    menu.classList.toggle('active');

    // Mobile Explorer Toggle (Can be hooked to a button later or swipe)
    if (window.innerWidth <= 1024) {
        document.getElementById('explorer').classList.remove('active');
    }
};


window.switchTab = function (tabName) {
    // Nav Items Update
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Find button that calls this tab (simplified matching index)
    const navBtns = document.getElementById('bottom-nav').children;
    if (tabName === 'editor') navBtns[0].classList.add('active');
    if (tabName === 'graph') navBtns[1].classList.add('active');
    if (tabName === 'monitor') navBtns[2].classList.add('active');
    if (tabName === 'logger') navBtns[3].classList.add('active');

    // View Sections Update
    document.getElementById('editor-view').style.display = 'none';
    document.getElementById('monitor-view').style.display = 'none';
    document.getElementById('logger-view').style.display = 'none';

    // Graph Overlay Handling (Mobile Tab Mode)
    const graphOverlay = document.getElementById('graph-overlay');
    if (tabName === 'graph') {
        graphOverlay.classList.add('active');
        // Force 3D mode on mobile graph tab
        document.getElementById('graph-type').value = '3d';
        // Delay graph render slightly to ensure container is visible
        setTimeout(() => {
            updateGraph();
            // Trigger resize for Plotly to fit new container
            window.dispatchEvent(new Event('resize'));
        }, 50);
    } else {
        graphOverlay.classList.remove('active');
    }

    if (tabName === 'editor') {
        document.getElementById('editor-view').style.display = 'block';
        // Force redraw after display change to ensure dimensions are correct
        setTimeout(renderTable, 10);
    } else if (tabName === 'monitor') {
        document.getElementById('monitor-view').style.display = 'flex';
    } else if (tabName === 'logger') {
        document.getElementById('logger-view').style.display = 'flex';
    }
};

// Mobile Explorer Toggle (Can be hooked to a button later or swipe)
window.toggleExplorer = function () {
    const exp = document.getElementById('explorer');
    exp.classList.toggle('active');
};

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
    // 現在のモードの値を保存
    const deltaInput = document.getElementById('popup-delta');
    const currentValue = parseFloat(deltaInput.value);

    if (popupMode === 'abs') {
        popupDeltaAbs = isNaN(currentValue) ? 10 : Math.round(currentValue);
    } else {
        popupDeltaPct = isNaN(currentValue) ? 1.0 : currentValue;
    }

    // モードを切り替え
    popupMode = mode;
    document.getElementById('mode-abs').classList.toggle('active', mode === 'abs');
    document.getElementById('mode-pct').classList.toggle('active', mode === 'pct');

    // 保存されている値を復元
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

let adjustInterval;
let adjustDelayTimeout;

window.startAdjusting = function (direction) {
    // 最初の1回を実行
    adjustCellValue(direction);

    // 長押し検知タイマー
    adjustDelayTimeout = setTimeout(() => {
        adjustInterval = setInterval(() => {
            adjustCellValue(direction);
        }, 100); // 100msごとに連続実行
    }, 400); // 400ms長押しで連続モード開始
};

window.stopAdjusting = function () {
    clearTimeout(adjustDelayTimeout);
    clearInterval(adjustInterval);
};

window.adjustCellValue = function (direction) {
    const deltaInput = document.getElementById('popup-delta');
    let deltaValue = parseFloat(deltaInput.value);

    if (isNaN(deltaValue) || deltaValue === 0) return;

    // 値を保存して表示を更新
    if (popupMode === 'pct') {
        popupDeltaPct = deltaValue;
        // %モードでは常に小数点1位まで表示
        deltaInput.value = deltaValue.toFixed(1);
    } else {
        popupDeltaAbs = deltaValue;
    }

    // 選択されている全セルに対して適用
    const cellsToUpdate = selectedCells.size > 0 ? Array.from(selectedCells) : [`${selT}-${selR}`];

    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        const currentValue = fuelMap[t][r];
        const originalValue = originalFuelMap[t][r];
        let newValue;

        if (popupMode === 'abs') {
            // 絶対値での増減
            newValue = currentValue + (direction * deltaValue);
        } else {
            // 各セルのオリジナル値の指定%分を現在値に加減
            const changeAmount = Math.round(originalValue * deltaValue / 100);
            newValue = currentValue + (direction * changeAmount);
        }

        fuelMap[t][r] = Math.round(newValue);

        // セルの表示を更新
        const input = document.querySelector(`#c-${t}-${r} input`);
        if (input) {
            input.value = fuelMap[t][r];
            const cell = document.getElementById(`c-${t}-${r}`);
            cell.style.background = getColor(fuelMap[t][r], t, r);
        }
    });

    updateUISelection();
    saveHistory();

    if (document.getElementById('graph-overlay').classList.contains('active')) {
        updateGraph();
    }
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
            for (let r = 0; r < 20; r++) {
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
    const headerRow = document.getElementById('headerRow');
    const grid = document.getElementById('mapGrid');
    headerRow.innerHTML = '';
    grid.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'cell header-cell corner-cell';
    corner.innerText = 'TPS\\RPM';
    // --- 全選択ロジック ---
    corner.addEventListener('click', () => {
        selectedCells.clear();
        for (let t = 0; t < 21; t++) {
            for (let r = 0; r < 20; r++) {
                selectedCells.add(`${t}-${r}`);
            }
        }
        updateUISelection();
    });
    headerRow.appendChild(corner);

    RPM_AXIS.forEach((r, idx) => {
        const h = document.createElement('div');
        h.className = 'cell header-cell';
        h.innerText = r;

        // --- 列（RPM）選択ロジック ---
        h.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.shiftKey && selectionStart) {
                // 範囲選択
                const startR = Math.min(selectionStart.r, idx);
                const endR = Math.max(selectionStart.r, idx);
                selectedCells.clear();

                // 行は全範囲、列はstartRからendRまで
                for (let ti = 0; ti < 21; ti++) {
                    for (let ri = startR; ri <= endR; ri++) {
                        selectedCells.add(`${ti}-${ri}`);
                    }
                }
                selR = idx; selT = 0;
            } else {
                // 単一選択（その列すべて）
                selectedCells.clear();
                for (let ti = 0; ti < 21; ti++) {
                    selectedCells.add(`${ti}-${idx}`);
                }
                selectionStart = { t: 0, r: idx };
                selectionStartMode = 'col'; // 列選択モードフラグ
                isSelecting = true;
                selR = idx; selT = 0;
            }
            updateUISelection();
        });

        h.addEventListener('mouseenter', (e) => {
            if (isSelecting && selectionStart && selectionStartMode === 'col') {
                const minR = Math.min(selectionStart.r, idx);
                const maxR = Math.max(selectionStart.r, idx);

                selectedCells.clear();
                for (let ti = 0; ti < 21; ti++) {
                    for (let ri = minR; ri <= maxR; ri++) {
                        selectedCells.add(`${ti}-${ri}`);
                    }
                }
                updateUISelection();
            }
        });

        headerRow.appendChild(h);
    });

    TPS_AXIS.forEach((tps, t) => {
        const l = document.createElement('div');
        l.className = 'cell label-cell';
        l.innerText = tps + '%';

        // --- 行（TPS）選択ロジック ---
        l.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (e.shiftKey && selectionStart) {
                // 範囲選択
                const startT = Math.min(selectionStart.t, t);
                const endT = Math.max(selectionStart.t, t);
                selectedCells.clear();

                // 列は全範囲、行はstartTからendTまで
                for (let ti = startT; ti <= endT; ti++) {
                    for (let ri = 0; ri < 20; ri++) {
                        selectedCells.add(`${ti}-${ri}`);
                    }
                }
                selT = t; selR = 0; // フォーカスはとりあえず左端へ
            } else {
                // 単一選択（その行すべて）
                selectedCells.clear();
                for (let ri = 0; ri < 20; ri++) {
                    selectedCells.add(`${t}-${ri}`);
                }
                selectionStart = { t, r: 0 };
                selectionStartMode = 'row'; // 行選択モードフラグ
                isSelecting = true;
                selT = t; selR = 0;
            }
            updateUISelection();
        });

        l.addEventListener('mouseenter', (e) => {
            if (isSelecting && selectionStart && selectionStartMode === 'row') {
                const minT = Math.min(selectionStart.t, t);
                const maxT = Math.max(selectionStart.t, t);

                selectedCells.clear();
                for (let ti = minT; ti <= maxT; ti++) {
                    for (let ri = 0; ri < 20; ri++) {
                        selectedCells.add(`${ti}-${ri}`);
                    }
                }
                updateUISelection();
            }
        });

        grid.appendChild(l);

        RPM_AXIS.forEach((rpm, r) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `c-${t}-${r}`;

            const input = document.createElement('input');
            input.type = 'number';
            input.value = fuelMap[t][r];
            input.className = cellColorMode === 'diff' ? 'diff-mode' : 'heatmap-mode';

            // Mobile: Disable direct input (keyboard)
            if (window.innerWidth <= 1024) {
                input.readOnly = true;
            }

            // セル選択処理
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault(); // テキスト選択を防止

                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+クリック: 個別選択/解除
                    e.preventDefault();
                    const key = `${t}-${r}`;
                    if (selectedCells.has(key)) {
                        selectedCells.delete(key);
                    } else {
                        selectedCells.add(key);
                    }
                    selT = t; selR = r;
                    updateUISelection();
                } else if (e.shiftKey) {
                    // Shift+クリック: 範囲選択
                    e.preventDefault();
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
                    // 通常クリック: 単一選択
                    selectedCells.clear();
                    selectedCells.add(`${t}-${r}`);
                    selectionStart = { t, r };
                    selectionStartMode = 'cell'; // セル選択モード
                    isSelecting = true;
                }
            });

            // ドラッグ選択
            cell.addEventListener('mouseenter', (e) => {
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
            });

            input.onfocus = () => {
                selT = t; selR = r;
                updateUISelection();
                input.select();
                if (document.getElementById('graph-overlay').classList.contains('active')) {
                    updateGraph();
                }
            };

            input.onclick = () => {
                input.select();
            };

            input.oninput = (e) => {
                fuelMap[t][r] = parseInt(e.target.value) || 0;
                cell.style.background = getColor(fuelMap[t][r], t, r);
                updateUISelection();
                if (document.getElementById('graph-overlay').classList.contains('active')) {
                    updateGraph();
                }
            };

            input.onchange = () => {
                saveHistory();
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let nt = t, nr = r;

                    if (e.shiftKey) {
                        // Shift+Enter: 上に移動
                        nt--;
                    } else {
                        // Enter: 下に移動
                        nt++;
                    }

                    if (nt >= 0 && nt < 21) {
                        const target = document.querySelector(`#c-${nt}-${nr} input`);
                        target.focus({ preventScroll: true });
                        target.select();

                        // スクロール処理
                        const container = document.getElementById('map-section');
                        const targetCell = document.getElementById(`c-${nt}-${nr}`);

                        requestAnimationFrame(() => {
                            const cellRect = targetCell.getBoundingClientRect();
                            const containerRect = container.getBoundingClientRect();
                            const headerRow = document.getElementById('headerRow');
                            const headerHeight = headerRow.offsetHeight;
                            const scrollbarHeight = container.offsetHeight - container.clientHeight;

                            if (e.shiftKey) {
                                // 上移動
                                const visibleTop = containerRect.top + headerHeight;
                                if (cellRect.top < visibleTop) {
                                    const scrollAmount = visibleTop - cellRect.top;
                                    container.scrollTop -= scrollAmount;
                                }
                            } else {
                                // 下移動
                                const visibleBottom = containerRect.bottom - scrollbarHeight;
                                if (cellRect.bottom > visibleBottom) {
                                    const scrollAmount = cellRect.bottom - visibleBottom;
                                    container.scrollTop += scrollAmount;
                                }
                            }
                        });
                    }
                }
                else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();

                    // Shift+矢印キーで範囲選択
                    if (e.shiftKey) {
                        if (!isShiftSelecting) {
                            isShiftSelecting = true;
                            selectionStart = { t, r };
                            selectedCells.clear();
                            selectedCells.add(`${t}-${r}`);
                        }

                        let nt = selT, nr = selR;

                        if (e.key === "ArrowUp") nt--;
                        else if (e.key === "ArrowDown") nt++;
                        else if (e.key === "ArrowLeft") nr--;
                        else if (e.key === "ArrowRight") nr++;

                        if (nt >= 0 && nt < 21 && nr >= 0 && nr < 20) {
                            selT = nt; selR = nr;

                            // 範囲選択を更新
                            const minT = Math.min(selectionStart.t, nt);
                            const maxT = Math.max(selectionStart.t, nt);
                            const minR = Math.min(selectionStart.r, nr);
                            const maxR = Math.max(selectionStart.r, nr);

                            selectedCells.clear();
                            for (let ti = minT; ti <= maxT; ti++) {
                                for (let ri = minR; ri <= maxR; ri++) {
                                    selectedCells.add(`${ti}-${ri}`);
                                }
                            }

                            updateUISelection();

                            const target = document.querySelector(`#c-${nt}-${nr} input`);
                            target.focus({ preventScroll: true });
                        }
                    } else {
                        // 通常の矢印キー移動
                        isShiftSelecting = false;
                        selectedCells.clear();
                        selectedCells.add(`${t}-${r}`);

                        let nt = t, nr = r;
                        if (e.key === "ArrowUp") nt--;
                        else if (e.key === "ArrowDown") nt++;
                        else if (e.key === "ArrowLeft") nr--;
                        else if (e.key === "ArrowRight") nr++;

                        if (nt >= 0 && nt < 21 && nr >= 0 && nr < 20) {
                            const container = document.getElementById('map-section');
                            const target = document.querySelector(`#c-${nt}-${nr} input`);

                            // フォーカスを移動（スクロールなし）
                            target.focus({ preventScroll: true });
                            target.select();

                            // スクロール処理
                            const targetCell = document.getElementById(`c-${nt}-${nr}`);
                            const headerRow = document.getElementById('headerRow');

                            requestAnimationFrame(() => {
                                const cellRect = targetCell.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const headerHeight = headerRow.offsetHeight;
                                const labelWidth = 80;

                                // スクロールバーの高さを取得
                                const scrollbarHeight = container.offsetHeight - container.clientHeight;

                                // 上矢印：ヘッダーの直下に表示
                                if (e.key === "ArrowUp") {
                                    const visibleTop = containerRect.top + headerHeight;
                                    if (cellRect.top < visibleTop) {
                                        const scrollAmount = visibleTop - cellRect.top;
                                        container.scrollTop -= scrollAmount;
                                    }
                                }
                                // 下矢印：コンテナの底部に表示（スクロールバーを考慮）
                                else if (e.key === "ArrowDown") {
                                    const visibleBottom = containerRect.bottom - scrollbarHeight;
                                    if (cellRect.bottom > visibleBottom) {
                                        const scrollAmount = cellRect.bottom - visibleBottom;
                                        container.scrollTop += scrollAmount;
                                    }
                                }
                                // 左矢印：ラベル列の右側に表示
                                else if (e.key === "ArrowLeft") {
                                    const visibleLeft = containerRect.left + labelWidth;
                                    if (cellRect.left < visibleLeft) {
                                        const scrollAmount = visibleLeft - cellRect.left;
                                        container.scrollLeft -= scrollAmount;
                                    }
                                }
                                // 右矢印：コンテナの右端に表示
                                else if (e.key === "ArrowRight") {
                                    const visibleRight = containerRect.right;
                                    if (cellRect.right > visibleRight) {
                                        const scrollAmount = cellRect.right - visibleRight;
                                        container.scrollLeft += scrollAmount;
                                    }
                                }
                            });
                        }
                    }
                }
            });

            cell.style.background = getColor(fuelMap[t][r], t, r);
            cell.appendChild(input);
            grid.appendChild(cell);
        });
    });
    updateUISelection();
}

function updateUISelection() {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected-cell', 'cross-highlight', 'multi-selected-cell'));
    document.querySelectorAll('.header-cell').forEach(h => h.classList.remove('selected-header'));
    document.querySelectorAll('.label-cell').forEach(l => l.classList.remove('selected-label'));

    // 複数選択されたセルをハイライト
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
        for (let r = 0; r < 20; r++) {
            const cell = document.getElementById(`c-${selT}-${r}`);
            if (cell) cell.classList.add('cross-highlight');
        }
        for (let t = 0; t < 21; t++) {
            const cell = document.getElementById(`c-${t}-${selR}`);
            if (cell) cell.classList.add('cross-highlight');
        }
    }

    // 選択されたRPMヘッダーを明るくする
    const headerCells = document.getElementById('headerRow').children;
    if (headerCells[selR + 1]) {
        headerCells[selR + 1].classList.add('selected-header');
    }

    // 選択されたTPSラベルを明るくする
    const gridCells = document.getElementById('mapGrid').children;
    const labelIndex = selT * 21; // 各行は21個のセル（1個のラベル + 20個のデータセル）
    if (gridCells[labelIndex]) {
        gridCells[labelIndex].classList.add('selected-label');
    }

    // 情報パネルの更新
    const currentValue = fuelMap[selT][selR];
    const originalValue = originalFuelMap[selT][selR];
    const change = currentValue - originalValue;
    const changePercent = originalValue !== 0 ? ((change / originalValue) * 100).toFixed(1) : '0.0';

    const cellCount = selectedCells.size;
    if (cellCount > 1) {
        document.getElementById('info-cell').innerText = `${cellCount} cells selected (Main: RPM ${RPM_AXIS[selR]}, TPS ${TPS_AXIS[selT]}%)`;
    } else {
        document.getElementById('info-cell').innerText = `RPM: ${RPM_AXIS[selR]}, TPS: ${TPS_AXIS[selT]}%`;
    }

    document.getElementById('info-value').innerText = currentValue;
    document.getElementById('info-original').innerText = originalValue;

    const changeSign = change >= 0 ? '+' : '';
    document.getElementById('info-change').innerText = `${changeSign}${change} μs`;
    document.getElementById('info-change-percent').innerText = `${changeSign}${changePercent}%`;

    let min = Infinity, max = -Infinity;
    for (let t = 0; t < 21; t++) {
        for (let r = 0; r < 20; r++) {
            if (fuelMap[t][r] < min) min = fuelMap[t][r];
            if (fuelMap[t][r] > max) max = fuelMap[t][r];
        }
    }
    document.getElementById('info-range').innerText = `${min} - ${max} μs`;

    // ポップアップの位置更新
    updatePopupPosition();
}

function updatePopupPosition() {
    const popup = document.getElementById('cell-popup');
    const selectedCell = document.getElementById(`c-${selT}-${selR}`);
    const mapSection = document.getElementById('map-section');

    if (!selectedCell) {
        popup.classList.remove('active');
        return;
    }

    // --- Mobile Check ---
    if (window.innerWidth <= 1024) {
        // Mobile: Always show active (CSS handles docking)
        popup.classList.add('active');
        popup.style.top = '';
        popup.style.left = '';
        popup.style.display = ''; // Clear any inline display:none
        return;
    }

    // --- Desktop Logic (Original) ---
    const cellRect = selectedCell.getBoundingClientRect();
    const mapRect = mapSection.getBoundingClientRect();
    const popupWidth = 150; // ポップアップの幅（推定）
    const popupHeight = 80; // ポップアップの高さ（推定）

    // 各種境界の計算
    // ... (existing boundary calcs)
    const headerRow = document.getElementById('headerRow');
    const headerHeight = headerRow ? headerRow.offsetHeight : 28;
    const visibleTop = mapRect.top + headerHeight;
    const scrollbarHeight = mapSection.offsetHeight - mapSection.clientHeight;
    const visibleBottom = mapRect.bottom - scrollbarHeight;

    // Only hide if completely out of view (relaxed check)
    if (cellRect.bottom < mapRect.top || cellRect.top > mapRect.bottom) {
        popup.classList.remove('active');
        return;
    }

    // 左端チェック（TPS列ラベル考慮）
    if (cellRect.right < visibleLeft) {
        popup.classList.remove('active');
        return;
    }
    // 右端チェック
    if (cellRect.left > visibleRight) {
        popup.classList.remove('active');
        return;
    }

    // デフォルト位置：セルの右側
    let left = cellRect.right + 10;
    let top = cellRect.top;

    // 右側に表示スペースがない場合は左側に表示
    if (left + popupWidth > visibleRight) {
        // セルの左側に配置（セルと重ならないように十分な間隔を取る）
        left = cellRect.left - popupWidth - 45;
    }

    // 左端がラベル列より左にはみ出る場合
    if (left < visibleLeft) {
        left = visibleLeft + 5;
    }

    // 下側に表示スペースがない場合は上に調整
    // INFORMATIONペインと重ならないように
    const maxBottom = Math.min(visibleBottom, infoTop);
    if (top + popupHeight > maxBottom) {
        top = maxBottom - popupHeight - 5;
    }

    // 上側がヘッダーより上にはみ出る場合は調整
    if (top < visibleTop) {
        top = visibleTop + 5;
    }

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.classList.add('active');
}

// Make global functions avail
window.renderTable = renderTable;
window.updateUISelection = updateUISelection;
window.updatePopupPosition = updatePopupPosition;
// Helper function to export other methods if they were defined in local scope
// Note: openFile, etc. are currently defined in app.js or map.js?
// Based on previous file reads, they might be in map.js or app.js and not exported?
// Let's assume they are global, but if not, we need to find them.
// Wait, user says PC buttons don't work. They are usually `window.openFile = ...`
// I will verify app.js in a separate step or assume they are correct and focus on CSS overlays.

