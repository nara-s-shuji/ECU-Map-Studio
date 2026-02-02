// NEW: Filename State
var currentFileName = "New_Map.csv";

function initData() {
    for (let t = 0; t < 21; t++) {
        fuelMap[t] = [];
        originalFuelMap[t] = [];
        for (let r = 0; r < window.RPM_AXIS.length; r++) {
            const val = Math.floor(1000 + 800 * Math.sin(r / 5) * Math.cos(t / 10) + t * 20);
            fuelMap[t][r] = val;
            originalFuelMap[t][r] = val;
        }
    }
    saveHistory();
    if (typeof updateFileInfo === 'function') updateFileInfo();
}

window.openFile = function () {
    console.log('openFile called');
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('file-input not found');
    }
};

window.openBaseFile = function () {
    console.log('openBaseFile called');
    const baseFileInput = document.getElementById('base-file-input');
    if (baseFileInput) {
        baseFileInput.click();
    } else {
        console.error('base-file-input not found');
    }
};

window.saveFile = function () {
    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
    const defaultName = `fuel_map_${dateStr}.csv`;

    const fileName = prompt('保存するファイル名を入力してください:', defaultName);

    if (fileName === null || fileName.trim() === '') {
        return;
    }

    let csv = "TPS\\RPM," + RPM_AXIS.join(",") + "\n";
    fuelMap.forEach((row, i) => {
        csv += TPS_AXIS[i] + "," + row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const finalName = fileName.trim().endsWith('.csv') ? fileName.trim() : fileName.trim() + '.csv';
    link.download = finalName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

window.undo = function () {
    if (historyIndex > 0) {
        historyIndex--;
        fuelMap = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        renderTable();
        if (document.getElementById('graph-overlay').classList.contains('active')) {
            updateGraph();
        }
    }
};

window.redo = function () {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        fuelMap = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        renderTable();
        if (document.getElementById('graph-overlay').classList.contains('active')) {
            updateGraph();
        }
    }
};

function saveHistory() {
    // 現在の位置より後の履歴を削除
    historyStack = historyStack.slice(0, historyIndex + 1);

    // 新しい状態を追加
    historyStack.push(JSON.parse(JSON.stringify(fuelMap)));

    // 履歴の上限を超えたら古いものを削除
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    } else {
        historyIndex++;
    }
}

function importFromCSV(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        lines.shift();
        lines.forEach((line, t) => {
            const values = line.split(',');
            values.shift();
            if (t < 21) {
                values.forEach((val, r) => {
                    if (r < window.RPM_AXIS.length) fuelMap[t][r] = parseInt(val) || 0;
                });
            }
        });
        originalFuelMap = fuelMap.map(row => row.slice());

        // Update Filename
        currentFileName = file.name;
        if (typeof updateFileInfo === 'function') updateFileInfo();

        saveHistory();
        renderTable();
        if (document.getElementById('graph-overlay').classList.contains('active')) {
            updateGraph();
        }
    };
    reader.readAsText(file);
}

function importBaseFromCSV(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        lines.shift();
        lines.forEach((line, t) => {
            const values = line.split(',');
            values.shift();
            if (t < 21) {
                values.forEach((val, r) => {
                    if (r < window.RPM_AXIS.length) originalFuelMap[t][r] = parseInt(val) || 0;
                });
            }
        });
        renderTable();
        updateUISelection();
    };
    reader.readAsText(file);
}

// Make these global as they are called from onchange attributes
window.importFromCSV = importFromCSV;
window.importBaseFromCSV = importBaseFromCSV;

window.writeToECU = function () {
    if (!ecuConnected) return;
    alert('ECUへの書き込み機能は未実装です');
};

window.readFromECU = function () {
    if (!ecuConnected) return;
    alert('ECUからの読み取り機能は未実装です');
};
