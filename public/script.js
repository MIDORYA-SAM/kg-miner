const wsStatusDot = document.getElementById('ws-status');
const wsStatusText = document.getElementById('ws-text');
const hashrateVal = document.getElementById('hashrate-val');
const balanceVal = document.getElementById('balance-val');
const sharesVal = document.getElementById('shares-val');
const blocksVal = document.getElementById('blocks-val');
const tempVal = document.getElementById('temp-val');
const powerVal = document.getElementById('power-val');

const logBox = document.getElementById('log-box');
const workersInput = document.getElementById('workers-input');
const modeSelect = document.getElementById('mode-select');

const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');

let ws;
let reconnectInterval;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        updateWsStatus(true);
        addLog('⚡ Conexão ao servidor estabelecida.');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATS') {
                updateDashboard(data);
            } else if (data.type === 'LOG') {
                addLog(data.message);
            }
        } catch (err) {
            console.error('Erro:', err);
        }
    };

    ws.onclose = () => {
        updateWsStatus(false);
        addLog('❌ Conexão perdida. A reconectar...');
        btnStart.disabled = true;
        btnStop.disabled = true;
        if (!reconnectInterval) reconnectInterval = setInterval(connectWebSocket, 3000);
    };
}

function updateWsStatus(isOnline) {
    if (isOnline) {
        wsStatusDot.className = 'dot online';
        wsStatusText.textContent = 'Online';
        btnStart.disabled = false;
        btnReset.disabled = false;
    } else {
        wsStatusDot.className = 'dot offline';
        wsStatusText.textContent = 'Offline';
    }
}

function updateDashboard(stats) {
    btnStart.disabled = stats.isMining;
    btnStop.disabled = !stats.isMining;

    hashrateVal.textContent = formatHashrate(stats.hashrate);
    balanceVal.textContent = stats.balance.toFixed(8); // Exibe 8 casas decimais (estilo BTC)
    sharesVal.textContent = stats.shares.toLocaleString();
    blocksVal.textContent = stats.blocks;
    
    tempVal.textContent = `${stats.temperature} °C`;
    powerVal.textContent = `${stats.power} W`;

    // Atualiza os inputs para estarem sincronizados com o servidor
    if (document.activeElement !== workersInput) workersInput.value = stats.workers;
    if (document.activeElement !== modeSelect) modeSelect.value = stats.miningMode;
}

function formatHashrate(hashes) {
    if (hashes === 0) return '0.00 H/s';
    if (hashes < 1000) return `${hashes} H/s`;
    if (hashes < 1000000) return `${(hashes / 1000).toFixed(2)} kH/s`;
    if (hashes < 1000000000) return `${(hashes / 1000000).toFixed(2)} MH/s`;
    return `${(hashes / 1000000000).toFixed(2)} GH/s`;
}

function addLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const time = document.createElement('span');
    time.className = 'log-time';
    const now = new Date();
    time.textContent = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
    
    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = msg;
    
    entry.appendChild(time);
    entry.appendChild(text);
    
    logBox.insertBefore(entry, logBox.firstChild);
    if (logBox.children.length > 30) logBox.removeChild(logBox.lastChild);
}

// Botões
btnStart.addEventListener('click', () => ws.send(JSON.stringify({ action: 'START' })));
btnStop.addEventListener('click', () => ws.send(JSON.stringify({ action: 'STOP' })));
btnReset.addEventListener('click', () => ws.send(JSON.stringify({ action: 'RESET' })));

// Configurações
workersInput.addEventListener('change', (e) => {
    ws.send(JSON.stringify({ action: 'SET_WORKERS', workers: e.target.value }));
});

modeSelect.addEventListener('change', (e) => {
    ws.send(JSON.stringify({ action: 'SET_MODE', mode: e.target.value }));
});

connectWebSocket();
