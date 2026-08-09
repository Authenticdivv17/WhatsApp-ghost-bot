const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const sessionDir = './session';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: require('pino')({ level: 'info' }),
        markMessagesAsRead: false // This makes it stay on 2 grey ticks
    });

    sock.ev.on('creds.update', saveCreds);

    // Always stay online
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('QR Code received. Scan it with WhatsApp');
        }
        
        if (connection === 'open') {
            console.log('Bot connected successfully');
            // Set presence to online always
            await sock.sendPresenceUpdate('available');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    // Keep presence online every 30 seconds
    setInterval(async () => {
        if (sock.user) {
            await sock.sendPresenceUpdate('available');
        }
    }, 30000);

    // Receive messages but don't mark as read = 2 grey ticks
    sock.ev.on('messages.upsert', async (m) => {
        console.log('New message received but not read');
        // We don't call sock.readMessages() so it stays 2 grey ticks
    });
}

startBot();
