import { Link } from "react-router-dom";
import MySnakesTiles from "./MySnakesTiles";
import "../styles/my-snakes-workspace.css";

export default function MySnakes() {
  return (
    <div className="my-snakes-workspace my-snakes-workspace-snakes">
      <header className="tt-page-header my-snakes-page-header">
        <div>
          <p className="tt-eyebrow">Your collection</p>
          <h1>My Snakes</h1>
          <p>Choose a snake to open their dedicated profile and keeper records.</p>
        </div>
        <div className="tt-page-actions">
          <Link className="tt-button my-snakes-add-action" to="/snakes/new">+ Add Snake</Link>
        </div>
      </header>

      <div className="my-snakes-workspace-content">
        <MySnakesTiles />
      </div>
    </div>
  );
}
