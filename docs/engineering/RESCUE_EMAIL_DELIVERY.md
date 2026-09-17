# Tiny Titans Reptile Companion Rescue email delivery

The Rescue staff invitation flow writes an email job to the Firestore `mail` collection. Tiny Titans Reptile Companion now consumes that queue with the first-party `sendQueuedMail` Cloud Function and Nodemailer rather than relying on the deprecated Firebase Extensions service.

## Production setup

The mail sender uses these Firebase Functions parameters:

```text
TINY_TITANS_SMTP_CONNECTION_URI
TINY_TITANS_SMTP_PASSWORD
TINY_TITANS_APP_ORIGIN
```

The SMTP connection URI is parameterised and defaults to:

```text
smtps://tinytitans.exotics@gmail.com@smtp.gmail.com:465
```

`TINY_TITANS_APP_ORIGIN` defaults to the current Firebase Hosting URL:

```text
https://tinytitans-hoggy-companion.web.app
```

When a new Reptile Companion Hosting URL or connected custom domain is put into service, set `TINY_TITANS_APP_ORIGIN` to that canonical origin so newly delivered Rescue invitations use it automatically.

The SMTP password is a Firebase Secret and must never be committed to source control.

For an early internal test, Gmail SMTP can be used with an App Password on the Tiny Titans sender account. Google requires 2-Step Verification before an App Password can be created. See Google's [App Password help](https://support.google.com/accounts/answer/185833).

A transactional provider such as SendGrid or Mailgun can be used later by changing the SMTP connection parameter and provider credential. The mail delivery function does not expose SMTP credentials to the frontend.

## Configure the sender

From the Tiny Titans project directory:

```powershell
firebase use tinytitans-hoggy-companion
firebase functions:secrets:set TINY_TITANS_SMTP_PASSWORD --project=tinytitans-hoggy-companion
```

Enter the SMTP password when Firebase prompts for it. Do not put that password in `.env`, Git, PowerShell history, screenshots, or source files.

The default connection URI already points at the Tiny Titans Gmail sender. A different provider can supply `TINY_TITANS_SMTP_CONNECTION_URI` during deployment if required.

Nodemailer is used only inside the server-side mail worker. The current repository uses Nodemailer 10.x, which targets Node.js 20+ and ships its own TypeScript declarations. Tiny Titans Reptile Companion Functions run on Node.js 22.

Deploy the mail worker:

```powershell
firebase deploy --only functions:sendQueuedMail --project=tinytitans-hoggy-companion
```

## Rescue invitation flow

1. A Rescue owner or manager enters the staff email and role in `/rescue/team`.
2. `inviteRescueStaff` creates `rescueInvitations/{invitationId}` with the invitation expiry.
3. The function creates a `mail/{mailId}` document addressed to the invited email.
4. `sendQueuedMail` detects the new mail document and sends it through SMTP.
5. The email link is generated from the current invitation origin contract. It currently resolves to:

```text
https://tinytitans-hoggy-companion.web.app/rescue/team?invite={invitationId}
```

The delivery worker replaces that current Firebase origin in Rescue invitation messages with `TINY_TITANS_APP_ORIGIN`, so changing the canonical public origin does not require another email-template code edit.

6. The application routes that URL through the dedicated Rescue invitation acceptance surface before the normal Team page is rendered.
7. The invited person must be signed in with the same email address the organisation invited.
8. `acceptRescueInvitation` adds the user's UID to the selected organisation role and marks the invitation accepted. Personal account data remains separate from the Rescue organisation.

The same `mail` queue is also used by the existing family invitation email flow, so the mail worker restores delivery for both flows rather than creating a second email pipeline.

## Verify delivery

After deploying the mail worker, send a **new** invitation. The Firestore trigger runs when the new `mail/{mailId}` document is created.

Open the corresponding document in Firestore under `mail`. The worker writes a `delivery` object with these states:

```text
PROCESSING → SUCCESS
```

or:

```text
PROCESSING → ERROR
```

A successful record includes the SMTP message ID, accepted recipients and the SMTP response. A failed record includes a bounded error message so the delivery failure can be diagnosed without storing the invitation message body again.

Older mail documents created before the worker was deployed are not automatically replayed because the trigger is `onDocumentCreated`. Use a fresh invitation for the first test.

## Security

The `mail` collection should not be writable by normal client users. Tiny Titans creates mail documents server-side from trusted Cloud Functions. Firestore rules should continue to deny arbitrary client writes to this collection so users cannot send mail from the Tiny Titans sender address.

## Current invitation URL contract

The invitation path remains `/rescue/team?invite=...` because the existing router, login redirect and account-setup redirect already preserve that path. The public origin is configurable through `TINY_TITANS_APP_ORIGIN`; the dedicated invitation surface consumes the query parameter, checks the invited email address, and performs the acceptance action.
