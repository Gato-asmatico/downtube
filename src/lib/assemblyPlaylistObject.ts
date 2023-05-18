import { type playlist, simpleContent } from "../downtube";
import * as fs from "node:fs";

export default function assemblyPlaylistObject(html: string): playlist {
  try {
    let regexHtmlPlaylist = /ytInitialData = (\{.+?\});/.exec(html);
    if (!regexHtmlPlaylist)
      throw new Error("regexHtmlPlaylist is " + regexHtmlPlaylist);

    let htmlPlaylist = JSON.parse(regexHtmlPlaylist[1]);
    if (htmlPlaylist.contents.twoColumnWatchNextResults) {
      let playlist =
          htmlPlaylist.contents.twoColumnWatchNextResults.playlist.playlist,
        title = playlist.title,
        isInfinity = playlist.isInfinity,
        playlistId = playlist.playlistId,
        playlistShareUrl =
          "https://www.youtube.com/playlist?list=" + playlistId,
        channelInfos =
          htmlPlaylist.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x: any) => x.videoSecondaryInfoRenderer
          ).videoSecondaryInfoRenderer.owner.videoOwnerRenderer,
        channel = {
          name: channelInfos.title.runs[0].text,
          nameTag:
            channelInfos.title.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl.slice(
              1
            ),
          id: channelInfos.title.runs[0].navigationEndpoint.browseEndpoint
            .browseId,
          url: "",
          profilePictures: channelInfos.thumbnail.thumbnails,
        },
        simpleContents: simpleContent[] = playlist.contents
          .filter((x: any) => x.playlistPanelVideoRenderer)
          .map((x: any): simpleContent => {
            return {
              title: x.playlistPanelVideoRenderer.title.simpleText,
              id: x.playlistPanelVideoRenderer.videoId,
              url:
                "https://www.youtube.com/watch?v=" +
                x.playlistPanelVideoRenderer.videoId,
              thumbs: x.playlistPanelVideoRenderer.thumbnail.thumbnails,
              duration: {
                long: x.playlistPanelVideoRenderer.lengthText.accessibility
                  .accessibilityData.label,
                short: x.playlistPanelVideoRenderer.lengthText.simpleText,
              },
            };
          });

      channel.url = "https://www.youtube.com/" + channel.id;
      return {
        title,
        isInfinity,
        playlistId,
        playlistShareUrl,
        channel,
        simpleContents,
      };
    } else {
      let title = htmlPlaylist.header.playlistHeaderRenderer.title.simpleText,
        playlistId = htmlPlaylist.header.playlistHeaderRenderer.playlistId,
        playlistShareUrl =
          "https://www.youtube.com/playlist?list=" + playlistId,
        channelInfo =
          htmlPlaylist.header.playlistHeaderRenderer.ownerText.runs[0],
        profilePictures =
          htmlPlaylist.sidebar.playlistSidebarRenderer.items.find(
            (x: any) => x[Object.keys(x)[0]].videoOwner
          ),
        simpleContents: Array<simpleContent> =
          htmlPlaylist.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents
            .filter((x: any) => x.playlistVideoRenderer)
            .map((x: any) => {
              x = x.playlistVideoRenderer;
              return {
                title: x.title.runs[0].text,
                id: x.videoId,
                url: "https://www.youtube.com/watch?v=" + x.videoId,
                thumbs: x.thumbnail.thumbnails,
                duration: {
                  long: x.lengthText.accessibility.accessibilityData.label,
                  short: x.lengthText.simpleText,
                },
              };
            });

      profilePictures =
        profilePictures[Object.keys(profilePictures)[0]].videoOwner
          .videoOwnerRenderer.thumbnail.thumbnails;

      let channel = {
        name: channelInfo.text,
        nameTag:
          channelInfo.navigationEndpoint.browseEndpoint.canonicalBaseUrl.slice(
            1
          ),
        id: channelInfo.navigationEndpoint.browseEndpoint.browseId,
        url:
          "https://www.youtube.com/channel/" +
          channelInfo.navigationEndpoint.browseEndpoint.browseId,
        profilePictures,
      };
      return { channel, title, playlistId, playlistShareUrl, simpleContents };
    }
  } catch (err) {
    if (process.env.dev && JSON.parse(process.env.dev)) {
      try {
        fs.mkdirSync(module.path + "/html/");
      } catch (FSErr: any) {
        if (FSErr && FSErr.code !== "EEXIST") throw FSErr;
      }
      fs.writeFileSync(`${module.path}/html/assemblyPlaylistObject_${Date.now()}.html`, html);
      throw err;
    } else {
      throw err;
    }
  }
}
