const axios = require("axios");
const FormData = require("form-data");

module.exports = [{
	name: "telegraph",
	code: async (media, mime) => {
	  return new Promise(async (resolve, reject) => {
	  	mime = { mime, ext: `${mime.split("/")[1]}` }
	    let form = new FormData()
	
	    form.append("file", media, `file-${Date.now()}.${mime.ext}`)
	
	    axios.post("https://telegra.ph/upload", form, {
	      headers: {
	        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
	        ...form.getHeaders()
	      }
	    }).then(({ data }) => resolve("https://telegra.ph" + data[0].src)).catch(reject)
	  })
	}
}]