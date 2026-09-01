import { useSearchParams } from "react-router-dom";
import FamilyManager from "./FamilyManager";
import FamilyReview from "./FamilyReview";
import FamilyHistory from "./FamilyHistory";

/** Compatibility wrapper for the legacy family-management destination. */
export default function FamilyAccount() {
  const [params] = useSearchParams();
  const view = params.get("view");
  if (view === "review") return <FamilyReview />;
  if (view === "history") return <FamilyHistory />;
  return <FamilyManager />;
}
