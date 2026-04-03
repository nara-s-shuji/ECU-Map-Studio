import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { updateUISelection } from './selection.js';
import { getColor } from './utils.js';
import { saveHistory } from './data.js';

let applyInterval, applyTimeout;
let spinnerInterval, spinnerTimeout;
let lastTouchTime = 0;

export function updatePopupPosition() {
    const popup = document.getElementById('edit-popup-v2');
    if (!popup) return;

    if (state.currentTabId !== 'editor') {
        popup.classList.remove('active');
        popup.style.display = 'none';
        return;
    }

    const graphOverlay = document.getElementById('graph-overlay');
    const settingsMenu = document.getElementById('settings-menu');

    if ((graphOverlay && graphOverlay.classList.contains('active')) ||
        (settingsMenu && settingsMenu.classList.contains('active'))) {
        popup.classList.remove('active');
        popup.style.display = 'none';
        return;
    }

    const selectedCell = document.getElementById(`c-${state.selT}-${state.selR}`);
    if (!selectedCell) {
        popup.classList.remove('active');
        popup.style.display = 'none';
        return;
    }

    popup.classList.add('active');
    popup.style.display = 'flex';

    if (window.innerWidth <= 1024) {
        popup.style.top = '';
        popup.style.left = '50%';
        return;
    }

    const mapSection = document.getElementById('map-section');
    const cellRect = selectedCell.getBoundingClientRect();
    const mapRect = mapSection.getBoundingClientRect();

    const popupWidth = 150;
    const headerRow = document.getElementById('headerRow');
    const headerHeight = headerRow ? headerRow.offsetHeight : 28;
    const visibleTop = mapRect.top + headerHeight;
    const visibleRight = mapRect.right;
    const visibleLeft = mapRect.left + 80;

    if (cellRect.bottom < mapRect.top || cellRect.top > mapRect.bottom) {
        popup.classList.remove('active');
        popup.style.display = 'none';
        return;
    }

    let left = cellRect.right + 10;
    let top = cellRect.top;

    if (left + popupWidth > visibleRight) {
        left = cellRect.left - popupWidth - 45;
    }
    if (left < visibleLeft) {
        left = visibleLeft + 5;
    }

    if (top < visibleTop) {
        top = visibleTop + 5;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

export function switchPopupMode(mode) {
    const deltaInput = document.getElementById('popup-delta');
    if (!deltaInput) return;
    const currentValue = parseFloat(deltaInput.value);

    if (state.popupMode === 'abs') {
        state.popupDeltaAbs = isNaN(currentValue) ? 10 : Math.round(currentValue);
    } else {
        state.popupDeltaPct = isNaN(currentValue) ? 1.0 : currentValue;
    }

    state.popupMode = mode;
    const toggleBtn = document.getElementById('btn-mode-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = (mode === 'abs') ? 'ABS' : '%';
        toggleBtn.style.color = (mode === 'abs') ? 'var(--accent)' : '#ff9900';
    }

    if (mode === 'abs') {
        deltaInput.value = Math.round(state.popupDeltaAbs);
        deltaInput.step = '1';
        deltaInput.min = '1';
    } else {
        deltaInput.value = state.popupDeltaPct.toFixed(1);
        deltaInput.step = '0.1';
        deltaInput.min = '0.1';
    }
}

export function adjustDelta(direction) {
    const input = document.getElementById('popup-delta');
    if (!input) return;
    let current = parseFloat(input.value);

    if (isNaN(current)) current = (state.popupMode === 'abs') ? 10 : 1.0;

    let multiplier = 1;
    if (spinnerTicks > 50) multiplier = 100;
    else if (spinnerTicks > 25) multiplier = 10;
    else if (spinnerTicks > 10) multiplier = 5;

    if (state.popupMode === 'abs') {
        const step = 1 * multiplier;
        current = direction > 0 ? current + step : Math.max(1, current - step);
        current = Math.min(1000, current);
        state.popupDeltaAbs = current;
        input.value = current;
    } else {
        const step = 0.1 * multiplier;
        current = parseFloat((current + (direction * step)).toFixed(1));
        current = Math.max(0.1, Math.min(50, current));
        state.popupDeltaPct = current;
        input.value = current.toFixed(1);
    }
}

export function adjustCellValue(direction) {
    const deltaInput = document.getElementById('popup-delta');
    if (!deltaInput) return;
    let deltaValue = parseFloat(deltaInput.value);

    if (isNaN(deltaValue) || deltaValue <= 0) {
        deltaValue = (state.popupMode === 'abs') ? 10 : 1.0;
    }

    if (state.popupMode === 'pct') state.popupDeltaPct = deltaValue;
    else state.popupDeltaAbs = deltaValue;

    const cellsToUpdate = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [`${state.selT}-${state.selR}`];

    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        if (!state.fuelMap[t] || typeof state.fuelMap[t][r] === 'undefined') return;

        const currentValue = state.fuelMap[t][r];
        const originalValue = state.originalFuelMap[t][r];
        let newValue;

        if (state.popupMode === 'abs') {
            newValue = currentValue + (direction * deltaValue);
        } else {
            const changeAmount = Math.round(originalValue * deltaValue / 100);
            newValue = currentValue + (direction * changeAmount);
        }

        state.fuelMap[t][r] = Math.max(0, Math.round(newValue));

        const input = document.querySelector(`#c-${t}-${r} input`);
        if (input) {
            input.value = state.fuelMap[t][r];
            const cell = document.getElementById(`c-${t}-${r}`);
            if (cell) cell.style.background = getColor(state.fuelMap[t][r], t, r);
        }
    });

    updateUISelection();
    saveHistory();

    if (window.updateGraph) window.updateGraph();
}

