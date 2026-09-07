import MessagesPage from "./MessagesPage";

export default function ConversationInbox({ creatorMode = false }: { creatorMode?: boolean }) {
  return <MessagesPage creatorMode={creatorMode} />;
}
