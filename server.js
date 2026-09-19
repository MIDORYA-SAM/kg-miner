const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const publicPath = path.join(__dirname, 'public');

// Servir ficheiros estáticos da pasta public
app.use(express.static(publicPath));

// Rota principal para carregar o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Estado da Simulação Educacional
let isMining = false;
let totalHashes = 0;
let hashrate = 0;
let startTime = null;
let simulatedWorkers = 4;
let miningInterval = null;

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
                    broadcast({ type: 'LOG', message: 'Simulação educacional iniciada.' });
                }
            } else if (data.action === 'STOP') {
                if (isMining) {
                    isMining = false;
                    stopSimulation();
                    broadcast({ type: 'LOG', message: 'Simulação pausada.' });
                }
            } else if (data.action === 'RESET') {
                isMining = false;
                totalHashes = 0;
                hashrate = 0;
                startTime = null;
                stopSimulation();
                broadcast({ type: 'LOG', message: 'Estatísticas zeradas.' });
                broadcastStats();
            } else if (data.action === 'SET_WORKERS') {
                const w = parseInt(data.workers);
                if (w > 0 && w <= 16) {
                    simulatedWorkers = w;
                }
            }
        } catch (error) {
            console.error('Erro ao processar mensagem do WebSocket', error);
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

function startSimulation() {
    if (miningInterval) clearInterval(miningInterval);
    
    miningInterval = setInterval(() => {
        if (!isMining) return;
        
        let hashesThisTick = 0;
        for (let i = 0; i < simulatedWorkers; i++) {
            crypto.createHash('sha256').update(Math.random().toString()).digest('hex');
            hashesThisTick += Math.floor(Math.random() * 100000) + 450000; 
        }
        
        totalHashes += hashesThisTick;
        hashrate = hashesThisTick; 

        broadcastStats();
    }, 1000);
}

function stopSimulation() {
    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }
    hashrate = 0;
    broadcastStats();
}

function sendStats(ws) {
    const uptime = (startTime && isMining) ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const stats = {
        type: 'STATS',
        isMining,
        totalHashes,
        hashrate,
        uptime,
        workers: simulatedWorkers
    };
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(stats));
    }
}

function broadcastStats() {
    wss.clients.forEach((client) => sendStats(client));
}

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor KG Miner rodando na porta ${PORT}`);
});
