import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getPaidTierDefinition, type PaidTierId } from "../config/paidTiers";
import {
  formatTierDate, grantPaidTierTrial, loadPaidTierNotifications, loadPaidTierUsers,
  markPaidTierNotificationRead, revokePaidTierTrial,
} from "../services/creatorPaidTierService";
import { filterPaidTierUsers } from "../lib/creatorPaidTierOperations";
import type { TierNotification, TierSummary, TierUser } from "../types/creatorPaidTier";

export const CREATOR_TRIAL_TIERS: PaidTierId[] = [
  "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced",
];

export function useCreatorPaidTierOperations() {
  const { user, profile } = useAuth();
  const creatorRoute = window.location.pathname.startsWith("/creator");
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState<"users"|"notifications">("users");
  const [users,setUsers]=useState<TierUser[]>([]);
  const [summary,setSummary]=useState<TierSummary|null>(null);
  const [notifications,setNotifications]=useState<TierNotification[]>([]);
  const [search,setSearch]=useState("");
  const [tierFilter,setTierFilter]=useState<"all"|PaidTierId>("all");
  const [loading,setLoading]=useState(false);
  const [noticeLoading,setNoticeLoading]=useState(false);
  const [error,setError]=useState("");
  const [trialUser,setTrialUser]=useState<TierUser|null>(null);
  const [trialTier,setTrialTier]=useState<PaidTierId>("titan_pro");
  const [trialDays,setTrialDays]=useState("30");
  const [trialBusy,setTrialBusy]=useState(false);
  const [revokeBusyUid,setRevokeBusyUid]=useState("");

  const loadUsers=useCallback(async()=>{
    setLoading(true); setError("");
    try{const response=await loadPaidTierUsers();setUsers(response.users||[]);setSummary(response.summary||null);}
    catch(reason){setError(reason instanceof Error?reason.message:"Paid-tier users could not be loaded.");}
    finally{setLoading(false);}
  },[]);

  const loadNotifications=useCallback(async()=>{
    setNoticeLoading(true);
    try{const response=await loadPaidTierNotifications();setNotifications(response.notifications||[]);}
    catch(reason){setError(reason instanceof Error?reason.message:"Paid-tier notifications could not be loaded.");}
    finally{setNoticeLoading(false);}
  },[]);

  useEffect(()=>{
    if(!creatorRoute||profile?.role!=="admin"||!user)return;
    void loadNotifications();
    if(open)void loadUsers();
    const interval=window.setInterval(()=>void loadNotifications(),15000);
    return()=>window.clearInterval(interval);
  },[creatorRoute,open,profile?.role,user,loadUsers,loadNotifications]);

  const unreadCount=notifications.filter((item)=>item.read!==true).length;
  const filteredUsers=useMemo(()=>filterPaidTierUsers(users,search,tierFilter),[users,search,tierFilter]);

  async function activateTrial(){
    if(!trialUser)return;
    setTrialBusy(true);setError("");
    try{await grantPaidTierTrial(trialUser.uid,trialTier,Number(trialDays));setTrialUser(null);await Promise.all([loadUsers(),loadNotifications()]);setTab("notifications");}
    catch(reason){setError(reason instanceof Error?reason.message:"Trial could not be activated.");}
    finally{setTrialBusy(false);}
  }

  async function revokeUserTrial(account:TierUser){
    if(account.source!=="trial")return;
    if(!window.confirm(`Revoke ${getPaidTierDefinition(account.effectiveTier).name} trial access for ${account.displayName}?`))return;
    setRevokeBusyUid(account.uid);setError("");
    try{await revokePaidTierTrial(account.uid);await Promise.all([loadUsers(),loadNotifications()]);}
    catch(reason){setError(reason instanceof Error?reason.message:"Trial could not be revoked.");}
    finally{setRevokeBusyUid("");}
  }

  async function markNotificationRead(id:string){
    try{await markPaidTierNotificationRead(id);setNotifications((current)=>current.map((item)=>item.id===id?{...item,read:true}:item));}
    catch(reason){setError(reason instanceof Error?reason.message:"Notification could not be marked as read.");}
  }

  return {
    user,profile,creatorRoute,open,setOpen,tab,setTab,users,summary,notifications,
    search,setSearch,tierFilter,setTierFilter,loading,noticeLoading,error,
    trialUser,setTrialUser,trialTier,setTrialTier,trialDays,setTrialDays,
    trialBusy,revokeBusyUid,filteredUsers,unreadCount,loadUsers,loadNotifications,
    activateTrial,revokeUserTrial,markNotificationRead,formatTierDate,getPaidTierDefinition,
    trialTiers:CREATOR_TRIAL_TIERS,
  };
}
