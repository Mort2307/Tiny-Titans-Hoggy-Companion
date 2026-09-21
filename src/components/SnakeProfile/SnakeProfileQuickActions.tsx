import { useNavigate } from "react-router-dom";
type Props = { snakeId: string; reminderWeightRoute: string; waterChangeRoute: string; };
export default function SnakeProfileQuickActions({ snakeId, reminderWeightRoute, waterChangeRoute }: Props) {
  const navigate = useNavigate();
  return <nav className="snake-profile-quickbar" aria-label="Snake quick actions">
    <button type="button" className="snake-profile-quick-primary" onClick={() => navigate("/snakes/" + snakeId + "/master-record")}>📖<span className="snake-profile-quick-label">Master Record</span></button>
    <button type="button" onClick={() => navigate("/weights/" + snakeId)}>⚖️<span className="snake-profile-quick-label">Weight</span></button>
    <button type="button" onClick={() => navigate("/feeding/" + snakeId)}>🍽️<span className="snake-profile-quick-label">Feeding</span></button>
    <button type="button" onClick={() => navigate("/shedding/" + snakeId)}>🐍<span className="snake-profile-quick-label">Shed</span></button>
    <button type="button" onClick={() => navigate("/behaviour/" + snakeId)}>👀<span className="snake-profile-quick-label">Behaviour</span></button>
    <button type="button" onClick={() => navigate("/health/" + snakeId)}>🩺<span className="snake-profile-quick-label">Health & Vet</span></button>
    <button type="button" onClick={() => navigate(waterChangeRoute)}>💧<span className="snake-profile-quick-label">Water</span></button>
    <button type="button" onClick={() => navigate("/snakes/" + snakeId + "/timeline")}>📅<span className="snake-profile-quick-label">Timeline</span></button>
    <button type="button" onClick={() => navigate("/snakes/" + snakeId + "/edit")}>✏️<span className="snake-profile-quick-label">Edit</span></button>
    <button type="button" onClick={() => navigate(reminderWeightRoute)}>⏰<span className="snake-profile-quick-label">Reminders</span></button>
  </nav>;
}