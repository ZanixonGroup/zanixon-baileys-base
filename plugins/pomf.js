const axios = require("axios");
const FormData = require("form-data");

module.exports = [{
	name: "pomf",
	code: async (media, mime) => {
		return new Promise(async (resolve, reject) => {
		    let form = new FormData()
		
		    form.append("files[]", media, `file-${Date.now()}.${mime.split("/")[1]}`)
		
		    axios.post("https://pomf.lain.la/upload.php", form, {
		      headers: {
		        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
		        ...form.getHeaders()
		      }
		    }).then(({ data }) => resolve(data.files[0].url)).catch(reject)
		  })
		}
}]