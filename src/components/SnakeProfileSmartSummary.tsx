import type { Snake } from "../types/Snake";
import { useSnakeProfileSmartSummary } from "../hooks/useSnakeProfileSmartSummary";
import {
  SmartCompletenessSection,
  SmartMilestonesSection,
  SmartPrioritySection,
  SmartSignalsSection,
  SmartSnapshotSection,
} from "./SnakeProfile/SnakeProfileSmartSummarySections";

export default function SnakeProfileSmartSummary({ snake }: { snake: Snake }) {
  const { data } = useSnakeProfileSmartSummary(snake);

  return (
    <>
      <SmartPrioritySection data={data} snakeName={snake.name} />
      <SmartSnapshotSection snake={snake} data={data} />
      <SmartSignalsSection data={data} />
      <SmartMilestonesSection snake={snake} data={data} />
      <SmartCompletenessSection snake={snake} data={data} />
    </>
  );
}
