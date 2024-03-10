const fs = require("fs");
const zn = require('zanixon.db');
const colors = require("colors");
const moment = require("moment-timezone");
const path = require("path");
require('dotenv').config();

//custom colors for beautiful console.log()
colors.setTheme({
   main: ['brightBlue', 'bold'],
   silly: 'rainbow',
   input: 'grey',
   verbose: 'cyan',
   prompt: 'grey',
   info: 'green',
   data: 'grey',
   help: 'cyan',
   warn: 'yellow',
   debug: 'blue',
   error: 'brightRed'
});

zn.storageInit({
	dir: "./database"
})

zn.storage({
		"user": "users.json",
    "cooldown":"cooldown.json",
    "config":"config.json",
    "commands": "commands.json",
    "listener": "listener_session.json"
});

zn.variables({
    public: true,
    stickerPackname: "s.id/znxnbot",
    stickerAuthor: "© ZanixonMD",
    menuImage: "https://pomf2.lain.la/f/z2o65gj.png",
    owner: ["6285697103902"],
}, "config");


zn.regEmoji({
    //notif
    "success":"✅",
    "failed":"❌",
    "alert":"❗",
    "warn":"⚠️",
    "error":"🚨",
    "wait":"⏱️"
});


// config
global.bot = "62856971039021"
global.botName = "ZanixonMD | Whatsapp Bot"
global.owner = ["6285697103902"]
global.tmp = "/tmp"

global.options = {
    public: zn.get("public", null, "config", true)
}

let year = moment().tz('Asia/Jakarta').format('YYYY');
global.thumbnail = {
  title: "ZanixonMD | Whatsapp Bot",
  body: `Copyright © Zanixon Group ${year} - All right reserved`,
  thumbnail: "./zanixon/zanixonmd.png",
  mediaType: 1,
  previewType: 0,
  renderLargerThumbnail: false,
  sourceUrl: `https://trakteer.id/zanixongroup`
}

global.api = {
	botcahx: {
		base: "https://api.botcahx.live/api/",
		key: process.env.BOTCAHX
	},
	znapi: {
	  base: "https://api.zanixon.xyz/api/",
	  key: process.env.ZNAPI
	}
}

global.mess = (type, m) => {
    let msg = {
        owner: `${zn.emoji("alert")}︱Perintah ini hanya dapat digunakan oleh Owner!`,
        group: `${zn.emoji("alert")}︱Perintah ini hanya dapat digunakan di group!`,
        private: `${zn.emoji("alert")}︱Perintah ini hanya dapat digunakan di private chat!`,
        admin: `${zn.emoji("alert")}︱Perintah ini hanya dapat digunakan oleh admin group!`,
        botAdmin: `${zn.emoji("alert")}︱Bot bukan admin, jadi bot tidak dapat mengakses fitur tersebut`,
        bot: `${zn.emoji("warn")}︱Fitur ini hanya dapat diakses oleh Bot`,
        dead: `${zn.emoji("alert")}︱Fitur ini sedang dimatikan!`,
        media: `${zn.emoji("alert")}︱Reply media nya`,
        error: `${zn.emoji("failed")}︱Gagal saat memproses permintaan!`,
        premium: `${zn.emoji("alert")}︱Fitur ini khusus user premium!\n\nMinat jadi pengguna premium? cek keuntungan nya dengan ketik *.premium*`,
        limit: `${zn.emoji("alert")}︱Limit kamu telah habis untuk melakukan request command ini!`,
        nsfw: `${zn.emoji("alert")}︱Command *Nsfw* dalam mode *Off* di chat ini!`,
        cs: `${zn.emoji("alert")}︱Hubungi customer service kami untuk info lebih lanjut, ketik .cs atau .customerservice pada bot!`
    }[type]
    if (msg) return m.reply(msg)
}