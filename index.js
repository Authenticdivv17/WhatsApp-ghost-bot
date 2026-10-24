const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

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
        const phoneNumber = "2348139025363"; // Your number fixed
        
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        console.log("Waiting 5 seconds before requesting code...");
        await new Promise(r => setTimeout(r, 5000));
        
        try {
            const code = await sock.requestPairingCode(cleanNumber);
            console.log(`\n\n========================`);
            console.log(`PAIRING CODE FOR 08139025363: ${code}`);
            console.log(`========================\n\n`);
        } catch (e) {
            console.log("Failed to get code:", e.message);
            hasRequestedCode = false;
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                if (!sock.authState.creds.registered) hasRequestedCode = false;
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ Ghost Bot CONNECTED for 08139025363 - Always Online Active 👻');
        }
    });
}

startBot();
