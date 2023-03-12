const {
  decipher,
  getStreamingData,
  getDecipher,
  request,
} = require("./lib/index.cjs");
module.exports = class downtube {
  #jsUrl;
  constructor() {}

  
  /**
   * @typedef {import("./lib/getStreamingData.cjs").streamingData} streamingDataType
   * @param {string} url
   * @returns {Promise<streamingDataType>}
   */
  getInfo(url) {
    return new Promise((resolve, reject) => {
      let parsedUrl = new URL(url);
      let host = [
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
        "music.youtube.com",
      ];
      if (
        host.indexOf(parsedUrl.hostname) === -1 ||
        host.indexOf(parsedUrl.host) === -1
      )
        reject(
          new Error(
            "Essa aplicação não suporta outras fontes de mídia além do https://www.youtube.com"
          )
        );
      request(url).then((res) => {
        let html = "",
          info;
        res.on("data", (data) => {
          html += data.toString();
        });
        res.on("end", () => {
          try {
            info = getStreamingData(html);
          } catch (err) {
            return reject(err);
          }
          this.#jsUrl = "https://www.youtube.com" + info.jsUrl;
          resolve(info);
        });
      });
    });
  }
  /**
   *
   * @param {string} sigCipherOrUrl
   * @returns {Promise<string>}
   */
  getSource(sigCipherOrUrl) {
    return new Promise((resolve, reject) => {
      if (sigCipherOrUrl.startsWith("http")) return resolve(sigCipherOrUrl);
      let sig = {},
        source;
      for (let n of sigCipherOrUrl.split("&")) {
        let a = n.split("=");
        sig[a[0]] = decodeURIComponent(a[1]);
      }
      let decipherResponse = decipher(sig.s);
      if (!decipherResponse.resolved) {
        request(this.#jsUrl)
          .then((res) => {
            let basejs = "";
            res.on("data", (data) => {
              basejs += data.toString();
            });
            res.on("end", () => {
              let newDecipher;
              try {
                newDecipher = getDecipher(basejs, decipherResponse.deciphers);
              } catch (err) {
                return reject(err);
              }
              source = `${sig.url}&sig=${encodeURIComponent(
                newDecipher.main(sig.s)
              )}`;
              request(source)
                .then((x) => {
                  x.destroy();
                  resolve(source);
                })
                .catch(reject);
            });
          })
          .catch(reject);
      } else {
        source = `${sig.url}&sig=${encodeURIComponent(
          decipherResponse.deciphed
        )}`;
        request(source)
          .then((x) => {
            x.destroy();
            resolve(source);
          })
          .catch(reject);
      }
    });
  }
  /**
   * @param {string} string
   * @returns {object}
   */
  resolveEscapeCodes(string) {
    return string.replace(/\\x([0-9A-Fa-f]{2})/g, function () {
      return String.fromCharCode(parseInt(arguments[1], 16));
    });
  }
};
