class Monitor {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = null;
        // Logging
        this.isRecording = false;
        this.logData = [];
        this.startTime = 0;
        this.logData = [];
        this.startTime = 0;

        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initToggles());
        } else {
            this.initToggles();
        }
    }

    initToggles() {
        const toggles = document.querySelectorAll('.monitor-toggle');
        toggles.forEach(toggle => {
            // Initial State
            this.updateCardState(toggle);

            // Change Listener
            toggle.addEventListener('change', (e) => {
                this.updateCardState(e.target);
            });
        });
    }

    updateCardState(checkbox) {
        const card = checkbox.closest('.monitor-card');
        if (card) {
            if (checkbox.checked) {
                card.classList.remove('compact');
            } else {
                card.classList.add('compact');
            }
        }
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            const el = document.getElementById('ws-url');
            const url = el ? el.value : 'ws://192.168.4.1/ws';
            this.connect(url);
        }
    }

    connect(url) {
        if (this.ws) {
            this.ws.close();
        }

        try {
            // Security Check: Mixed Content (DISABLED BY USER REQUEST)
            /*
            if (window.location.protocol === 'https:' && url.startsWith('ws:')) {
                alert("【重要】セキュリティ制限により接続できません。\n\nHTTPS(GitHub Pages等)から、ws://(暗号化なし)への接続はブラウザによってブロックされます。\n\n対処法:\n1. サーバーをWSS対応にする(ESP32では困難)\n2. アプリをHTTPでホストする\n3. ローカルファイルとして開く");
                this.updateStatus('error');
                return;
            }
            */

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
                    // console.error('JSON Parse Error:', e);
                }
            };

            this.ws.onclose = () => {
                this.updateStatus('disconnected');
                // console.log('WebSocket Closed');
                this.ws = null;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);

                // If mixed content blocks it, onerror fires immediately.
                // We'll let it show error state if it fails.
                // UPDATE: User wants to keep "Connecting" (Red) state to allow toggling it off manually.
                // So we SUPPRESS the visual update for error here.
                // this.updateStatus('error');
            };

        } catch (e) {
            console.error('Connection Error:', e);
            // this.updateStatus('error');
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
        const btn = document.getElementById('btn-monitor-connect'); // This might be old but let's keep it safe or just target .btn-connect
        const btns = document.querySelectorAll('.btn-connect');

        // KEY FIX: Treat 'connecting' as connected so clicking it again triggers disconnect()
        this.isConnected = (status === 'connected' || status === 'connecting');

        btns.forEach(b => {
            if (status === 'connected' || status === 'connecting') {
                // User requested: Text "接続中", Color Red even for connecting
                b.innerText = '接続中';
                b.style.background = '#d13438'; // Red
            } else {
                b.innerText = '未接続';
                b.style.background = '#0078d4'; // Blue
                b.disabled = false;
            }
        });

        // Keep old indicator logic if it exists
        if (indicator && btn) {
            if (status === 'connected') {
                indicator.style.background = '#00ff00';
                indicator.style.boxShadow = '0 0 10px #00ff00';
                btn.textContent = '切断';
                btn.style.background = '#d83b01';
            } else if (status === 'connecting') {
                indicator.style.background = '#ffff00';
                indicator.style.boxShadow = 'none';
                btn.textContent = '接続中...';
                // btn.disabled = true; // Allow clicking
            } else {
                indicator.style.background = '#666';
                indicator.style.boxShadow = 'none';
                btn.textContent = '接続';
                btn.style.background = '#0078d4';
                btn.disabled = false;
            }
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
        // Update all elements with this ID to handle duplicates safely
        const timerEls = document.querySelectorAll('#recording-timer');

        // alert(`DEBUG: toggleRecording. isRecording=${this.isRecording}, timerEl=${!!timerEl}, Count=${timerCount}`);

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

            // Stop Timer -> Freeze State (Gray)
            if (this.timerInterval) clearInterval(this.timerInterval);

            timerEls.forEach(el => {
                // Keep the current innerText (frozen time)
                // Just change color to indicate stopped state
                el.style.color = "#666";
            });

        } else {
            // Start
            // alert("DEBUG: Flow -> Start Block");
            this.isRecording = true;
            this.logData = []; // Reset Buffer
            this.startTime = Date.now();

            // Timer -> Active State
            timerEls.forEach(el => {
                el.style.color = "#ff4444"; // Red for recording
                el.innerText = '00:00.0';
            });

            // Visual Pulse
            if (btnRecord) {
                btnRecord.innerHTML = '<span style="color:white; font-size:18px;">⏹</span> <span>停止</span>';
                btnRecord.classList.add('recording-active');
            }
            if (btnSave) btnSave.disabled = true;

            // Start Timer (0.1s resolution)
            if (timerEls.length > 0) {
                // Update every ~50ms to ensure we catch 0.1s changes smoothly
                this.timerInterval = setInterval(() => {
                    try {
                        const diff = Date.now() - this.startTime;
                        // Calculate components
                        const mm = String(Math.floor(diff / 60000)).padStart(2, '0');
                        const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
                        const ms = Math.floor((diff % 1000) / 100); // 1/10th of a second

                        const timeStr = `${mm}:${ss}.${ms}`;

                        timerEls.forEach(el => {
                            el.innerText = timeStr;
                        });
                    } catch (e) {
                        console.error("Timer Error", e);
                    }
                }, 50);
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
        // Dynamic Headers based on Checkboxes
        const activeHeaders = ["timestamp"]; // Always include timestamp
        const toggles = document.querySelectorAll('.monitor-toggle');
        toggles.forEach(toggle => {
            if (toggle.checked) {
                // Ensure data-key matches the logData property names
                activeHeaders.push(toggle.dataset.key);
            }
        });

        // Debug: Ensure we have headers
        if (activeHeaders.length === 1) {
            // Warn if nothing checked? Or just save timestamp?
            // Let's just allow it, maybe they only want timestamp.
        }

        let csvContent = activeHeaders.join(",") + "\n";

        this.logData.forEach(row => {
            const line = activeHeaders.map(h => row[h] !== undefined ? row[h] : "").join(",");
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
console.log("Monitor Module Loaded (debug_105)");

window.saveDummy = function () {
    alert("Monitor Data Saved (Dummy)");
};
