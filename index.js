const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

const sessionDir = './session';
const phoneNumber = '2348139025363'; // YOUR NUMBER

// Railway Fix: Auto delete bad session
if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('Old session deleted');
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: require('pino')({ level: 'silent' }),
        markMessagesAsRead: false, // GHOST: No blue ticks
        printQRInTerminal: false
    });

    // Request pairing code if not registered
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('\n====================================');
            console.log('YOUR PAIRING CODE:', code);
            console.log('Go WhatsApp > Linked devices > Link with phone number');
            console.log('====================================\n');
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('✅ SUCCESS! GHOST BOT CONNECTED');
            await sock.sendPresenceUpdate('available');
        } else if (connection === 'close') {
            console.log('Reconnecting...');
            setTimeout(startBot, 3000);
        }
    });

    // GHOST: Stay Online 24/7
    setInterval(async () => {
        if (sock.user) await sock.sendPresenceUpdate('available');
    }, 30000);
}

startBot();
