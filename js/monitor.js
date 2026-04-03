// js/monitor.js
import { state } from './state.js';

export class Monitor {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = null;
        this.isRecording = false;
        this.logData = [];
        this.startTime = 0;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initToggles());
        } else {
            this.initToggles();
        }
    }

    initToggles() {
        const toggles = document.querySelectorAll('.monitor-toggle');
        toggles.forEach(toggle => {
            this.updateCardState(toggle);
            toggle.addEventListener('change', (e) => {
                this.updateCardState(e.target);
            });
        });
    }

    updateCardState(checkbox) {
        const card = checkbox.closest('.monitor-card');
        if (card) {
            card.classList.toggle('compact', !checkbox.checked);
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
        if (this.ws) this.ws.close();
        try {
            this.ws = new WebSocket(url);
            this.updateStatus('connecting');

            this.ws.onopen = () => this.updateStatus('connected');
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.updateUI(data);
                } catch (e) {}
            };
            this.ws.onclose = () => {
                this.updateStatus('disconnected');
                this.ws = null;
            };
        } catch (e) {
            console.error('Connection Error:', e);
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
        const btns = document.querySelectorAll('.btn-connect');
        this.isConnected = (status === 'connected' || status === 'connecting');

        btns.forEach(b => {
            if (this.isConnected) {
                b.innerText = '接続中';
                b.style.background = '#d13438';
            } else {
                b.innerText = '未接続';
                b.style.background = '#0078d4';
            }
        });
    }

    updateUI(data) {
        this.setVal('val-rpm', data.rpm);
        this.setVal('val-tp', data.tp, 1);
        this.setVal('val-map0', data.map0);
        this.setVal('val-map1', data.map1);
        this.setVal('val-iat', data.iat);
        this.setVal('val-eot', data.eot);
        this.setVal('val-vol', data.vol, 2);
        this.setVal('val-ap', data.ap);

        if (this.isRecording) this.recordData(data);
    }

    setVal(id, value, decimals = 0) {
        const el = document.getElementById(id);
        if (el) {
            if (value === undefined || value === null) el.innerText = '---';
            else {
                if (typeof value === 'number') el.innerText = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
                else el.innerText = value;
            }
        }
    }

    toggleRecording() {
        const btnRecord = document.getElementById('btn-record-all');
        const btnSave = document.getElementById('btn-save-all');
        const timerEls = document.querySelectorAll('#recording-timer');

        if (this.isRecording) {
            this.isRecording = false;
            if (btnRecord) {
                btnRecord.innerHTML = '<span style="color:#ff4444; font-size:18px;">⏺</span> <span>記録</span>';
                btnRecord.classList.remove('recording-active');
            }
            if (btnSave) btnSave.disabled = false;
            if (this.timerInterval) clearInterval(this.timerInterval);
            timerEls.forEach(el => el.style.color = "#666");
        } else {
            this.isRecording = true;
            this.logData = [];
            this.startTime = Date.now();
            timerEls.forEach(el => {
                el.style.color = "#ff4444";
                el.innerText = '00:00.0';
            });

            const logDisplay = document.getElementById('monitor-log-display');
            if (logDisplay) {
                logDisplay.innerText = "";
                this.activeLogHeaders = ["timestamp"];
                document.querySelectorAll('.monitor-toggle').forEach(t => {
                    if (t.checked) this.activeLogHeaders.push(t.dataset.key);
                });
                logDisplay.innerText += this.activeLogHeaders.join(",") + "\n";
            }

            if (btnRecord) {
                btnRecord.innerHTML = '<span style="color:white; font-size:18px;">⏹</span> <span>停止</span>';
                btnRecord.classList.add('recording-active');
            }
            if (btnSave) btnSave.disabled = true;

            this.timerInterval = setInterval(() => {
                const diff = Date.now() - this.startTime;
                if (diff >= 180000) { this.toggleRecording(); return; }
                const mm = String(Math.floor(diff / 60000)).padStart(2, '0');
                const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
                const ms = Math.floor((diff % 1000) / 100);
                const timeStr = `${mm}:${ss}.${ms}`;
                timerEls.forEach(el => el.innerText = timeStr);
            }, 50);

            if (!this.isConnected) this.simulateRecording();
        }
    }

    simulateRecording() {
        if (!this.isRecording) return;
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;
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
        this.appendLog(demoData);
        setTimeout(() => this.simulateRecording(), 100);
    }

    recordData(data) {
        if (!this.isRecording) return;
        const logEntry = { ...data };
        logEntry.timestamp = ((Date.now() - this.startTime) / 1000).toFixed(1);
        this.logData.push(logEntry);
        this.appendLog(logEntry);
    }

    appendLog(entry) {
        const logDisplay = document.getElementById('monitor-log-display');
        if (!logDisplay || !this.activeLogHeaders) return;
        const line = this.activeLogHeaders.map(h => entry[h] !== undefined ? entry[h] : "").join(",");
        logDisplay.innerText += line + "\n";
        logDisplay.scrollTop = logDisplay.scrollHeight;
    }

    saveLog() {
        if (this.logData.length === 0) {
            alert("保存するデータがありません");
            return;
        }
        const defaultName = "ecu_log_" + new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "") + ".csv";
        const fileName = prompt("ファイル名を入力して保存:", defaultName);
        if (!fileName) return;

        const activeHeaders = ["timestamp"];
        document.querySelectorAll('.monitor-toggle').forEach(t => {
            if (t.checked) activeHeaders.push(t.dataset.key);
        });

        let csvContent = activeHeaders.join(",") + "\n";
        this.logData.forEach(row => {
            csvContent += activeHeaders.map(h => row[h] !== undefined ? row[h] : "").join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName.endsWith('.csv') ? fileName : fileName + ".csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export const monitor = new Monitor();
window.monitor = monitor;

