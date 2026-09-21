import { useNavigate } from "react-router-dom";
import TinyTitansIcon from "../TinyTitansIcon";
type Props = { snakeId: string; reminderWeightRoute: string; waterChangeRoute: string; };
export default function SnakeProfileQuickActions({ snakeId, reminderWeightRoute, waterChangeRoute }: Props) {
  const navigate = useNavigate();
  return <nav className="snake-profile-quickbar" aria-label="Snake quick actions">
    <button type="button" className="snake-profile-quick-primary" onClick={() => navigate("/snakes/" + snakeId + "/master-record")}><TinyTitansIcon name="handbook" size={20} /><span className="snake-profile-quick-label">Master Record</span></button>
    <button type="button" onClick={() => navigate("/weights/" + snakeId)}><TinyTitansIcon name="weight" size={20} /><span className="snake-profile-quick-label">Weight</span></button>
    <button type="button" onClick={() => navigate("/feeding/" + snakeId)}><TinyTitansIcon name="feeding" size={20} /><span className="snake-profile-quick-label">Feeding</span></button>
    <button type="button" onClick={() => navigate("/shedding/" + snakeId)}><TinyTitansIcon name="shed" size={20} /><span className="snake-profile-quick-label">Shed</span></button>
    <button type="button" onClick={() => navigate("/behaviour/" + snakeId)}><TinyTitansIcon name="behaviour" size={20} /><span className="snake-profile-quick-label">Behaviour</span></button>
    <button type="button" onClick={() => navigate("/health/" + snakeId)}><TinyTitansIcon name="vet" size={20} /><span className="snake-profile-quick-label">Health & Vet</span></button>
    <button type="button" onClick={() => navigate(waterChangeRoute)}><TinyTitansIcon name="water" size={20} /><span className="snake-profile-quick-label">Water</span></button>
    <button type="button" onClick={() => navigate("/snakes/" + snakeId + "/timeline")}><TinyTitansIcon name="timeline" size={20} /><span className="snake-profile-quick-label">Timeline</span></button>
    <button type="button" onClick={() => navigate("/snakes/" + snakeId + "/edit")}><TinyTitansIcon name="edit" size={20} /><span className="snake-profile-quick-label">Edit</span></button>
    <button type="button" onClick={() => navigate(reminderWeightRoute)}><TinyTitansIcon name="reminders" size={20} /><span className="snake-profile-quick-label">Reminders</span></button>
  </nav>;
}