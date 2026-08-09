const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const sessionDir = './session';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: require('pino')({ level: 'info' }),
        markMessagesAsRead: false,
        printQRInTerminal: false // No QR
    });

    sock.ev.on('creds.update', saveCreds);

    // Request pairing code if not logged in
    if (!sock.authState.creds.registered) {
        const phoneNumber = '2348139025363'; // PUT YOUR WHATSAPP NUMBER HERE WITH COUNTRY CODE
        console.log('Requesting pairing code for:', phoneNumber);
        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('YOUR PAIRING CODE: ', code); // Copy this 6-digit code
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('Bot connected successfully');
            await sock.sendPresenceUpdate('available');
        } else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    // Keep online every 30 seconds
    setInterval(async () => {
        if (sock.user) await sock.sendPresenceUpdate('available');
    }, 30000);
}

startBot();
