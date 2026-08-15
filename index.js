const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const sessionDir = './session';

// Railway Fix: Auto delete bad session on start
if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('Old session deleted');
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: require('pino')({ level: 'silent' }), // Less spam
        markMessagesAsRead: false, // GHOST FEATURE 1: No blue ticks
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        if (qr) {
            console.log('\n====================================');
            console.log('SCAN THIS QR NOW - Expires in 60s');
            console.log('====================================\n');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('✅ SUCCESS! GHOST BOT CONNECTED');
            await sock.sendPresenceUpdate('available'); // Set online
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...');
            if (shouldReconnect) {
                setTimeout(startBot, 3000);
            }
        }
    });

    // GHOST FEATURE 2: Stay Online 24/7
    setInterval(async () => {
        if (sock.user) await sock.sendPresenceUpdate('available');
    }, 30000); // Every 30 seconds
}

startBot();
