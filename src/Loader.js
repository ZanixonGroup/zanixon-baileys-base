require("../config.js");
const glob = require("glob");
const path = require("path");
const zn = require("zanixon.db");

// commands loader 
const Commands = new Map();
exports.loadCommands = (dirCmd, log = true) => {
    let dir = path.join(__dirname, "..", dirCmd);
    let rawcategory = new Set();
    let listcategory = [];
    let listCommand = {};
    try {
        let files = glob.sync(`${dir}/**/*.js`);
        log ? console.log("Starting to load all commands...".main) : null;
        let cmdCount = 0;
        files.forEach((file) => {
             const cmdData = require(file); 
             let cmdNum = cmdData.length;
             let cmdNow = 0;
             if(!Array.isArray) return;
             while(cmdNum > cmdNow) {
            		 const command = cmdData[cmdNow];
            		 cmdNow++
		             let groups = command.category;
		             groups = groups === '' ? '_' : groups;
		             listCommand[groups] = listCommand[groups] || [];
		             cmdCount++;
		             let options = {
		                 name: command.name ? command.name : "auto",
		                 aliases: command.aliases ? command.aliases : [],
		                 details: command.details ? command.details : {
		                     desc: "none",
		                     usage: "none"
		                 },
		                 cooldown: command.cooldown ? command.cooldown : {
		                     duration: 10,
		                     msg: "︱Tunggu *{sec} detik* untuk memanggil perintah bot lagi!",
		                     emoji: "wait"
		                 },
		                 disable: command.disable ? command.disable : { status: false, msg: "︱This command is on disable mode!", emoji: "alert" },
		                 category: command.category ? command.category : "others",
		                 isMedia: command.isMedia ? command.isMedia : false,
		                 isNsfw: command.isNsfw ? command.isNsfw : false,
		                 isOwner: command.isOwner ? command.isOwner : false,
		                 isGroup: command.isGroup ? command.isGroup : false,
		                 isPrivate: command.isPrivate ? command.isPrivate : false,
		                 isBotAdmin: command.isBotAdmin ? command.isBotAdmin : false,
		                 isAdmin: command.isAdmin ? command.isAdmin : false,
		                 isBot: command.isBot ? command.isBot : false,
		                 isPremium: command.isPremium ? command.isPremium : false,
		                 isLimit: command.isLimit ? command.isLimit : false,
		                 isQuery: command.isQuery ? command.isQuery : false,
		                 isRegistered: command.isRegistered ? command.isRegistered : false,
		                 nonPrefix: command.nonPrefix ? command.nonPrefix : false,
		                 code: command.code ? command.code : () => {},
		                 location: file
		             }
		             listCommand[groups].push(options)
		             Commands.set(options.name, options)
		             //Commands.category = command.filter(v => v !== "_").map(v => v);
		             const thecategory = command.category ? command.category : "others";
		             if(!rawcategory.has(thecategory)) {
		                 rawcategory.add(thecategory);
		                 listcategory.push(thecategory);
		             }
		             //global.reloadFile(file)
		             // block this code below to hide loaded command logs 
		             //log ? console.log("ZanixonMD:".zanixon, `Loaded ${options.name}`.warn, `\n➭ status: ${options.disable.active ? "Disable 🔴" : "Active 🟢"}\n➭ category: ${groups}\n➭ Location: ${file.replace(__dirname, "")}`.debug, `\n・------------------------------------------`.info) : null;
             }
        })
        zn.set("commandCount", cmdCount, null, null, true);
        log ? console.log(`Success load ${cmdCount} commands from "${dirCmd}" directory`.info, `\n・------------------------------------------`) : null;
    } catch(e) {
    	console.log(e)
    }
    zn.set("list", listCommand, null, "commands", true);
    zn.set("category", listcategory, null, "commands", true)
    Commands.list = zn.get("list", null, "commands", true);
    Commands.category = zn.get("category", null, "commands", true);
    return Commands;
}

// plugin loader 
const Plugins = new Map();
exports.loadPlugins = (dirPlugins, log = true) => {
    let dir = path.join(__dirname, "..", dirPlugins);
    let listPlugin = {};
    try {
        let files = glob.sync(`${dir}/**/*.js`);
        log ? console.log("Starting to load all plugins...".main) : null;
        let pluginCount = 0;
        files.forEach((file) => {
             const pluginData = require(file);
             let pluginNum = pluginData.length;
             let pluginNow = 0;
             while(pluginNum > pluginNow) {
            		 let plugin = pluginData[pluginNow];
            		 let disable = plugin.disable ? plugin.disable : false;
            		 pluginNow++;
            		 if(disable) return;
		             let groups = "all";
		             groups = groups === '' ? '_' : groups;
		             listPlugin[groups] = listPlugin[groups] || [];
		             pluginCount++;
		             let options = {
		                 name: plugin.name ? plugin.name : "auto",
		                 aliases: plugin.aliases ? plugin.aliases : [],
		                 details: plugin.details ? plugin.details : {
		                     desc: "none",
		                     usage: "none"
		                 },
		                 disable: plugin.disable ? plugin.disable : { status: false, msg: "This plugin is on disable mode!" },
		                 code: plugin.code ? plugin.code : () => {},
		                 location: file
		             }
		             Plugins.set(options.name, options)
		             // block this code below to hide loaded command logs 
		             //log ? console.log("ZanixonMD:".zanixon, `Loaded ${options.name}`.warn, `\n➭ status: ${options.disable.active ? "Disable 🔴" : "Active 🟢"}\n➭ Location: ${file.replace(__dirname, "")}`.debug, `\n・------------------------------------------`.info) : null;
             }
        })
        zn.set("pluginCount", pluginCount, null, null, true);
        log ? console.log(`Success load ${pluginCount} plugins from "${dirPlugins}" directory`.info, `\n・------------------------------------------`) : null;
    } catch(e) {
        console.error("Something error at plugins:", e) 
    }
    return Plugins;
}

exports.commands = async() => {
	return Commands;
}

exports.plugins = async() => {
		const sortedPlugins = [...Plugins.values()].sort((a, b) => a.name.localeCompare(b.name));
		const plugins = { ...sortedPlugins.reduce((acc, v) => ({ ...acc, [v.name]: v.code }), {}) };
		return plugins;
}