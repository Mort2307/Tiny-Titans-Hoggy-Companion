# TinyTitans Rescue email delivery

The Rescue staff invitation flow writes an email job to the Firestore `mail` collection. The repository does not send SMTP mail itself; Firebase Trigger Email must consume that queue.

## Production setup

Install the Firebase Trigger Email extension once for the Firebase project:

```powershell
firebase ext:install firebase/firestore-send-email --project=tinytitans-hoggy-companion
```

During configuration use these values:

- Firestore mail collection: `mail`
- Default FROM address: `Tiny Titans <tinytitans.exotics@gmail.com>`
- Default REPLY-TO address: `tinytitans.exotics@gmail.com`
- Users collection: leave empty for the current Rescue invitation implementation, because the invitation document already supplies `to` as an email address.
- Templates collection: leave empty; the trusted Cloud Function currently supplies the HTML and plaintext message.
- SMTP connection: use the SMTP service chosen for TinyTitans.
- SMTP password: supply the provider credential through the extension setup; never commit it to the repository.

Firebase's Trigger Email extension watches the configured Firestore collection and sends an email when a new document is added. It requires an SMTP service such as SendGrid, Mailgun, Mailchimp Transactional, or another SMTP server. urlFirebase Trigger Email documentationhttps://firebase.google.com/docs/extensions/official/firestore-send-email

For an early internal test, Gmail SMTP can be used with an app password on the TinyTitans sender account. Google requires 2-Step Verification before an app password can be created. A transactional email provider should be preferred for production delivery volume and sender reputation.

## Rescue invitation flow

1. A Rescue owner or manager enters the staff email and role in `/rescue/team`.
2. `inviteRescueStaff` creates `rescueInvitations/{invitationId}` with a seven-day expiry.
3. The function creates a `mail/{mailId}` document addressed to the invited email.
4. The email link is the canonical Firebase Hosting URL:

```text
https://tinytitans-hoggy-companion.web.app/rescue/team?invite={invitationId}
```

5. The application routes that URL through the dedicated Rescue invitation acceptance surface before the normal Team page is rendered.
6. The invited person must be signed in with the same email address the organisation invited.
7. `acceptRescueInvitation` adds the user's UID to the selected organisation role and marks the invitation accepted. Personal account data remains separate from the Rescue organisation.

## Verify delivery

After sending a test invitation, open the corresponding document in Firestore under `mail`.

The Trigger Email extension adds a `delivery` object. Normal progression is:

```text
PENDING → PROCESSING → SUCCESS
```

or:

```text
PENDING → PROCESSING → ERROR
```

For errors, inspect `delivery.error` and `delivery.info.response`. The extension also records delivery attempts and accepted/rejected recipients. urlFirebase email delivery status documentationhttps://firebase.google.com/docs/extensions/official/firestore-send-email/delivery-status

## Important security note

The `mail` collection should not be writable by normal client users. TinyTitans creates invitation mail documents server-side from trusted Cloud Functions. Keep the collection locked down in Firestore rules so arbitrary users cannot send mail from the TinyTitans sender address.

## Current invitation URL contract

The invitation URL intentionally remains `/rescue/team?invite=...` because the existing router, login redirect and account-setup redirect already preserve that path. The dedicated invitation surface now handles the query parameter and performs the invitation-specific verification and acceptance flow.

## Firebase Extensions lifecycle

Firebase has announced that the managed Firebase Extensions service will shut down on **March 31, 2027**. Already-deployed extensions will continue executing, but Firebase says management capabilities will no longer be available after that date. Treat the Trigger Email extension as the immediate delivery bridge, with a future migration to a directly managed Cloud Function/SMTP implementation planned before extension management becomes unavailable. urlFirebase Extensions deprecation FAQhttps://firebase.google.com/docs/extensions/faq-and-troubleshooting
