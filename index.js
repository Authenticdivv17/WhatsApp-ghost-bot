
    const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const P = require("pino")
const express = require("express")
const app = express()

// Fake server so Render no go kill am
app.get("/", (req,res)=> res.send("Ghost Invisible is Running 👻"))
app.listen(process.env.PORT || 3000)

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        auth: state,
        markOnlineOnConnect: false,
        printQRInTerminal: false
    })

    // USE PAIRING CODE - better for Render
    if (!sock.authState.creds.registered) {
        let phone = "234XXXXXXXXXX" // <--- PUT YOUR NUMBER HERE WITH 234, e.g 2348101234567
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phone)
            console.log("YOUR PAIRING CODE IS: " + code)
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)
    setInterval(()=> {
        try{ sock.sendPresenceUpdate('unavailable') }catch{}
    }, 5000)

    sock.ev.on('connection.update', ({connection}) => {
        if(connection==='open') console.log("✅ INVISIBLE ACTIVE - Deploy succeeded")
        if(connection==='close') start()
    })
}
start()
