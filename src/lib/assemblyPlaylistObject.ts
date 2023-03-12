import { type playlist, simpleContent } from "../downtube";

export default function assemblyPlaylistObject(
  regexHtmlPlaylist: RegExpExecArray
): playlist {
  if (regexHtmlPlaylist[1].startsWith("\\")) {
    let htmlPlaylist = JSON.parse(resolveHexCodes(regexHtmlPlaylist[1]));
    let title =
        htmlPlaylist.header.musicDetailHeaderRenderer.title.runs[0].text,
      playlistId =
        htmlPlaylist.responseContext.serviceTrackingParams[0].params.find(
          (x: any) => x.key == "browse_id"
        ).value,
      channelName =
        htmlPlaylist.header.musicDetailHeaderRenderer.subtitle.runs.find(
          (x: any) => x.navigationEndpoint
        ).text,
      channelId =
        htmlPlaylist.header.musicDetailHeaderRenderer.subtitle.runs.find(
          (x: any) => x.navigationEndpoint
        ).navigationEndpoint.browseEndpoint.browseId,
      channelUrl = "https://music.youtube.com/channel/" + channelId,
      playlistShareUrl =
        "https://music.youtube.com/playlist?list=" + playlistId,
      simpleContents =
        htmlPlaylist.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicPlaylistShelfRenderer.contents
          .filter(
            (x: any) =>
              x.musicResponsiveListItemRenderer.overlay
                .musicItemThumbnailOverlayRenderer.content
                .musicPlayButtonRenderer.accessibilityPlayData
          )
          .map((x: any): simpleContent => {
            let longDuration =
              x.musicResponsiveListItemRenderer.overlay
                .musicItemThumbnailOverlayRenderer.content
                .musicPlayButtonRenderer.accessibilityPlayData.accessibilityData
                .label;
            return {
              title:
                x.musicResponsiveListItemRenderer.flexColumns[0]
                  .musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
              id: x.musicResponsiveListItemRenderer.playlistItemData.videoId,
              url:
                "https://www.youtube.com/watch?v=" +
                x.musicResponsiveListItemRenderer.playlistItemData.videoId,
              duration: {
                long: longDuration.slice(longDuration.lastIndexOf("- ") + 2),
                short:
                  x.musicResponsiveListItemRenderer.fixedColumns[0]
                    .musicResponsiveListItemFixedColumnRenderer.text.runs[0]
                    .text,
              },
              thumbs:
                x.musicResponsiveListItemRenderer.thumbnail
                  .musicThumbnailRenderer.thumbnail.thumbnails,
            };
          });
    return {
      title,
      isInfinity: false,
      playlistId,
      playlistShareUrl,
      simpleContents,
      channel: { name: channelName, id: channelId, url: channelUrl },
    };
  } else {
    {
      let htmlPlaylist = JSON.parse(regexHtmlPlaylist[1]),
        playlist =
          htmlPlaylist.contents.twoColumnWatchNextResults.playlist.playlist,
        title = playlist.title,
        isInfinity = playlist.isInfinity,
        playlistId = playlist.playlistId,
        playlistShareUrl = playlist.playlistShareUrl,
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
    }
  }
}

function resolveHexCodes(string: string): string {
  return string.replace(/\\x([0-9A-Fa-f]{2})/g, function () {
    return String.fromCharCode(parseInt(arguments[1], 16));
  });
}
