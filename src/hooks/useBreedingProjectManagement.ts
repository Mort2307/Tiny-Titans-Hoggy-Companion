import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { deleteBreedingProject, getBreedingProjects } from "../services/breedingService";
import type { BreedingProject } from "../types/Breeding";

export function useBreedingProjectManagement() {
  const { user } = useAuth();
  const [projects,setProjects]=useState<BreedingProject[]>([]);
  const [selectedProjectId,setSelectedProjectId]=useState("");
  const [deleting,setDeleting]=useState(false);
  const [projectError,setProjectError]=useState("");
  const [projectsTile,setProjectsTile]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    if(!user)return;
    const tile=document.querySelector<HTMLElement>(".breeding-stack > .breeding-card");
    setProjectsTile(tile);
    void getBreedingProjects(user.uid).then((loaded)=>{setProjects(loaded);setSelectedProjectId((current)=>current||loaded[0]?.id||"");}).catch(()=>setProjectError("Unable to load breeding projects."));
  },[user]);

  async function removeSelectedProject(){
    if(!user||!selectedProjectId||deleting)return;
    const project=projects.find((item)=>item.id===selectedProjectId);
    if(!project)return;
    const confirmed=window.confirm(`Delete breeding project “${project.name}”? This also removes its pairings, clutches and hatchling records. Snake profiles are not deleted.`);
    if(!confirmed)return;
    setDeleting(true);setProjectError("");
    try{await deleteBreedingProject(user.uid,project.id);window.location.reload();}
    catch(error){setProjectError(error instanceof Error?error.message:"Unable to delete this breeding project.");setDeleting(false);}
  }

  return {user,projects,selectedProjectId,setSelectedProjectId,deleting,projectError,projectsTile,removeSelectedProject};
}