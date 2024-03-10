module.exports = [{
  name: "reply",
  category: "test",
  code: async(zxn, m, { sender, listen, text, sendError }) => {
    try {
      let msg = await zxn.reply(m, `Select the menu below, reply to the message with numbers!

*Menu:*
1. fact
2. waifu
3. artificial intelligence`);
      listen.add(msg.key.id, {
        author: sender,
        session: "menu"
      })
    } catch (e) {
      sendError(e)
    }
  }
},{
  name: "auto_menu", //must be start with "auto_"
  category: "hidden",
  nonPrefix: true,
  code: async(zxn, m, { sender, listen, body, quoted, sendError }) => {
    try {
      let listener = listen.get(quoted.id);
      
      if(!listener) return;
      var { id, session, author } = listener;
      if(id !== quoted.id) return; //msgId validator
      if(session !== "menu") return; //listener validator
      if(author !== sender) return; //author msg validator, optional!
      let args = body.split("|") //optional!
      
      let msg;
      let menu = `

*Menu:*
1. fact
2. waifu
3. artificial intelligence`;
      switch (args[0]) {
        case '1':
          msg = await zxn.reply(m, `There are no daily facts today!` + menu)
          break;
        case '2':
          msg = await zxn.reply(m, `Tell me, who is your waifu?` + menu)
          break;
        case '3':
          msg = await zxn.reply(m, `Visit my rest api web on https://api.zanixon.my.id, we have a gpt 4 api and its FREE!` + menu)
          break;
        
        default:
          msg = await zxn.reply(m, `Your choice is not on the menu!` + menu)
      }
      listen.add(msg.key.id, {
        author: sender,
        session: "menu"
      })
      listen.del(quoted.id)
    } catch (e) {
      sendError(e)
    }
  }
}]