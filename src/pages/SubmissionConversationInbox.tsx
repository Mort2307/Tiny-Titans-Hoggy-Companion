import MessagesPage from "./MessagesPage";

export default function SubmissionConversationInbox({ creatorMode = false }: { creatorMode?: boolean }) {
  return <MessagesPage creatorMode={creatorMode} />;
}
