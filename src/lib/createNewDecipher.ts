import * as fs from "node:fs";
import { type methodsType } from "../downtube";

export default function createNewDecipher(
  basejs: string,
  deciphers: ((methods: methodsType, sig: string) => string)[]
) {
  let RegexMain = /(function\(a\)\{a=a\.split\(""\).+\})/.exec(basejs),
    main: string | undefined,
    RegexMethodsSearch: RegExpExecArray | null,
    methodsSearch: string | undefined,
    RegexMethods: RegExpExecArray | null,
    methods: string | undefined,
    result: {
      [method: string]:
        | {
            [methodName: string]: (a: string[], b?: number) => void;
          }
        | ((a: string) => string);
    } = {};
  if (RegexMain) {
    main = RegexMain[1];
    RegexMethodsSearch = /;(.+?)\./.exec(main);
    if (RegexMethodsSearch) {
      methodsSearch = RegexMethodsSearch[1];
      result.main = new Function(
        ...main.slice(main.indexOf("(") + 1, main.indexOf(")")).split(","),
        main
          .slice(main.indexOf("{") + 1, main.indexOf("}"))
          .replace(new RegExp(methodsSearch, "g"), `this.${methodsSearch}`)
      );
      RegexMethods = new RegExp(
        `(${methodsSearch}=\{.+[\r\n]*.+[\r\n]*.+?\});`
      ).exec(basejs);
      if (RegexMethods) {
        methods = RegexMethods[1].replace(/\r?\n/g, "");
        methods = methods.slice(
          methods.indexOf("=") + 2,
          methods.lastIndexOf("}")
        );
        result[methodsSearch] = {};
        for (let n of methods.split(/(?<=}),/)) {
          let splitedN = n.split(":"),
            newFuncArgs: string[] = splitedN[1]
              .slice(splitedN[1].indexOf("(") + 1, splitedN[1].indexOf(")"))
              .split(",");

          result[methodsSearch][splitedN[0]] = new Function(
            ...newFuncArgs,
            splitedN[1].slice(
              splitedN[1].indexOf("{") + 1,
              splitedN[1].indexOf("}")
            )
          );
        }
        updateDeciphers(RegexMethods[1], main, methodsSearch, deciphers);
        return result;
      }
    }
  }
  let err = new Error(""),
    elements: { [index: string]: string | undefined } = {
      main,
      methodsSearch,
      methods,
    };
  for (let n in elements) {
    if (!elements[n]) err.message += `${n} is ${elements[n]}\n`;
  }
  if (process.env.dev && JSON.parse(process.env.dev)) {
    try {
      fs.mkdirSync(module.path + "/basejs/");
    } catch (FSErr: any) {
      if (FSErr && FSErr.code !== "EEXIST") throw FSErr;
    }
    fs.writeFileSync(`${module.path}/basejs/base_${Date.now()}.js`, basejs);
    throw err;
  } else {
    throw err;
  }
}

function updateDeciphers(
  rawMethods: string,
  main: string,
  methodsSearch: string,
  deciphers: ((sig: string) => string)[]
): void {
  let a = /[\{\s](.+):function\(a\)\{a.reverse\(\)\}/.exec(rawMethods),
    b = /[\{\s](.+):function\(a,b\)\{a.splice\(0,b\)\}/.exec(rawMethods),
    c =
      /[\{\s](.+):function\(a,b\)\{var c=a\[0\];a\[0\]=a\[b%a.length\];a\[b%a.length\]=c\}/.exec(
        rawMethods
      );
  if (a && b && c) {
    let replace = [
        {
          a: a[1],
          b: "a",
        },
        {
          a: b[1],
          b: "b",
        },
        {
          a: c[1],
          b: "c",
        },
      ],
      stringMain = main.replace(new RegExp(methodsSearch, "g"), "methods");
    for (let n of replace) {
      stringMain = stringMain.replace(new RegExp(n.a, "g"), n.b);
    }

    deciphers.push(
      new Function(
        "methods",
        ...stringMain
          .slice(stringMain.indexOf("(") + 1, stringMain.indexOf(")"))
          .split(","),
        stringMain
          .slice(stringMain.indexOf("{") + 1, stringMain.indexOf("}"))
          .replace(new RegExp(methodsSearch, "g"), `this.${methodsSearch}`)
      )
    );
    fs.writeFile(
      module.path + "/deciphers.json",
      JSON.stringify(deciphers.map((x) => x.toString().replace(/\r?\n/g, ""))),
      (err) => {
        if (err) throw err;
      }
    );
    return;
  }
}
