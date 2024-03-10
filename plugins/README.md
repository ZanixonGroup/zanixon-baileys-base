# Plugins 
This plugin serves to create a module or function efficiently, neatly and structured. With plugins you don't need to export functions manually because each plugin will be exported automatically into the command, all you need to do is import it so this feature makes it easier to share functions and others.

## Setup plugins loader
```js
const { loadPlugins } = require("./src/Loader.js");
const Plugins = await loadPlugins("plugins", true);

/*
@param dirPath: directory path where all commands are located
@param log: To stop displaying loader logs
*/
```

## Make new plugin for yourself 
You can use base plugin below to make your new plugin
```js
module.exports = [{
	name: "pluginName",
	details: {
		desc: "Plugin description",
		usage: "How to usage the plugin"
	},
	disable: boolean,
	code: async() => {
		// your code here
		return null;
	}
}]
```
You can also create more than 1 plugin in 1 file!
```js
module.exports = [{
	name: "pluginName1",
	details: {
		desc: "Plugin description",
		usage: "How to usage the plugin"
	},
	disable: boolean,
	code: async() => {
		// your code here
		return null;
	}
},{
	name: "pluginName2",
	details: {
		desc: "Plugin description",
		usage: "How to usage the plugin"
	},
	disable: boolean,
	code: async() => {
		// your code here
		return null;
	}
}]
```

## Plugins output
The plugins output i'll be like this
```js
{ funcName: [AsyncFunction: code] }
```