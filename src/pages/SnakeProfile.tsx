import BackHomeButton from "../components/BackHomeButton";
import ConfirmActionDialog from "../components/ConfirmActionDialog";
import SnakeProfileHero from "../components/SnakeProfile/SnakeProfileHero";
import SnakeProfileQuickActions from "../components/SnakeProfile/SnakeProfileQuickActions";
import SnakeProfileOverviewGrid from "../components/SnakeProfile/SnakeProfileOverviewGrid";
import SnakeProfileIntelligenceSection from "../components/SnakeProfile/SnakeProfileIntelligenceSection";
import SnakeProfileReviewGuide from "../components/SnakeProfileReviewGuide";
import SnakeProfileSmartSummary from "../components/SnakeProfileSmartSummary";
import { useSnakeProfile } from "../hooks/useSnakeProfile";
import { ageLabel, timeWithKeeperLabel } from "../lib/dateCalculations";
import "../styles/snake-profile.css";

export default function SnakeProfile() {
  const {
    id, loading, profileLoading, snake, loadingSnake, intelligence, intelligenceLoading,
    intelligenceAccess, benchmarkLoading, benchmarkError, deleting, confirmDelete, setConfirmDelete,
    error, reminder, summary, weightHistory, morphText, hetText, reminderWeightRoute,
    waterChangeRoute, navigate, deleteSnake,
  } = useSnakeProfile();

  if (loading || profileLoading || loadingSnake) {
    return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1>🐍 Loading Snake...</h1><div className="tracker-card"><p>Fetching the snake profile from Firebase.</p></div></div>;
  }

  if (error || !snake) {
    return <div className="page-container"><BackHomeButton fallback="/snakes" /><h1>🐍 Snake Not Found</h1><div className="tracker-card"><h3>{error ?? "This snake could not be found."}</h3><button type="button" onClick={() => navigate("/snakes")}>← Back to My Hoggies</button></div></div>;
  }

  const activeReminder = reminder ?? { status: "disabled" as const, nextDate: null, daysRemaining: null };
  const ageText = ageLabel(snake.hatchDate);
  const keeperTimeText = timeWithKeeperLabel(snake.arrivalDate);
  return (
    <div className="page-container snake-profile-page">
      <BackHomeButton fallback="/snakes" />
      <SnakeProfileHero snake={snake} morphText={morphText} hetText={hetText} ageText={ageText} keeperTimeText={keeperTimeText} />
      <SnakeProfileQuickActions snakeId={snake.id} reminderWeightRoute={reminderWeightRoute} waterChangeRoute={waterChangeRoute} />
      <SnakeProfileOverviewGrid snake={snake} reminder={activeReminder} reminderWeightRoute={reminderWeightRoute} waterChangeRoute={waterChangeRoute} />
      <SnakeProfileReviewGuide snake={snake} />
      <SnakeProfileSmartSummary snake={snake} />
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
