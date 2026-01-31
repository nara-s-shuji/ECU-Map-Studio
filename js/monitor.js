class Monitor {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = null;
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
}

// Singleton Instance
const monitor = new Monitor();
window.monitor = monitor;
