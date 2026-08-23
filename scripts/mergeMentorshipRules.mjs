import fs from "node:fs";
const path="firestore.rules";let rules=fs.readFileSync(path,"utf8");const marker='match /{document=**} { allow read, write: if false; }';
if(rules.includes("match /mentorApplications/{applicationId}")) process.exit(0);
if(!rules.includes(marker)) throw new Error("Mentorship rules merge refused: default deny marker not found.");
const block=`    match /mentorApplications/{applicationId} { allow create: if signedIn() && request.resource.data.applicantId == request.auth.uid && request.resource.data.status == "submitted" && request.resource.data.mentorRoles.size() > 0 && request.resource.data.specialities.size() > 0 && request.resource.data.experienceYears >= 0 && request.resource.data.experienceYears <= 80 && request.resource.data.conductAccepted == true; allow get: if signedIn() && (isCreator() || resource.data.applicantId == request.auth.uid); allow list: if isCreator(); allow update, delete: if isCreator(); }
    match /mentors/{mentorId} { allow read: if signedIn(); allow create, update, delete: if isCreator(); }
    match /mentorshipRequests/{requestId} { allow create: if signedIn() && request.resource.data.requesterId == request.auth.uid && request.resource.data.status == "sent"; allow get, list: if signedIn() && (isCreator() || resource.data.requesterId == request.auth.uid || resource.data.mentorId == request.auth.uid); allow update: if signedIn() && (isCreator() || resource.data.mentorId == request.auth.uid || resource.data.requesterId == request.auth.uid); allow delete: if isCreator(); }
    match /mentorshipWorkspaces/{workspaceId} { allow create: if signedIn() && (isCreator() || request.resource.data.participants.any(p, p.userId == request.auth.uid)); allow get: if signedIn() && (isCreator() || resource.data.participants.any(p, p.userId == request.auth.uid)); allow list: if false; allow update: if signedIn() && (isCreator() || resource.data.participants.any(p, p.userId == request.auth.uid)); allow delete: if isCreator(); }
    match /mentorshipEvents/{eventId} { allow create: if isCreator(); allow get, list: if isCreator(); allow update, delete: if isCreator(); }
`;
fs.writeFileSync(path,rules.replace(marker,block+marker),"utf8");
console.log("Tiny Titans: mentorship Firestore rules merged.");
