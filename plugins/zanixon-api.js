require("../config.js");
require('dotenv').config();
const axios = require("axios");
const path = require("path");
const { getFile, telegra, pomf } = require("../libs/function.js");
const { base, key } = global.api.znapi;
let apikey = key || process.env.ZNAPI;

module.exports = [{
  name: "enhance",
  code: async (buffer) => {
    try {
      if (!buffer) return { status: false, message: "Invalid buffer!" };
      const url = await telegra(buffer, "image/png");
      const enhanced = await axios.get(`${base}ai/enhance?apikey=${apikey}&url=${url}`, { responseType: "arraybuffer" });
      return enhanced.data;
    } catch (e) {
      return { status: false, message: e.message || "An error occurred." };
    }
  }
}];