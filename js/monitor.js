class Monitor {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = null;
        // Logging
        this.isRecording = false;
        this.logData = [];
        this.startTime = 0;
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            const url = document.getElementById('ws-url').value;
            this.connect(url);
        }
    }

    connect(url) {
        if (this.ws) {
            this.ws.close();
        }

        try {
            // Security Check: Mixed Content
            if (window.location.protocol === 'https:' && url.startsWith('ws:')) {
                alert("【重要】セキュリティ制限により接続できません。\n\nHTTPS(GitHub Pages等)から、ws://(暗号化なし)への接続はブラウザによってブロックされます。\n\n対処法:\n1. サーバーをWSS対応にする(ESP32では困難)\n2. アプリをHTTPでホストする\n3. ローカルファイルとして開く");
                this.updateStatus('error');
                return;
            }

            this.ws = new WebSocket(url);
            this.updateStatus('connecting');

            this.ws.onopen = () => {
                this.updateStatus('connected');
                // console.log('WebSocket Connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.updateUI(data);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                }
            };

            this.ws.onclose = () => {
                this.updateStatus('disconnected');
                // console.log('WebSocket Closed');
                this.ws = null;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                this.updateStatus('error');
                // Mobile debugging aid
                // alert("接続エラー: " + (error.message || "詳細不明"));
            };

        } catch (e) {
            console.error('Connection Error:', e);
            this.updateStatus('error');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.updateStatus('disconnected');
    }

    updateStatus(status) {
        const indicator = document.getElementById('connection-status');
        const btn = document.getElementById('btn-monitor-connect');

        if (!indicator || !btn) return;

        this.isConnected = (status === 'connected');

        if (status === 'connected') {
            indicator.style.background = '#00ff00';
            indicator.style.boxShadow = '0 0 10px #00ff00';
            btn.textContent = '切断';
            btn.style.background = '#d83b01';
        } else if (status === 'connecting') {
            indicator.style.background = '#ffff00';
            indicator.style.boxShadow = 'none';
            btn.textContent = '接続中...';
            btn.disabled = true;
        } else {
            indicator.style.background = '#666';
            indicator.style.boxShadow = 'none';
            btn.textContent = '接続';
            btn.style.background = '#0078d4';
            btn.disabled = false;
        }
    }

    updateUI(data) {
        // Data Mappings based on user request:
        // tp, iat, eot, map0, map1, vol, ap, rpm

        this.setVal('val-rpm', data.rpm);
        this.setVal('val-tp', data.tp, 1); // Maybe 1 decimal for TP?
        this.setVal('val-map0', data.map0);
        this.setVal('val-map1', data.map1);
        this.setVal('val-iat', data.iat);
        this.setVal('val-eot', data.eot);
        this.setVal('val-vol', data.vol, 2); // Voltage usually 2 decimals
        this.setVal('val-ap', data.ap);

        // Logging Logic
        if (this.isRecording) {
            this.recordData(data);
        }
    }

    setVal(id, value, decimals = 0) {
        const el = document.getElementById(id);
        if (el) {
            if (value === undefined || value === null) {
                el.innerText = '---';
            } else {
                if (typeof value === 'number') {
                    el.innerText = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
                } else {
                    el.innerText = value;
                }
            }
        }
    }

    // --- Recording Logic ---

    // --- Recording Logic ---
    toggleRecording() {
        const btnRecord = document.getElementById('btn-record-all');
        const btnSave = document.getElementById('btn-save-all');
        const timerEl = document.getElementById('recording-timer');

        if (this.isRecording) {
            // Stop
            this.isRecording = false;
            // Stop Pulse
            if (btnRecord) {
                btnRecord.innerHTML = '<span style="color:#ff4444; font-size:18px;">⏺</span> <span>記録</span>';
                btnRecord.classList.remove('recording-active');
            }
            // Enable Save if we have data
            if (btnSave) btnSave.disabled = false;

            // Stop Timer
            if (this.timerInterval) clearInterval(this.timerInterval);
            if (timerEl) timerEl.style.display = 'none';

        } else {
            // Start
            this.isRecording = true;
            this.logData = []; // Reset Buffer
            this.startTime = Date.now();

            // Visual Pulse
            if (btnRecord) {
                btnRecord.innerHTML = '<span style="color:white; font-size:18px;">⏹</span> <span>停止</span>';
                btnRecord.classList.add('recording-active');
            }
            if (btnSave) btnSave.disabled = true;

            // Start Timer
            if (timerEl) {
                timerEl.style.display = 'block';
                timerEl.innerText = '00:00';
                this.timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
                    const ss = String(elapsed % 60).padStart(2, '0');
                    timerEl.innerText = `${mm}:${ss}`;
                }, 1000);
            }

            // Generate some dummy data immediately for visual feedback/demo if not connected
            if (!this.isConnected) {
                this.simulateRecording();
            }
        }
    }

    // Helper for demo when not connected
    simulateRecording() {
        if (!this.isRecording) return;
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;

        // Sim data
        const demoData = {
            timestamp: elapsed.toFixed(1),
            rpm: Math.floor(1000 + Math.random() * 500),
            tp: (Math.random() * 100).toFixed(1),
            map0: (90 + Math.random() * 10).toFixed(0),
            map1: (80 + Math.random() * 10).toFixed(0),
            iat: 25,
            eot: 80,
            vol: 13.5,
            ap: 1013
        };
        this.logData.push(demoData);

        // Loop
        setTimeout(() => this.simulateRecording(), 100);
    }

    recordData(data) {
        if (!this.isRecording) return;
        // If real data comes in
        const logEntry = { ...data };
        logEntry.timestamp = ((Date.now() - this.startTime) / 1000).toFixed(3);
        this.logData.push(logEntry);
    }

    saveLog() {
        if (this.logData.length === 0) {
            alert("保存するデータがありません (記録バッファが空です)");
            return;
        }

        const defaultName = "ecu_log_" + new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "") + ".csv";
        const fileName = prompt("ファイル名を入力して保存:", defaultName);

        if (!fileName) return; // Cancelled

        // Convert Buffer to CSV
        // Helper: Get all unique keys from first entry or predefined set?
        // Let's use predefined set for consistency
        const headers = ["timestamp", "rpm", "tp", "map0", "map1", "iat", "eot", "vol", "ap"];
        let csvContent = headers.join(",") + "\n";

        this.logData.forEach(row => {
            const line = headers.map(h => row[h] !== undefined ? row[h] : "").join(",");
            csvContent += line + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName.endsWith('.csv') ? fileName : fileName + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
// Singleton Instance
const monitor = new Monitor();
window.monitor = monitor;

window.saveDummy = function () {
    alert("Monitor Data Saved (Dummy)");
};
