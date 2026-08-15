const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const http = require('http');

const sessionDir = '/tmp/session'; // Railway temp storage
const phoneNumber = '2348139025363'; // YOUR NUMBER
const PORT = process.env.PORT || 3000; // Railway gives port

// STEP 1: TEMP WIPE - DELETE AFTER 1 SUCCESSFUL DEPLOY
if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('🗑️ Old session wiped clean. Waiting for new code...');
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: require('pino')({ level: 'silent' }),
        markMessagesAsRead: false, // GHOST: No blue ticks
        printQRInTerminal: false,
        browser: ['Google Chrome', 'Ubuntu', '22.04'] // GHOST: Disguise as PC
    });

    // Force save every 10s so Railway no delete am
    setInterval(() => {
        saveCreds()
    }, 10000)

    // Request pairing code if not registered
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n====================================');
                console.log('YOUR PAIRING CODE:', code);
                console.log('Go WhatsApp > Linked devices > Link with phone number');
                console.log('====================================\n');
            } catch (err) {
                console.log('Error getting code:', err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ SUCCESS! GHOST BOT CONNECTED');
            await sock.sendPresenceUpdate('available');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconnecting in 5s...');
                setTimeout(startBot, 5000);
            } else {
                console.log('Logged out. Delete session and pair again.');
            }
        }
    });

    // GHOST: Stay Online 24/7 - Presence
    setInterval(async () => {
        if (sock.user) await sock.sendPresenceUpdate('available');
    }, 30000);

    // THE PING - This one dey tell WhatsApp "I dey alive"
    setInterval(async () => {
        try {
            if (sock.user) {
                await sock.query({
                    tag: 'iq',
                    attrs: {
                        to: '@s.whatsapp.net',
                        type: 'get',
                        xmlns: 'w:ping'
                    }
                })
            }
        } catch(e) {}
    }, 20000)
}

startBot();

// ANTI-SLEEP SERVER - This makes Railway think say app dey busy
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive ✅');
}).listen(PORT, () => {
    console.log(`✅ Anti-sleep server running on port ${PORT}`);
});
