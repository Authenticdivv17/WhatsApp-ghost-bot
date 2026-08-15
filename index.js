const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

const sessionDir = '/tmp/session'; // STEP 1: CHANGE FROM ./session TO /tmp/session
const phoneNumber = '2348139025363'; // YOUR NUMBER

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: require('pino')({ level: 'silent' }),
        markMessagesAsRead: false, // GHOST: No blue ticks
        printQRInTerminal: false
    });

    // STEP 2: ADD THIS - Force save every 10s so Railway no delete am
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
                console.log('Reconnecting...');
                setTimeout(startBot, 3000);
            }
        }
    });

    // GHOST: Stay Online 24/7
    setInterval(async () => {
        if (sock.user) await sock.sendPresenceUpdate('available');
    }, 30000);
}

startBot();
