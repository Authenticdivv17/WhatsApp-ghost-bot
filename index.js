const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');

const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.end("Ghost Bot Running for 08139025363 👻");
}).listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));

let pairingRequested = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "122.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (!sock.authState.creds.registered && !pairingRequested && connection !== 'close') {
            // Wait for socket to be stable
            pairingRequested = true;
            console.log("Socket stable, waiting 15 sec before code...");
            await new Promise(r => setTimeout(r, 15000));
            try {
                const code = await sock.requestPairingCode("2348139025363");
                console.log(`\n===== PAIRING CODE FOR 08139025363 =====`);
                console.log(code);
                console.log(`========================================\n`);
            } catch (e) {
                console.log("Pairing failed:", e.message);
                pairingRequested = false;
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnect:', shouldReconnect);
            if (shouldReconnect) {
                if (!sock.authState.creds.registered) pairingRequested = false;
                setTimeout(startBot, 5000);
            }
        }
        if (connection === 'open') {
            console.log('✅ CONNECTED - 08139025363 Ghost Online 👻');
        }
    });
}

startBot();
