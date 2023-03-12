import * as fs from "node:fs";
import { type streamingData } from "../downtube";

export default function getStreamingData(html: string): streamingData {
  let regexPlayerResponse = /ytInitialPlayerResponse = (\{.+?\});/.exec(html),
    regexInitialData = /ytInitialData = (\{.+?\});/.exec(html),
    regexJsPath = /"jsUrl":"(.+?\/base.js)"/.exec(html),
    playerResponse: any,
    initialData: any,
    jsPath: string | undefined;
  if (regexJsPath && regexInitialData && regexPlayerResponse) {
    playerResponse = JSON.parse(regexPlayerResponse[1]);
    initialData = JSON.parse(regexInitialData[1]);
    jsPath = regexJsPath[1];
    let attrib: streamingData = {
      videoAndAudio: {},
      video: {},
      audio: {},
      expires: playerResponse.streamingData.expiresInSeconds,
      title: playerResponse.videoDetails.title,
      thumbs: playerResponse.videoDetails.thumbnail.thumbnails,
      uploadDate:
        playerResponse.microformat.playerMicroformatRenderer.uploadDate,
      channel: {
        name: playerResponse.videoDetails.author,
        nameTag:
          initialData.contents.twoColumnWatchNextResults.results.results.contents
            .find((x: any) => x.videoSecondaryInfoRenderer)
            .videoSecondaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.commandMetadata.webCommandMetadata.url.slice(
              1
            ),
        id: playerResponse.videoDetails.channelId,
        url: playerResponse.microformat.playerMicroformatRenderer
          .ownerProfileUrl,
        profilePictures:
          initialData.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x: any) => x.videoSecondaryInfoRenderer
          ).videoSecondaryInfoRenderer.owner.videoOwnerRenderer.thumbnail
            .thumbnails,
      },
    };
    Object.defineProperty(attrib, "jsPath", { value: jsPath });

    if (!playerResponse.streamingData) throw emitError();

    for (let n of playerResponse.streamingData.formats) {
      attrib.videoAndAudio[n.qualityLabel] = {
        duration: Number(n.approxDurationMs),
        bitrate: n.bitrate,
        mimeType: /(.+);/.exec(n.mimeType)[1],
        codec: getSimpleCodec(n.mimeType),
        source: n.url || n.signatureCipher,
        size: getSize(n.contentLength),
      };
    }
    for (let n of playerResponse.streamingData.adaptiveFormats) {
      let media = /(.+)\//.exec(n.mimeType)[1];
      if (media == "video") {
        attrib[media][n.qualityLabel]
          ? ""
          : (attrib[media][n.qualityLabel] = {});

        attrib[media][n.qualityLabel][getSimpleCodec(n.mimeType)[0]] = {
          duration: Number(n.approxDurationMs),
          bitrate: n.bitrate,
          mimeType: /(.+);/.exec(n.mimeType)[1],
          codec: getSimpleCodec(n.mimeType),
          source: n.url || n.signatureCipher,
          size: getSize(n.contentLength),
        };
      } else {
        attrib[media][n.audioQuality]
          ? ""
          : (attrib[media][n.audioQuality] = {});
        attrib[media][n.audioQuality][
          Object.keys(attrib[media][n.audioQuality]).length
        ] = {
          duration: Number(n.approxDurationMs),
          bitrate: n.bitrate,
          mimeType: /(.+);/.exec(n.mimeType)[1],
          codec: getSimpleCodec(n.mimeType),
          source: n.url || n.signatureCipher,
          size: getSize(n.contentLength),
        };
      }
    }
    return attrib;
  }

  throw emitError();

  function emitError(): Error {
    let err = new Error(""),
      elements: { [index: string]: string | undefined } = {
         jsPath,
        initialData,
        playerResponse,
      };
    for (let n in elements) {
      if (!elements[n]) err.message += `${n} is ${elements[n]}\n`;
    }
    if (process.env.dev && JSON.parse(process.env.dev)) {
      try {
        fs.mkdirSync(module.path + "/html/");
      } catch (FSErr: any) {
        if (FSErr && FSErr.code !== "EEXIST") throw FSErr;
      }
      fs.writeFileSync(`${module.path}/html/index_${Date.now()}.html`, html);
      return err;
    } else {
      return err;
    }
  }
}

function getSimpleCodec(mimeType: string): Array<string> {
  let codec = /codecs="(.+)"/.exec(mimeType)[1].split(","),
    videoOraudio = /(.{3,4}).?/.exec(codec[0]),
    audio = /(.{3,4}).?/.exec(codec[1]);
  if (codec.length > 1) return [videoOraudio[1], audio[1]];
  return [videoOraudio[1]];
}

function getSize(totalSize: number): string | undefined {
  if (!totalSize) return;
  let size = Math.round(Number(totalSize) / (1024 * 1024));
  return size > 1 ? size + "MB" : Math.round(Number(totalSize) / 1024) + "KB";
}
