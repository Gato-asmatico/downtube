import * as fs from "node:fs";
import { type methodsType, deciphersType } from "../downtube";
const methods: methodsType = {
    a: function (a: string[]) {
      a.reverse();
    },
    b: function (a: string[], b: number) {
      a.splice(0, b);
    },
    c: function (a: string[], b: number) {
      var c = a[0];
      a[0] = a[b % a.length];
      a[b % a.length] = c;
    },
  },
  deciphers: deciphersType = JSON.parse(
    fs.readFileSync(module.path + "/deciphers.json", "utf-8")
  ).map((x: string) => {
    return new Function(
      ...x.slice(x.indexOf("(") + 1, x.indexOf(")")).split(","),
      x.slice(x.indexOf("{") + 1, x.indexOf("}"))
    );
  });
export default function decipher(sig: string): { deciphed: string } | {deciphers:deciphersType} {
  for (let n of deciphers) {
    let deciphed = n(methods, sig);
    if (deciphed.startsWith("AOq0QJ8")) return { deciphed };
  }
  if (process.env.dev && JSON.parse(process.env.dev)) {
    try {
      fs.mkdirSync(module.path + "/sigs/");
    } catch (FSErr: any) {
      if (FSErr && FSErr.code !== "EEXIST") throw FSErr;
    }
    fs.writeFileSync(`${module.path}/sigs/sig_${Date.now()}.txt`, sig);
  }
  return { deciphers };
}
