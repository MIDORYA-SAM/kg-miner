const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
    const publicPath = path.join(__dirname, 'public', 'index.html');
    const rootPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(publicPath)) res.sendFile(publicPath);
    else if (fs.existsSync(rootPath)) res.sendFile(rootPath);
    else res.status(404).send('Arquivo index.html não encontrado.');
});

// Estado Avançado da Simulação
let isMining = false;
let totalHashes = 0;
let hashrate = 0;
let startTime = null;
let simulatedWorkers = 4;
let miningInterval = null;

// Novas Variáveis v2.0
let shares = 0;
let blocks = 0;
let balance = 0.00000000;
let miningMode = 'POOL'; // POOL ou SOLO
let temperature = 40; // Base temp

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado.');
    sendStats(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.action === 'START') {
                if (!isMining) {
                    isMining = true;
                    if (!startTime) startTime = Date.now();
                    startSimulation();
                    broadcast({ type: 'LOG', message: `⛏️ Mineração iniciada em modo ${miningMode}.` });
                }
            } else if (data.action === 'STOP') {
                if (isMining) {
                    isMining = false;
                    stopSimulation();
                    broadcast({ type: 'LOG', message: '🛑 Simulação pausada. Arrefecendo hardware...' });
                }
            } else if (data.action === 'RESET') {
                isMining = false;
                totalHashes = 0;
                hashrate = 0;
                shares = 0;
                blocks = 0;
                balance = 0.0;
                temperature = 40;
                startTime = null;
                stopSimulation();
                broadcast({ type: 'LOG', message: '🔄 Estatísticas e saldo zerados.' });
                broadcastStats();
            } else if (data.action === 'SET_WORKERS') {
                const w = parseInt(data.workers);
                if (w > 0 && w <= 16) simulatedWorkers = w;
            } else if (data.action === 'SET_MODE') {
                miningMode = data.mode;
                broadcast({ type: 'LOG', message: `⚙️ Modo alterado para: ${miningMode}` });
            }
        } catch (error) {
            console.error('Erro no WebSocket:', error);
        }
    });
});

function startSimulation() {
    if (miningInterval) clearInterval(miningInterval);
    
    miningInterval = setInterval(() => {
        if (!isMining) return;
        
        let hashesThisTick = 0;
        let sharesThisTick = 0;
        let blocksThisTick = 0;
        
        for (let i = 0; i < simulatedWorkers; i++) {
            // Simula hashes
            hashesThisTick += Math.floor(Math.random() * 200000) + 800000; 
            
            // Simula Acertos (Shares) - Frequente
            if (Math.random() < 0.3) sharesThisTick++;
            
            // Simula Blocos (Blocks) - Muito Raro (Mais provável no modo Solo)
            let blockChance = miningMode === 'SOLO' ? 0.005 : 0.0001;
            if (Math.random() < blockChance) blocksThisTick++;
        }
        
        totalHashes += hashesThisTick;
        hashrate = hashesThisTick; 
        shares += sharesThisTick;
        blocks += blocksThisTick;

        // Calcula recompensas
        if (miningMode === 'POOL') {
            balance += (sharesThisTick * 0.00000005); // Ganha por share
            if (sharesThisTick > 0 && Math.random() < 0.2) {
                broadcast({ type: 'LOG', message: `✅ Share aceite! (+${sharesThisTick})` });
            }
        } else if (miningMode === 'SOLO') {
            balance += (blocksThisTick * 6.25); // Ganha apenas se achar bloco
            if (blocksThisTick > 0) {
                broadcast({ type: 'LOG', message: `🏆 BLOCO ENCONTRADO! (+6.25 BTC)` });
            }
        }

        // Simula a física do hardware
        let targetTemp = 50 + (simulatedWorkers * 2.5) + (Math.random() * 2);
        temperature += (targetTemp - temperature) * 0.1; // Sobe suavemente

        broadcastStats();
    }, 1000);
}

function stopSimulation() {
    if (miningInterval) clearInterval(miningInterval);
    miningInterval = null;
    hashrate = 0;
    
    // Arrefecimento suave quando parado
    let coolInterval = setInterval(() => {
        if (isMining || temperature <= 40) {
            clearInterval(coolInterval);
            return;
        }
        temperature -= 1.5;
        broadcastStats();
    }, 1000);
    
    broadcastStats();
}

function sendStats(ws) {
    const uptime = (startTime && isMining) ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const power = isMining ? (simulatedWorkers * 120) + Math.floor(Math.random() * 15) : 0; // 120W por worker

    const stats = {
        type: 'STATS',
        isMining, totalHashes, hashrate, uptime,
        workers: simulatedWorkers,
        shares, blocks, balance,
        temperature: temperature.toFixed(1),
        power, miningMode
    };
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(stats));
}

function broadcastStats() {
    wss.clients.forEach((client) => sendStats(client));
}

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));
