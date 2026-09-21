import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { loadContributionSourceData } from "../services/contributionPulseService";
import { buildContributionCounts, buildPersonalContributions, formatContributionDate } from "../lib/contributionPulse";
import type { ContributionModal, ContributionSourceData } from "../types/contributionPulse";

const EMPTY: ContributionSourceData = {
  observations: [], feedback: [], bugs: [], morphSubmissions: [], morphImageSubmissions: [],
  founderApplications: [], snakes: [], privacy: null, globalFeed: [], globalSnapshot: null,
};

export function useContributionPulse() {
  const { user } = useAuth();
  const [data,setData]=useState<ContributionSourceData>(EMPTY);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState<ContributionModal>(null);

  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    setLoading(true);
    try{setData(await loadContributionSourceData(user.uid));}
    finally{setLoading(false);}
  },[user]);

  useEffect(()=>{
    void load();
    const refresh=()=>void load();
    window.addEventListener("focus",refresh);
    window.addEventListener("community-contribution-changed",refresh);
    return()=>{window.removeEventListener("focus",refresh);window.removeEventListener("community-contribution-changed",refresh);};
  },[load]);

  const personalCounts=useMemo(()=>buildContributionCounts(data),[data]);
  const personalItems=useMemo(()=>buildPersonalContributions(data,personalCounts),[data,personalCounts]);
  const personalDisplayItems=personalItems.length?personalItems:[{id:"empty",category:"Community",title:"No contributions recorded yet",snippet:"Your future observations, feedback and community contributions will appear here."}];

  return {
    loading, modal, setModal, personalCounts, personalDisplayItems,
    globalFeed:data.globalFeed, globalSnapshot:data.globalSnapshot,
    globalIntelligence:typeof data.globalSnapshot?.intelligenceContributions==="number"?data.globalSnapshot.intelligenceContributions:0,
    publicCommunityRecords:typeof data.globalSnapshot?.publicCommunityRecords==="number"?data.globalSnapshot.publicCommunityRecords:0,
    totalPersonal:personalCounts.contributions+personalCounts.intelligenceRecords,
    formatContributionDate,
  };
}
