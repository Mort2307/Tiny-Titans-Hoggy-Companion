import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { deleteBreedingProject, getBreedingProjects } from "../services/breedingService";
import type { BreedingProject } from "../types/Breeding";

type Props = {
  fallback?: string;
};

function BackHomeButton({ fallback = "/" }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<BreedingProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [projectError, setProjectError] = useState("");

  useEffect(() => {
    if (location.pathname !== "/breeding" || !user) return;
    void getBreedingProjects(user.uid).then((loaded) => {
      setProjects(loaded);
      setSelectedProjectId((current) => current || loaded[0]?.id || "");
    }).catch(() => setProjectError("Unable to load breeding projects."));
  }, [location.pathname, user]);

  function goBack() {
    const historyState = window.history.state as { idx?: unknown } | null;
    const routerIndex = typeof historyState?.idx === "number" ? historyState.idx : 0;
    if (routerIndex > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }

  async function removeSelectedProject() {
    if (!user || !selectedProjectId || deleting) return;
    const project = projects.find((item) => item.id === selectedProjectId);
    if (!project) return;
    const confirmed = window.confirm(`Delete breeding project “${project.name}”? This also removes its pairings, clutches and hatchling records. Snake profiles are not deleted.`);
    if (!confirmed) return;

    setDeleting(true);
    setProjectError("");
    try {
      await deleteBreedingProject(user.uid, project.id);
      const remaining = projects.filter((item) => item.id !== project.id);
      setProjects(remaining);
      setSelectedProjectId(remaining[0]?.id || "");
      window.dispatchEvent(new CustomEvent("tinytitans:breeding-project-deleted", { detail: { projectId: project.id } }));
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Unable to delete this breeding project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="back-home-button-wrap">
      <button type="button" className="back-button" onClick={goBack}>
        <span className="back-button-arrow" aria-hidden="true">←</span>
        <span>Back</span>
      </button>
      {location.pathname === "/breeding" && user && (
        <details className="breeding-project-management">
          <summary>🗑️ Manage Projects</summary>
          <div className="breeding-project-management-panel">
            <label htmlFor="back-button-breeding-project">Remove breeding project</label>
            <select id="back-button-breeding-project" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={deleting || !projects.length}>
              {!projects.length ? <option value="">No projects available</option> : projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" className="breeding-danger-button" onClick={() => void removeSelectedProject()} disabled={deleting || !selectedProjectId}>
              {deleting ? "Removing…" : "Delete selected project"}
            </button>
            {projectError && <p role="alert">{projectError}</p>}
            <small>Deleting a project does not delete any Snake profiles created from its hatchlings.</small>
          </div>
        </details>
      )}
    </div>
  );
}

export default BackHomeButton;
