import BackHomeButton from "../components/BackHomeButton";
import { Link } from "react-router-dom";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import TinyTitansIcon from "../components/TinyTitansIcon";
import SnakeProfileHero from "../components/SnakeProfile/SnakeProfileHero";
import SnakeProfileQuickActions from "../components/SnakeProfile/SnakeProfileQuickActions";
import SnakeProfileOverviewGrid from "../components/SnakeProfile/SnakeProfileOverviewGrid";
import SnakeProfileIntelligenceSection from "../components/SnakeProfile/SnakeProfileIntelligenceSection";
import SnakeProfileReviewGuide from "../components/SnakeProfileReviewGuide";
import SnakeProfileSmartSummary from "../components/SnakeProfileSmartSummary";
import { useSnakeProfile } from "../hooks/useSnakeProfile";
import { ageLabel, timeWithKeeperLabel } from "../lib/dateCalculations";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import "../styles/snake-profile.css";

export default function SnakeProfile() {
  const {
    loading, profileLoading, snake, loadingSnake, intelligence, intelligenceLoading,
    intelligenceAccess, benchmarkLoading, benchmarkError, deleting, confirmDelete, setConfirmDelete,
    error, reminder, summary, morphText, hetText, reminderWeightRoute,
    waterChangeRoute, navigate, deleteSnake,
  } = useSnakeProfile();

  if (loading || profileLoading || loadingSnake) {
    return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1><TinyTitansIcon name="reptile" size={28} /> Loading Snake...</h1><div className="tracker-card"><p>Fetching the snake profile from Firebase.</p></div></div>;
  }

  if (error || !snake) {
    return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1><TinyTitansIcon name="reptile" size={28} /> Snake Not Found</h1><div className="tracker-card"><h3>{error ?? "This snake could not be found."}</h3><button type="button" onClick={() => navigate("/snakes")}><TinyTitansIcon name="back" size={16} /> Back to My Animals</button></div></div>;
  }

  const activeReminder = reminder ?? { status: "disabled" as const, nextDate: null, daysRemaining: null };
  const ageText = ageLabel(snake.hatchDate);
  const keeperTimeText = timeWithKeeperLabel(snake.arrivalDate);
  const universalSpecies = snake.universalSpeciesId ? findUniversalSpecies(snake.universalSpeciesId) : findUniversalSpecies(snake.species);
  return (
    <div className="page-container snake-profile-page">
      <BackHomeButton fallback="/snakes" />
      <SnakeProfileHero snake={snake} morphText={morphText} hetText={hetText} ageText={ageText} keeperTimeText={keeperTimeText} />
      <SnakeProfileQuickActions snakeId={snake.id} reminderWeightRoute={reminderWeightRoute} waterChangeRoute={waterChangeRoute} />
      {universalSpecies && <details className="tracker-card snake-profile-supplement"><summary><TinyTitansIcon name="knowledge" size={17} /> Species care reference <span>{universalSpecies.commonNames[0]}</span></summary><div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}><div><p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, letterSpacing: ".08em", opacity: .65 }}>CANONICAL SPECIES</p><strong>{universalSpecies.commonNames[0]}</strong><div style={{ fontSize: "0.85rem", opacity: .72, fontStyle: "italic" }}>{universalSpecies.acceptedScientificName}</div></div><Link className="tt-intelligence-action" to={`/species/${universalSpecies.id}`}>View care & health <TinyTitansIcon name="forward" size={15} /></Link></div></details>}
      <SnakeProfileOverviewGrid snake={snake} reminder={activeReminder} reminderWeightRoute={reminderWeightRoute} waterChangeRoute={waterChangeRoute} />
      <SnakeProfileReviewGuide snake={snake} />
      <details className="snake-profile-supplement snake-profile-insights-disclosure"><summary><TinyTitansIcon name="titan" size={18} /> More personal insights and milestones</summary><SnakeProfileSmartSummary snake={snake} /></details>
      <SnakeProfileIntelligenceSection
        snake={snake}
        intelligenceAccess={intelligenceAccess}
        intelligenceLoading={intelligenceLoading}
        intelligence={intelligence}
        benchmarkLoading={benchmarkLoading}
        benchmarkError={benchmarkError}
        summary={summary}
      />
      <ConfirmActionDialog
        open={confirmDelete}
        title={"Delete " + snake.name + "?"}
        description={<p>This removes the snake from your active collection. Weight, feeding and shed history associated with the snake will no longer be reachable through the app.</p>}
        confirmLabel="Delete Snake"
        busy={deleting}
        onConfirm={() => void deleteSnake()}
        onCancel={() => { if (!deleting) setConfirmDelete(false); }}
      />
    </div>
  );
}
