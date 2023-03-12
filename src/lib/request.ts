import * as http from "node:http";
import * as https from "node:https";
import { type resError } from "../downtube";

const protocols = { "http:": http, "https:": https };

export default function request(url: string):Promise<http.IncomingMessage> {
  let protocol = new URL(url).protocol;
  return new Promise((resolve, reject) => {
    protocols[protocol as "http:"|"https:"].get(url, (res) => {
      let err:resError = new Error();
      err.res = res;
      switch (res.statusCode) {
        case 200:
          resolve(res);
          break;
        case 301:
        case 302:
        case 303:
          if(res.headers.location)return resolve(request(res.headers.location));
          err.message = "HTTP code 303. No location provided"
          err.statusCode=303
          reject(err)
          break;
        case 403:
          err.message = "Error 403";
          err.statusCode = 403;
          reject(err);
          break;
        case 404:
          err.message = "Error 404";
          err.statusCode = 404;
          reject(err);
          break;
        default:
          resolve(res);
      }
    });
  });
}
