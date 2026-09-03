const { getMessaging } = require("firebase-admin/messaging");

const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const NOTIFICATION_ICON = `${PUBLIC_ORIGIN}/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg?v=3`;
const NOTIFICATION_BADGE = NOTIFICATION_ICON;

let installed = false;

function installNotificationBranding() {
  if (installed) return;
  const messaging = getMessaging();
  const originalSendEachForMulticast = messaging.sendEachForMulticast.bind(messaging);

  messaging.sendEachForMulticast = async (message) => {
    const existingWebpush = message.webpush || {};
    const existingNotification = existingWebpush.notification || {};

    return originalSendEachForMulticast({
      ...message,
      webpush: {
        ...existingWebpush,
        notification: {
          ...existingNotification,
          icon: NOTIFICATION_ICON,
          badge: NOTIFICATION_BADGE,
        },
      },
    });
  };

  installed = true;
}

installNotificationBranding();

module.exports = { NOTIFICATION_ICON, NOTIFICATION_BADGE };
