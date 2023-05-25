//Não fará mais diferenciação entre url e Sigcypher, apenas receberá o link do youtube e retornará a source. Fazer diferenciação internamente.
//No getInfo(), verificar se quando um url de uma fonte é invalido todos os outros são. 
//Fazer um callLoop no getInfo() até que a fonte seja válida.

import {
  getDecipher,
  decipher,
  getStreamingData,
  request,
  assemblyPlaylistObject,
} from "./lib/index";
import { type IncomingMessage } from "http";

export interface resError extends Error {
  res?: IncomingMessage;
  statusCode?: number;
}
export type streamingData = {
  videoAndAudio: {
    [resolution: string]: {
      bitrate: number;
      codec: string[];
      duration: number;
      mimeType: string;
      size: string | undefined;
      signatureCipher?: string;
      url?: string;
    };
  };
  video: {
    [resolution: string]: {
      [codec in "avc1" | "vp9" | "av01"]: {
        bitrate: number;
        duration: number;
        codec: string[];
        mimeType: string;
        size: string | undefined;
        signatureCipher?: string;
        url?: string;
      };
    };
  };
  audio: {
    [qualityLabel in "AUDIO_QUALITY_MEDIUM" | "AUDIO_QUALITY_LOW"]?: {
      [key: number | string]: {
        bitrate: number;
        duration: number;
        codec: string[];
        mimeType: string;
        size: string | undefined;
        signatureCipher?: string;
        url?: string;
      };
    };
  };
  channel: {
    name: string;
    nameTag: string;
    id: string;
    url: string;
    profilePictures: Array<{ url: string; width: number; height: number }>;
  };
  expires: string;
  jsPath: string;
  thumbs: Array<{ url: string; width: number; height: number }>;
  title: string;
  uploadDate: string;
};
export type simpleContent = {
  title: string;
  id: string;
  url: string;
  thumbs: Array<{ url: string; width: number; height: number }>;
  duration: {
    long: string;
    short: string;
  };
};
export type playlist = {
  title: string;
  simpleContents: Array<simpleContent>;
  playlistId: string;
  channel: {
    name: string;
    nameTag: string;
    id: string;
    url: string;
    profilePictures: Array<{ url: string; width: number; height: number }>;
  };
  isInfinity?: boolean;
  playlistShareUrl: string;
};
export type methodsType = {
  a: (a: string[]) => void;
  b: (a: string[], b: number) => void;
  c: (a: string[], b: number) => void;
};
export type deciphersType = ((methods: methodsType, sig: string) => string)[];

export class Downtube {
  constructor() {}
  resolvePlaylist(url: string): Promise<playlist> {
    return new Promise((resolve, reject) => {
      if (url.indexOf("//music.") != -1) url = url.split("music.").join("");
      request(url)
        .then((res) => {
          let html = "";
          res.on("data", (data) => {
            html += data.toString();
          });
          res.on("end", () => {
            resolve(assemblyPlaylistObject(html));
          });
        })
        .catch(reject);
    });
  }
  search(searchTerm: string): Promise<simpleContent[]> {
    return new Promise((resolve, reject) => {
      let apiUrl = `https://www.youtube.com/results?search_query=${searchTerm.replace(
        / +/g,
        "+"
      )}`;
      request(apiUrl)
        .then((res) => {
          let html = "";
          res.on("data", (data) => (html += data.toString()));
          res.on("end", () => {
            let regexHtmlSearch = /ytInitialData = (\{.+?\});/.exec(html);
            if (!regexHtmlSearch)
              return reject(new Error("regexParsed is " + regexHtmlSearch));

            return resolve(
              JSON.parse(regexHtmlSearch[1])
                .contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents.find(
                  (x: any) => x.itemSectionRenderer
                )
                .itemSectionRenderer.contents.filter(
                  (x: any) =>
                    x.videoRenderer &&
                    !(
                      x.videoRenderer.badges &&
                      x.videoRenderer.badges.find(
                        (y: any) =>
                          y.metadataBadgeRenderer.icon &&
                          y.metadataBadgeRenderer.icon.iconType == "LIVE"
                      )
                    )
                )
                .map((x: any): simpleContent => {
                  return {
                    title: x.videoRenderer.title.runs[0].text,
                    id: x.videoRenderer.videoId,
                    url:
                      "https://www.youtube.com/watch?v=" +
                      x.videoRenderer.videoId,
                    thumbs: x.videoRenderer.thumbnail.thumbnails,
                    duration: {
                      short: x.videoRenderer.lengthText.simpleText,
                      long: x.videoRenderer.lengthText.accessibility
                        .accessibilityData.label,
                    },
                  };
                })
            );
          });
        })
        .catch(reject);
    });
  }
  getInfo(url: string): Promise<streamingData> {
    return new Promise((resolve, reject) => {
      let parsedUrl = new URL(url),
        hosts = [
          "www.youtube.com",
          "youtube.com",
          "youtu.be",
          "music.youtube.com",
        ];
      if (hosts.indexOf(parsedUrl.hostname) == -1)
        return reject(
          new Error(
            "Essa aplicação não suporta outras fontes de mídia além do https://www.youtube.com"
          )
        );
      request(url).then((res) => {
        let html = "",
          info: streamingData;
        res.on("data", (data) => {
          html += data.toString();
        });
        res.on("end", () => {
          try {
            info = getStreamingData(html);
          } catch (err) {
            return reject(err);
          }

          resolve(info);
        });
      });
    });
  }

  
}
