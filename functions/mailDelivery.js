const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

const db = getFirestore();
const SMTP_CONNECTION_URI = defineString("TINY_TITANS_SMTP_CONNECTION_URI", {
  default: "smtps://tinytitans.exotics@gmail.com@smtp.gmail.com:465",
});
const APP_ORIGIN = defineString("TINY_TITANS_APP_ORIGIN", {
  default: "https://tinytitans-hoggy-companion.web.app",
});
const SMTP_PASSWORD = defineSecret("TINY_TITANS_SMTP_PASSWORD");
const APP_NAME = "Tiny Titans Keeper Companion";

let transporter = null;

function listAddresses(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  const address = String(value || "").trim();
  return address ? [address] : [];
}

async function resolveUidAddresses(value) {
  const uids = Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!uids.length) return [];
  const snapshots = await Promise.all(uids.map((uid) => db.collection("users").doc(uid).get()));
  return snapshots.map((snapshot) => String(snapshot.data()?.email || "").trim().toLowerCase()).filter(Boolean);
}

function createTransporter() {
  const connectionUri = String(SMTP_CONNECTION_URI.value() || "").trim();
  const password = String(SMTP_PASSWORD.value() || "");
  if (!connectionUri || !password) throw new Error("SMTP connection settings are incomplete. Configure TINY_TITANS_SMTP_CONNECTION_URI and TINY_TITANS_SMTP_PASSWORD.");

  const parsed = new URL(connectionUri);
  const username = decodeURIComponent(parsed.username || "");
  const port = Number(parsed.port || (parsed.protocol === "smtps:" ? 465 : 587));
  if (!parsed.hostname || !Number.isFinite(port) || port <= 0) throw new Error("TINY_TITANS_SMTP_CONNECTION_URI is invalid.");
  if (!username) throw new Error("TINY_TITANS_SMTP_CONNECTION_URI must include the SMTP username before the @ symbol.");

  return nodemailer.createTransport({
    host: parsed.hostname,
    port,
    secure: parsed.protocol === "smtps:",
    auth: { user: username, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

function getTransporter() {
  if (!transporter) transporter = createTransporter();
  return transporter;
}

function deliveryError(error) {
  return String(error?.response || error?.message || error || "SMTP delivery failed").slice(0, 2000);
}

function brandInvitationMessage(mail, message) {
  if (mail.type !== "rescue-staff-invitation") return message;
  const configuredOrigin = String(APP_ORIGIN.value() || "").trim().replace(/\/$/, "");
  if (!configuredOrigin) return message;
  const replaceOrigin = (value) => String(value || "").replace(/https:\/\/tinytitans-hoggy-companion\.web\.app/g, configuredOrigin);
  return {
    ...message,
    text: replaceOrigin(message.text),
    html: replaceOrigin(message.html),
  };
}

exports.sendQueuedMail = onDocumentCreated({
  region: "europe-west2",
  document: "mail/{mailId}",
  secrets: [SMTP_PASSWORD],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const mailId = String(event.params.mailId || "").trim();
  const mail = snapshot.data() || {};
  const message = brandInvitationMessage(mail, mail.message && typeof mail.message === "object" ? mail.message : {});
  const to = [...listAddresses(mail.to), ...await resolveUidAddresses(mail.toUids)];
  const cc = [...listAddresses(mail.cc), ...await resolveUidAddresses(mail.ccUids)];
  const bcc = [...listAddresses(mail.bcc), ...await resolveUidAddresses(mail.bccUids)];
  const subject = String(message.subject || "").trim();
  const text = message.text == null ? "" : String(message.text);
  const html = message.html == null ? "" : String(message.html);

  if (!mailId || !to.length || !subject || (!text && !html)) {
    await snapshot.ref.set({
      delivery: {
        state: "ERROR",
        error: "Mail queue item is missing a recipient, subject, or message body.",
        endTime: FieldValue.serverTimestamp(),
      },
    }, { merge: true });
    return;
  }

  await snapshot.ref.set({
    delivery: {
      state: "PROCESSING",
      startTime: FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  try {
    const brandedFrom = mail.type === "rescue-staff-invitation"
      ? `${APP_NAME} <tinytitans.exotics@gmail.com>`
      : (mail.from || `${APP_NAME} <tinytitans.exotics@gmail.com>`);
    const info = await getTransporter().sendMail({
      from: brandedFrom,
      replyTo: mail.replyTo || "tinytitans.exotics@gmail.com",
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      subject,
      text: text || undefined,
      html: html || undefined,
      headers: mail.headers && typeof mail.headers === "object" ? mail.headers : undefined,
      messageId: message.messageId || undefined,
    });

    await snapshot.ref.set({
      delivery: {
        state: "SUCCESS",
        endTime: FieldValue.serverTimestamp(),
        attempts: 1,
        info: {
          messageId: info.messageId || null,
          accepted: Array.isArray(info.accepted) ? info.accepted : to,
          rejected: Array.isArray(info.rejected) ? info.rejected : [],
          pending: Array.isArray(info.pending) ? info.pending : [],
          response: String(info.response || "").slice(0, 2000),
        },
      },
    }, { merge: true });
  } catch (error) {
    console.error(`Tiny Titans mail delivery failed for ${mailId}`, error);
    await snapshot.ref.set({
      delivery: {
        state: "ERROR",
        endTime: FieldValue.serverTimestamp(),
        attempts: 1,
        error: deliveryError(error),
      },
    }, { merge: true });
  }
});
