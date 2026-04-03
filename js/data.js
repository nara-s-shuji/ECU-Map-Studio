import { state, RPM_AXIS, TPS_AXIS } from './state.js';
import { renderTable } from './editor.js';
import { updateUISelection } from './selection.js';

export function initData() {
    state.fuelMap = [];
    state.originalFuelMap = [];
    for (let t = 0; t < 21; t++) {
        state.fuelMap[t] = [];
        state.originalFuelMap[t] = [];
        for (let r = 0; r < RPM_AXIS.length; r++) {
            const val = Math.floor(1000 + 800 * Math.sin(r / 5) * Math.cos(t / 10) + t * 20);
            state.fuelMap[t][r] = val;
            state.originalFuelMap[t][r] = val;
        }
    }
    saveHistory();
    if (window.updateFileInfo) window.updateFileInfo();
}

export function saveHistory() {
    state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);
    state.historyStack.push(JSON.parse(JSON.stringify(state.fuelMap)));

    if (state.historyStack.length > state.MAX_HISTORY) {
        state.historyStack.shift();
    } else {
        state.historyIndex++;
    }
}

export function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.fuelMap = JSON.parse(JSON.stringify(state.historyStack[state.historyIndex]));
        renderTable();
        if (window.updateGraph) window.updateGraph();
    }
}

export function redo() {
    if (state.historyIndex < state.historyStack.length - 1) {
        state.historyIndex++;
        state.fuelMap = JSON.parse(JSON.stringify(state.historyStack[state.historyIndex]));
        renderTable();
        if (window.updateGraph) window.updateGraph();
    }
}

export function importFromCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        lines.shift(); // Remove header
        lines.forEach((line, t) => {
            const values = line.split(',');
            values.shift(); // Remove TPS label
            if (t < 21) {
                values.forEach((val, r) => {
                    if (r < RPM_AXIS.length) state.fuelMap[t][r] = parseInt(val) || 0;
                });
            }
        });
        state.originalFuelMap = state.fuelMap.map(row => row.slice());
        state.currentFileName = file.name;
        
        saveHistory();
        renderTable();
        if (window.updateGraph) window.updateGraph();
    };
    reader.readAsText(file);
}

export function importBaseFromCSV(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        lines.shift(); // Remove header
        lines.forEach((line, t) => {
            const values = line.split(',');
            values.shift(); // Remove TPS label
            if (t < 21) {
                values.forEach((val, r) => {
                    if (r < RPM_AXIS.length) state.originalFuelMap[t][r] = parseInt(val) || 0;
                });
            }
        });
        renderTable();
        updateUISelection();
    };
    reader.readAsText(file);
}

export function saveFileToCSV(fileName) {
    let csv = "TPS\\RPM," + RPM_AXIS.join(",") + "\n";
    state.fuelMap.forEach((row, i) => {
        csv += TPS_AXIS[i] + "," + row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.csv') ? fileName : fileName + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
