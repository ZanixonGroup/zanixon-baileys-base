const zn = require("zanixon.db");

function add(id, data) {
	try {
		if(!id) return `I can't create the listener cuz "id" paramater is undefined!`
		data.id = id;
		zn.set(id, data, null, "listener");
		return data;
	} catch (e) {
		return e
	}
}

function del(id) {
	try {
		if(!zn.has(id, null, "listener")) return `Can't find "${id}" id on database!`
		zn.delete(id, null, "listener");
		return true
	} catch (e) {
		return e
	}
}

function get(id) {
	try {
		if(!zn.has(id, null, "listener")) return undefined
		return zn.get(id, null, "listener");
	} catch (e) {
		return e
	}
}

module.exports = {
	add,
	get,
	del
}