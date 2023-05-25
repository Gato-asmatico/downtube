import {decipher,createNewDecipher,request} from "./index"
function resolveSource(signatureCipher: string, jsPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let sig: any = {},
        source: string,
        jsUrl = "https://www.youtube.com" + jsPath;
      for (let n of signatureCipher.split("&")) {
        let a = n.split("=");
        sig[a[0]] = decodeURIComponent(a[1]);
      }
      let decipherResponse = decipher(sig.s);
      if ("deciphers" in decipherResponse) {
        request(jsUrl)
          .then((res) => {
            let basejs = "";
            res.on("data", (data) => {
              basejs += data.toString();
            });
            res.on("end", () => {
              let newDecipher;
              try {
                newDecipher = createNewDecipher(basejs, decipherResponse.deciphers);
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
  module.exports = resolveSource