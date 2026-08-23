import CommunityEcosystemPage from "./CommunityEcosystemPage";

type CommunitySectionKey = "showcase" | "projects" | "mentorship" | "knowledge";

interface CommunitySectionProps {
  section: CommunitySectionKey;
}

export default function CommunitySection({ section }: CommunitySectionProps) {
  return <CommunityEcosystemPage mode="section" section={section} />;
}
