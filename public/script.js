const wsStatusDot = document.getElementById('ws-status');
const wsStatusText = document.getElementById('ws-text');
const hashrateVal = document.getElementById('hashrate-val');
const balanceVal = document.getElementById('balance-val');
const balanceUsdVal = document.getElementById('balance-usd-val');
const sharesVal = document.getElementById('shares-val');
const blocksVal = document.getElementById('blocks-val');
const tempVal = document.getElementById('temp-val');
const powerVal = document.getElementById('power-val');

const btcPriceVal = document.getElementById('btc-price-val');
const priceCard = document.getElementById('price-card');

const logBox = document.getElementById('log-box');
const workersInput = document.getElementById('workers-input');
const modeSelect = document.getElementById('mode-select');

const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');

let ws;
let reconnectInterval;
let currentBtcPrice = 0; // Guarda o preço real do BTC
let currentBalanceBtc = 0; // Guarda o teu saldo simulado

// ==========================================
// LIGAÇÃO À BINANCE (DADOS REAIS DO MERCADO)
// ==========================================
const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

binanceWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const newPrice = parseFloat(data.c); // Preço atual (Current price)
    
    // Atualiza o texto do preço
    btcPriceVal.textContent = `$ ${newPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Efeito visual de Subida (Verde) ou Descida (Vermelho)
    if (newPrice > currentBtcPrice) {
        btcPriceVal.style.color = '#10B981';
        priceCard.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (newPrice < currentBtcPrice) {
        btcPriceVal.style.color = '#EF4444';
        priceCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    }
    
    currentBtcPrice = newPrice;
    updateUsdBalance(); // Atualiza o teu saldo em Dólares
};

function updateUsdBalance() {
    if (currentBtcPrice > 0) {
        const valueInUsd = currentBalanceBtc * currentBtcPrice;
        balanceUsdVal.textContent = `$${valueInUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
}

// ==========================================
// LIGAÇÃO AO TEU SERVIDOR RENDER (SIMULAÇÃO)
// ==========================================
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        updateWsStatus(true);
        addLog('⚡ Servidor de mineração conectado.');
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
        wsStatusText.textContent = 'Servidor Online';
        btnStart.disabled = false;
        btnReset.disabled = false;
    } else {
        wsStatusDot.className = 'dot offline';
        wsStatusText.textContent = 'Servidor Offline';
    }
}

function updateDashboard(stats) {
    btnStart.disabled = stats.isMining;
    btnStop.disabled = !stats.isMining;

    hashrateVal.textContent = formatHashrate(stats.hashrate);
    
    // Atualiza Saldo BTC e aciona a conversão para Dólares
    currentBalanceBtc = stats.balance;
    balanceVal.textContent = `${currentBalanceBtc.toFixed(8)} BTC`;
    updateUsdBalance(); 

    sharesVal.textContent = stats.shares.toLocaleString();
    blocksVal.textContent = stats.blocks;
    
    tempVal.textContent = `${stats.temperature} °C`;
    powerVal.textContent = `${stats.power} W`;

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

// Controlos
btnStart.addEventListener('click', () => ws.send(JSON.stringify({ action: 'START' })));
btnStop.addEventListener('click', () => ws.send(JSON.stringify({ action: 'STOP' })));
btnReset.addEventListener('click', () => ws.send(JSON.stringify({ action: 'RESET' })));
workersInput.addEventListener('change', (e) => ws.send(JSON.stringify({ action: 'SET_WORKERS', workers: e.target.value })));
modeSelect.addEventListener('change', (e) => ws.send(JSON.stringify({ action: 'SET_MODE', mode: e.target.value })));

connectWebSocket();
