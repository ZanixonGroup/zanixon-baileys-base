require("./config.js");
require("dotenv").config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { serialize, Client } = require("./libs/serialize.js");
const { loadCommands, loadPlugins } = require("./src/Loader.js");
const Pino = require("pino");
const { Boom } = require("@hapi/boom");
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const zn = require("zanixon.db");
const util = require("util");
const axios = require('axios');
const chokidar = require("chokidar");
const moment = require("moment-timezone");

const isPairing = process.argv.includes("--pairing");

const store = makeInMemoryStore({ logger: Pino({ level: "fatal" }).child({ level: "fatal" }) })

let Commands;
let Plugins;
let plugins;
let timeout = 0;
async function start() { 
    Commands = await loadCommands("commands", true);
    Plugins = await loadPlugins("plugins", true);
    const auth = await useMultiFileAuthState("session");
    const zxn = makeWASocket({
        printQRInTerminal: !isPairing,
        browser: isPairing
            ? [ "Ubuntu", "Chrome", "20.0.04" ]
            : [ "Ubuntu", "Chrome", "20.0.04" ],
        auth: auth.state,
        logger: Pino({ level: "fatal" }).child({ level: "fatal" })
    });
    store.bind(zxn.ev);
    zxn.ev.on("contacts.update", (update) => {
    	for(let contact of update) {
    		let id = jidNormalizedUser(contact.id);
    		if(store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    	}
    });
    await Client({ zxn, store });
    
    if (isPairing && !zxn.authState.creds.registered) {
        const botNumber = global.bot;
        setTimeout(async function () {
        		console.log("ZanixonMD".main, ">>", `Login using number: +${botNumber}`.warn)
            const pairingCode = await zxn.requestPairingCode(botNumber);
            console.log("ZanixonMD".main, ">>", "Your pairing code: ".info, pairingCode.brightBlue);
        }, 30000);
    }
    
    zxn.ev.on("creds.update", auth.saveCreds);
    zxn.ev.on("connection.update", async (update) => {
    	const { lastDisconnect, connection, qr } = update
      	if (connection) {
        	console.info("ZanixonMD".main, ">>", `Connection Status : ${connection}`.info)
    		}
    	
    	if(timeout > 10) {
    		console.log("ZanixonMD".main, ">>", `Program stopped after 10 times reconnecting!`.warn);
    		return process.exit(1)
    	}
    	if (connection === "close") {
      	let reason = new Boom(lastDisconnect?.error)?.output.statusCode
        if (reason === DisconnectReason.badSession) {
        	console.log("ZanixonMD".main, ">>", `Bad Session File, Please Delete Session and Scan Again`.warn)
          process.exit(0)
        } else if (reason === DisconnectReason.connectionClosed) {
        	timeout++
          console.log("ZanixonMD".main, ">>", "Connection closed, reconnecting....".warn)
          await start()
        } else if (reason === DisconnectReason.connectionLost) {
        	timeout++
          console.log("ZanixonMD".main, ">>", "Connectionn Lost from Server, reconnecting...".warn)
          await start()
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log("ZanixonMD".main, ">>", "Connection Replaced, Another New Session Opened, Please Close Current Session First".warn)
          process.exit(1)
        } else if (reason === DisconnectReason.loggedOut) {
          console.log("ZanixonMD".main, ">>", `Device Logged Out, Please Scan Again And Run.`.warn)
          process.exit(1)
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("ZanixonMD".main, ">>", "Restart Required, Restarting...".warn)
          await start()
        } else if (reason === DisconnectReason.timedOut) {
          console.log("ZanixonMD".main, ">>", "Connection TimedOut, Reconnecting...".warn)
          process.exit(0)
        } else if (reason === DisconnectReason.multideviceMismatch) {
          console.log("ZanixonMD".main, ">>", "Multi device mismatch, please scan again".warn)
          process.exit(0)
        } else {
          timeout++
          console.log("ZanixonMD".main, ">>", reason.warn)
          await start()
        }
     }

     if (connection === "open") {
     		console.log("ZanixonMD".main, ">>", `Client connected on: ${zxn?.user?.id.split(":")[0] || global.bot}`.info);
        zxn.sendMessage(global.owner[0] + "@s.whatsapp.net", {
          text: `${zxn?.user?.name || "ZanixonMD"} has Connected...`,
        })
      }
    })
    zxn.ev.on("messages.upsert", async ({ messages }) => {
          let m = await serialize(zxn, messages[0], store);
          if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) store.groupMetadata = await zxn.groupFetchAllParticipating()
          
        try {
          //console.log(Commands, Plugins)
          if(!m) return;
          const sortedPlugins = [...Plugins.values()].sort((a, b) => a.name.localeCompare(b.name));
		      plugins = { ...sortedPlugins.reduce((acc, v) => ({ ...acc, [v.name]: v.code }), {}) };
          require("./handler.js")(zxn, m, store, Commands, plugins)
        } catch (e) {
                console.log("Error at msg reader:", e)
        }
    });

    zxn.ev.on("call", async(json) => {
    	for(const id of json) {
    		if(id.status == "offer") {
    			if(id.isGroup == false) {
    				await zxn.sendMessage(id.from, {
    					text: `⚠️︱Your call rejected automaticaly!`, 
							mentions: [id.from]
    				});
    				await zxn.rejectCall(id.id, id.from);
    			} else {
    				await zxn.rejectCall(id.id, id.from);
    			}
    		}
    	}
    });
}

try {
  start();
} catch(e) {
  console.log("Error log was successfully saved!");
}
module.exports = {
	Commands,
	plugins
}