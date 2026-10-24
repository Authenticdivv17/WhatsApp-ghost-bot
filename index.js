const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        markOnlineOnConnect: true, // GHOST - Always Online
        printQRInTerminal: true,
        browser: ["Ghost Bot", "Chrome", "1.0"]
    });

    // THIS IS THE CONNECTION PART
    if (!sock.authState.creds.registered) {
        const phoneNumber = "2348139025363"; // <-- PUT YOUR WHATSAPP NUMBER HERE WITH COUNTRY CODE
        console.log("Requesting pairing code for:", phoneNumber);
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log("YOUR GHOST BOT PAIRING CODE IS: " + code);
                console.log("Go to WhatsApp > Linked Devices > Link with phone number > enter this code");
            } catch (e) {
                console.log("Error getting pairing code:", e);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Ghost Bot CONNECTED 👻 - Always Online Active!');
        }
    });
}

startBot();
