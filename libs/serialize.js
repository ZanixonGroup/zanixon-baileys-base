/* Credits to Dika Ardianta */

require("../config.js");
const { randomId, fetchBuffer, escapeRegExp, getFile, telegra } = require("./function.js");
const { default: baileys, toBuffer, jidNormalizedUser, extractMessageContent, areJidsSameUser, downloadMediaMessage, generateForwardMessageContent, generateWAMessageFromContent, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { parsePhoneNumber } = require("libphonenumber-js");
const { fileTypeFromBuffer } = import("file-type");
const path = require("path");
const fs = require("fs");
const pino = require("pino");

function getContentType(content) {
   if (content) {
      const keys = Object.keys(content);
      const key = keys.find(k => (k === 'conversation' || k.endsWith('Message') || k.includes('V2') || k.includes('V3')) && k !== 'senderKeyDistributionMessage');
      return key
   }
}

async function Client({ zxn, store }) {
   const client = Object.defineProperties(zxn, {
      reply: {
			  async value(m, text, options = null, thumb = {}) {
			    options = options ? options : {};
			    if(!thumb?.thumbnailUrl) {
			      thumb.thumbnail = thumb?.thumbnail || fs.readFileSync(path.join(__dirname, "../", global.thumbnail.thumbnail));
			    }
			    options?.image ? options.mimetype = "image/png" : null;
			    options?.video ? options.mimetype = "video/mp4" : null;
			    options?.audio ? options.mimetype = "audio/mp4" : null;
			    options?.mimetype ? options.caption = text : options.text = text;
				  let send = await zxn.sendMessage(m.from, { contextInfo: {
					  mentionedJid: zxn.parseMention(text),
              externalAdReply: {
                title: thumb?.title || global.thumbnail.title,
                body: thumb?.body || global.thumbnail.body,
                renderLargerThumbnail: thumb?.renderLargerThumbnail || global.thumbnail.renderLargerThumbnail,
                mediaType: thumb?.mediaType || global.thumbnail.mediaType,
                sourceUrl: thumb?.sourceUrl || global.thumbnail.sourceUrl,
                ...thumb
              }
				  }, ...options }, { quoted: m, ...options })
          return send;
				}
		  },
      getName: {
         async value(jid) {
            let id = jidNormalizedUser(jid)
            if (id.endsWith("g.us")) {
               let metadata = store.groupMetadata?.[id] || await zxn.groupMetadata(id)
               return metadata.subject
            } else {
               let metadata = store.contacts[id]
               return (metadata?.name || metadata?.verifiedName || metadata?.notify || parsePhoneNumber("+" + id.split("@")[0]).format("INTERNATIONAL"))
            }
         }
      },

      sendContact: {
         async value(jid, number, quoted, options = {}) {
            let list = []
            for (let v of number) {
               if (v.endsWith("g.us")) continue
               v = v.replace(/\D+/g, "")
               list.push({
                  displayName: await zxn.getName(v + "@s.whatsapp.net"),
                  vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await zxn.getName(v + "@s.whatsapp.net")}\nFN:${await zxn.getName(v + "@s.whatsapp.net")}\nitem1.TEL;waid=${v}:${v}\nEND:VCARD`
               })
            }
            return zxn.sendMessage(jid, {
               contacts: {
                  displayName: `${list.length} Contact`,
                  contacts: list
               }
            }, { quoted, ...options })
         },
         enumerable: true
      },

      parseMention: {
         value(text) {
            return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net') || []
         }
      },

      downloadMediaMessage: {
         async value(message, filename) {
            let mime = {
               imageMessage: "image",
               videoMessage: "video",
               stickerMessage: "sticker",
               documentMessage: "document",
               audioMessage: "audio",
               ptvMessage: "video"
            }[message.type]

            if ('thumbnailDirectPath' in message.msg && !('url' in message.msg)) {
               message = {
                  directPath: message.msg.thumbnailDirectPath,
                  mediaKey: message.msg.mediaKey
               };
               mime = 'thumbnail-link'
            } else {
               message = message.msg
            }

            return await toBuffer(await downloadContentFromMessage(message, mime))
         },
         enumerable: true
      },
      
      sendMedia: {
         async value(jid, url, quoted = "", options = {}) {
            let { mime, data: buffer, ext, size } = await getFile(url)
            mime = options?.mimetype ? options.mimetype : mime
            let data = { text: "" }, mimetype = /audio/i.test(mime) ? "audio/mpeg" : mime
            if (size > 45000000) data = { document: buffer, mimetype: mime, fileName: options?.fileName ? options.fileName : `${zxn.user?.name} (${new Date()}).${ext}`, ...options }
            else if (options.asDocument) data = { document: buffer, mimetype: mime, fileName: options?.fileName ? options.fileName : `${zxn.user?.name} (${new Date()}).${ext}`, ...options }
            else if (options.asSticker || /webp/.test(mime)) {
               let pathFile = await writeExif({ mimetype, data: buffer }, { ...options })
               data = { sticker: fs.readFileSync(pathFile), mimetype: "image/webp", ...options }
               fs.existsSync(pathFile) ? await fs.promises.unlink(pathFile) : ""
            }
            else if (/image/.test(mime)) data = { image: buffer, mimetype: options?.mimetype ? options.mimetype : 'image/png', ...options }
            else if (/video/.test(mime)) data = { video: buffer, mimetype: options?.mimetype ? options.mimetype : 'video/mp4', ...options }
            else if (/audio/.test(mime)) data = { audio: buffer, mimetype: options?.mimetype ? options.mimetype : 'audio/mpeg', ...options }
            else data = { document: buffer, mimetype: mime, ...options }
            let msg = await zxn.sendMessage(jid, data, { quoted, ...options })
            return msg
         },
         enumerable: true
      }, 
      
      cMod: {
         value(jid, copy, text = '', sender = zxn.user.id, options = {}) {
            let mtype = getContentType(copy.message)
            let content = copy.message[mtype]
            if (typeof content === "string") copy.message[mtype] = text || content
            else if (content.caption) content.caption = text || content.caption
            else if (content.text) content.text = text || content.text
            if (typeof content !== "string") {
               copy.message[mtype] = { ...content, ...options }
               copy.message[mtype].contextInfo = {
                  ...(content.contextInfo || {}),
                  mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
               }
            }
            if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
            if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid
            else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid
            copy.key.remoteJid = jid
            copy.key.fromMe = areJidsSameUser(sender, zxn.user.id)
            return baileys.proto.WebMessageInfo.fromObject(copy)
         },
         enumerable: false
      },
      
      sendPoll: {
         async value(chatId, name, values, options = {}) {
            let selectableCount = options?.selectableCount ? options.selectableCount : 1
            return await zxn.sendMessage(chatId, {
               poll: {
                  name,
                  values,
                  selectableCount
               },
               ...options
            }, { ...options })
         },
         enumerable: true
      },
      
      setProfilePicture: {
         async value(jid, media, type = "full") {
            let { data } = await getFile(media)
            if (/full/i.test(type)) {
               data = await resizeImage(media, 720)
               await zxn.query({
                  tag: 'iq',
                  attrs: {
                     to: await zxn.decodeJid(jid),
                     type: 'set',
                     xmlns: 'w:profile:picture'
                  },
                  content: [{
                     tag: 'picture',
                     attrs: { type: 'image' },
                     content: data
                  }]
               })
            } else {
               data = await resizeImage(media, 640)
               await zxn.query({
                  tag: 'iq',
                  attrs: {
                     to: await zxn.decodeJid(jid),
                     type: 'set',
                     xmlns: 'w:profile:picture'
                  },
                  content: [{
                     tag: 'picture',
                     attrs: { type: 'image' },
                     content: data
                  }]
               })
            }
         },
         enumerable: true
      },

      sendGroupV4Invite: {
         async value(jid, groupJid, inviteCode, inviteExpiration, groupName, jpegThumbnail, caption = "Invitation to join my WhatsApp Group", options = {}) {
            const media = await prepareWAMessageMedia({ image: (await Function.getFile(jpegThumbnail)).data }, { upload: zxn.waUploadToServer })
            const message = proto.Message.fromObject({
               groupJid,
               inviteCode,
               inviteExpiration: inviteExpiration ? parseInt(inviteExpiration) : +new Date(new Date() + (3 * 86400000)),
               groupName,
               jpegThumbnail: media.imageMessage?.jpegThumbnail || jpegThumbnail,
               caption
            })

            const m = generateWAMessageFromContent(jid, message, { userJid: zxn.user?.id })
            await zxn.relayMessage(jid, m.message, { messageId: m.key.id })

            return m
         },
         enumerable: true
      }
   })

   return client
}

async function serialize(zxn, msg, store) {
   const m = {}

   if (!msg.message) return

   // oke
   if (!msg) return msg

   //let M = proto.WebMessageInfo
   m.message = parseMessage(msg.message)

   if (msg.key) {
      m.key = msg.key
      m.from = m.key.remoteJid.startsWith("status") ? jidNormalizedUser(m.key.participant) : jidNormalizedUser(m.key.remoteJid)
      m.fromMe = m.key.fromMe
      m.id = m.key.id
      m.device = /^3A/.test(m.id) ? 'ios' : /^3E/.test(m.id) ? 'web' : /^.{21}/.test(m.id) ? 'android' : /^.{18}/.test(m.id) ? 'desktop' : 'unknown'
      m.isBot = (m.id.startsWith("BAE5") || m.id.startsWith("HSK"))
      m.isGroup = m.from.endsWith("@g.us")
      m.participant = jidNormalizedUser(msg?.participant || m.key.participant) || false
      m.sender = jidNormalizedUser(m.fromMe ? zxn.user.id : m.isGroup ? m.participant : m.from)
   }

   if (m.isGroup) {
      m.metadata = store.groupMetadata[m.from] || await zxn.groupMetadata(m.from)
      m.groupAdmins = m.isGroup && (m.metadata.participants.reduce((memberAdmin, memberNow) => (memberNow.admin ? memberAdmin.push({ id: memberNow.id, admin: memberNow.admin }) : [...memberAdmin]) && memberAdmin, []))
      m.isAdmin = m.isGroup && !!m.groupAdmins.find((member) => member.id === m.sender)
      m.isBotAdmin = m.isGroup && !!m.groupAdmins.find((member) => member.id === jidNormalizedUser(zxn.user.id))
   }

   m.pushName = msg.pushName
   m.isOwner = m.sender && `${global.owner}`.includes(m.sender.replace(/\D+/g, ""))

   if (m.message) {
      m.type = getContentType(m.message) || Object.keys(m.message)[0]
      m.msg = parseMessage(m.message[m.type]) || m.message[m.type]
      m.mentions = [...(m.msg?.contextInfo?.mentionedJid || []), ...(m.msg?.contextInfo?.groupMentions?.map(v => v.groupJid) || [])]
      m.body = m.msg?.text || m.msg?.conversation || m.msg?.caption || m.message?.conversation || m.msg?.selectedButtonId || m.msg?.singleSelectReply?.selectedRowId || m.msg?.selectedId || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.msg?.name || ""
      m.prefix = new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]`, "gi").test(m.body) ? m.body.match(new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]`, "gi"))[0] : ""
      m.command = m.body && m.body.trim().replace(m.prefix, '').trim().split(/ +/).shift()
      m.args = m.body.trim().replace(new RegExp("^" + escapeRegExp(m.prefix), 'i'), '').replace(m.command, '').split(/ +/).filter(a => a) || []
      m.text = m.args.join(" ").trim()
      m.expiration = m.msg?.contextInfo?.expiration || 0
      m.timestamps = (typeof msg.messageTimestamp === "number") ? msg.messageTimestamp * 1000 : m.msg.timestampMs * 1000
      m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath

      m.isQuoted = false
      if (m.msg?.contextInfo?.quotedMessage) {
         m.isQuoted = true
         m.quoted = {}
         m.quoted.message = parseMessage(m.msg?.contextInfo?.quotedMessage)

         if (m.quoted.message) {
            m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0]
            m.quoted.msg = parseMessage(m.quoted.message[m.quoted.type]) || m.quoted.message[m.quoted.type]
            m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath
            m.quoted.key = {
               remoteJid: m.msg?.contextInfo?.remoteJid || m.from,
               participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
               fromMe: areJidsSameUser(jidNormalizedUser(m.msg?.contextInfo?.participant), jidNormalizedUser(zxn?.user?.id)),
               id: m.msg?.contextInfo?.stanzaId
            }
            m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid) ? m.quoted.key.participant : m.quoted.key.remoteJid
            m.quoted.fromMe = m.quoted.key.fromMe
            m.quoted.id = m.msg?.contextInfo?.stanzaId
            m.quoted.device = /^3A/.test(m.quoted.id) ? 'ios' : /^3E/.test(m.quoted.id) ? 'web' : /^.{21}/.test(m.quoted.id) ? 'android' : /^.{18}/.test(m.quoted.id) ? 'desktop' : 'unknown'
            m.quoted.isBot = (m.quoted.id.startsWith("BAE5") || m.quoted.id.startsWith("HSK"))
            m.quoted.isGroup = m.quoted.from.endsWith("@g.us")
            m.quoted.participant = jidNormalizedUser(m.msg?.contextInfo?.participant) || false
            m.quoted.sender = jidNormalizedUser(m.msg?.contextInfo?.participant || m.quoted.from)
            m.quoted.mentions = [...(m.quoted.msg?.contextInfo?.mentionedJid || []), ...(m.quoted.msg?.contextInfo?.groupMentions?.map(v => v.groupJid) || [])]
            m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ""
            m.quoted.prefix = new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]`, "gi").test(m.quoted.body) ? m.quoted.body.match(new RegExp(`^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]`, "gi"))[0] : ""
            m.quoted.command = m.quoted.body && m.quoted.body.replace(m.quoted.prefix, '').trim().split(/ +/).shift()
            m.quoted.args = m.quoted.body.trim().replace(new RegExp("^" + escapeRegExp(m.quoted.prefix), 'i'), '').replace(m.quoted.command, '').split(/ +/).filter(a => a) || []
            m.quoted.text = m.quoted.args.join(" ").trim() || m.quoted.body
            m.quoted.isOwner = m.quoted.sender && `${global.owner}`.includes(m.quoted.sender.replace(/\D+/g, ""))
         }
      }
   }

   m.reply = async (text, options = {}) => {
      if (typeof text === "string") {
         return await zxn.sendMessage(m.from, { text, ...options }, { quoted: m, ephemeralExpiration: m.expiration, ...options })
      } else if (typeof text === "object" && typeof text !== "string") {
         return zxn.sendMessage(m.from, { ...text, ...options }, { quoted: m, ephemeralExpiration: m.expiration, ...options })
      }
   }
   
   m.delete = (jid) => { 
  	if(!jid) return false;
  	zxn.sendMessage(jid, { delete: m.quoted });
  	return true;
   }
   
   m.react = (react, msg) => {
   	if(react) {
   		if(msg) {
   			zxn.sendMessage(msg.from, { react: { text: react, key: msg.key }});
   			return true;
   		} else {
   			return false;
   		}
   	} else {
   		return false;
   	}
   }
   
   m.download = async () => {
   	if(m.isQuoted == true) {
   		return await zxn.downloadMediaMessage(m.quoted);
   	} else if(m.isQuoted == false) {
   		return await zxn.downloadMediaMessage(m);
   	} else {
   		return null;
   	}
   }
   
   metadataMessage = m;
   return m
}

function parseMessage(content) {
   content = extractMessageContent(content)

   if (content && content.viewOnceMessageV2Extension) {
      content = content.viewOnceMessageV2Extension.message
   }
   if (content && content.protocolMessage && content.protocolMessage.type == 14) {
      let type = getContentType(content.protocolMessage)
      content = content.protocolMessage[type]
   }
   if (content && content.message) {
      let type = getContentType(content.message)
      content = content.message[type]
   }

   return content
}

module.exports = {
	getContentType,
	Client,
	serialize
}