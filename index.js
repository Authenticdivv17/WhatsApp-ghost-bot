const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');

// 1. Create small web server so Render no go kill am
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Ghost Bot is Running 👻 - 08139025363");
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} - Keeping Render alive`);
});

let hasRequestedCode = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered && !hasRequestedCode) {
        hasRequestedCode = true;
        const cleanNumber = "2348139025363";
        
        console.log("Waiting 10 seconds to connect to WhatsApp servers...");
        await new Promise(r => setTimeout(r, 10000));
        
        try {
            console.log("Requesting pairing code now...");
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(`\n========================`);
            console.log(`PAIRING CODE: ${code}`);
            console.log(`For: 08139025363`);
            console.log(`========================\n`);
        } catch (e) {
            console.log("Failed, retrying in 10 sec:", e.message);
            hasRequestedCode = false;
            setTimeout(startBot, 10000);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Closed, reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                if(!sock.authState.creds.registered) hasRequestedCode = false;
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ Ghost Bot CONNECTED for 08139025363 👻');
        }
    });
}

startBot();
