import { createPortal } from "react-dom";
import { useBreedingProjectManagement } from "../hooks/useBreedingProjectManagement";

export default function BreedingProjectManagement(){
 const {user,projects,selectedProjectId,setSelectedProjectId,deleting,projectError,projectsTile,removeSelectedProject}=useBreedingProjectManagement();
 if(!user||!projectsTile)return null;
 const content=<details className="breeding-project-management"><summary>🗑️ Manage Projects</summary><div className="breeding-project-management-panel"><label htmlFor="back-button-breeding-project">Remove breeding project</label><select id="back-button-breeding-project" value={selectedProjectId} onChange={(event)=>setSelectedProjectId(event.target.value)} disabled={deleting||!projects.length}>{!projects.length?<option value="">No projects available</option>:projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" className="breeding-danger-button" onClick={()=>void removeSelectedProject()} disabled={deleting||!selectedProjectId}>{deleting?"Removing…":"Delete selected project"}</button>{projectError&&<p role="alert">{projectError}</p>}<small>Deleting a project does not delete any Snake profiles created from its hatchlings.</small></div></details>;
 return createPortal(content,projectsTile);
}