function handleTouchDebounce(e) {
    if (e.type === 'touchstart') {
        lastTouchTime = Date.now();
        return true;
    }
    if (e.type === 'mousedown' && Date.now() - lastTouchTime < 1000) {
        e.preventDefault();
        return false;
    }
    return true;
}

export function startApply(direction, e) {
    if (e && e.type === 'touchstart') e.preventDefault();
    if (e && !handleTouchDebounce(e)) return;

    adjustCellValue(direction);
    clearTimeout(applyTimeout); clearInterval(applyInterval);
    applyTimeout = setTimeout(() => {
        applyInterval = setInterval(() => adjustCellValue(direction), 100);
    }, 500);
}

export function stopApply() {
    clearTimeout(applyTimeout);
    clearInterval(applyInterval);
}

export function startSpinner(direction, e) {
    if (e && !handleTouchDebounce(e)) return;
    adjustDelta(direction);
    clearTimeout(spinnerTimeout); clearInterval(spinnerInterval);
    spinnerTimeout = setTimeout(() => {
        spinnerInterval = setInterval(() => adjustDelta(direction), 100);
    }, 500);
}

export function stopSpinner() {
    clearTimeout(spinnerTimeout);
    clearInterval(spinnerInterval);
}

export function resetToOriginal() {
    const cellsToUpdate = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [`${state.selT}-${state.selR}`];
    cellsToUpdate.forEach(key => {
        const [t, r] = key.split('-').map(Number);
        if (state.originalFuelMap[t] && typeof state.originalFuelMap[t][r] !== 'undefined') {
            state.fuelMap[t][r] = state.originalFuelMap[t][r];
            const cell = document.getElementById(`c-${t}-${r}`);
            if (cell) cell.style.background = getColor(state.fuelMap[t][r], t, r);
            const input = cell ? cell.querySelector('input') : null;
            if (input) input.value = state.fuelMap[t][r];
        }
    });
    updateUISelection();
    saveHistory();
    if (window.updateGraph) window.updateGraph();
}

export function togglePopupMode() {
    switchPopupMode(state.popupMode === 'abs' ? 'pct' : 'abs');
}

// Global exposure for backwards compatibility if needed
window.updatePopupPosition = updatePopupPosition;
window.startApply = startApply;
window.stopApply = stopApply;
window.startSpinner = startSpinner;
window.stopSpinner = stopSpinner;
window.switchPopupMode = switchPopupMode;
window.togglePopupMode = togglePopupMode;
window.adjustDelta = adjustDelta;
window.adjustCellValue = adjustCellValue;
window.resetToOriginal = resetToOriginal;
