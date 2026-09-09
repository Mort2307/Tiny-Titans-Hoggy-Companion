import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { deleteUserSnake } from "../services/snakeService";
import ConfirmActionDialog from "./ConfirmActionDialog";

export default function SnakeProfileDeleteControl() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const snakeId = location.pathname.match(/^\/snakes\/([^/]+)\/?$/)?.[1];
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!snakeId || snakeId === "new") return null;

  async function confirmDelete() {
    if (!user || !snakeId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteUserSnake(user.uid, decodeURIComponent(snakeId));
      navigate("/snakes", { replace: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this snake. Please try again.");
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <>
      <section className="tracker-card" style={{ marginTop: "2rem", border: "1px solid rgba(220, 70, 70, 0.35)" }} aria-labelledby="snake-delete-heading">
        <div>
          <h2 id="snake-delete-heading">Remove this Titan</h2>
          <p>Use this only when you want to permanently remove this snake and its Tiny Titans tracker history.</p>
          {error && <p role="alert" style={{ color: "#ff8b8b" }}>{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={deleting}
          style={{ marginTop: "0.75rem", fontWeight: 700 }}
        >
          🗑️ Delete Snake
        </button>
      </section>

      <ConfirmActionDialog
        open={open}
        title="Delete this Titan?"
        description={<p>This permanently removes the snake and its weight, feeding, shed, health and behaviour history from your Tiny Titans account. Associated snake photos are also cleaned up where possible.</p>}
        confirmLabel="Delete Snake"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => { if (!deleting) setOpen(false); }}
      />
    </>
  );
}
