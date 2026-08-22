export const CONNECTED_DEVICE_LINKS = {
  inkbird: {
    googlePlay: "https://play.google.com/store/apps/details?id=com.inkbird.inkbirdapp",
    appStore: "https://apps.apple.com/gb/app/inkbird/id1589369968",
  },
} as const;

export function getInkbirdAppUrl(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  return isAppleMobile ? CONNECTED_DEVICE_LINKS.inkbird.appStore : CONNECTED_DEVICE_LINKS.inkbird.googlePlay;
}
