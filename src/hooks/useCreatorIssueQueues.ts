import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Feedback, FeedbackStatus } from "../types/feedback";
import type { CanonicalReportIssueStatus, ReportIssue } from "../types/reportIssue";
import { useAuth } from "../context/useAuth";
import {
  archiveCreatorReport,
  getCreatorFeedback,
  getCreatorReports,
  getIssueAttachmentUrl,
  updateCreatorFeedback,
  updateCreatorReport,
} from "../services/creatorService";
import { getCreatorUserDisplayNames } from "../services/creatorUserDirectoryService";
import { sendConversationMessage } from "../services/conversationService";
import { canTransitionReport,getAllowedReportTransitions,getReportLifecycleLabel,isActiveReportIssueStatus } from "../services/reportLifecycle";
import {
  BUG_FEEDBACK_STATUSES,
  bugStatusLabel,
  displayCreatorQueueDate,
  type BugFilter,
  type FeedbackFilter,
  type QueueTab,
} from "../lib/creatorIssueQueues";

export function useCreatorIssueQueues() {

 const { user } = useAuth(); const navigate = useNavigate(); const [searchParams,setSearchParams]=useSearchParams(); const [tab,setTab]=useState<QueueTab>("bugs"); const [bugs,setBugs]=useState<ReportIssue[]>([]); const [feedback,setFeedback]=useState<Feedback[]>([]); const [reporterNames,setReporterNames]=useState<Record<string,string>>({}); const [loading,setLoading]=useState(true); const [busyId,setBusyId]=useState(""); const [selectedBug,setSelectedBug]=useState<ReportIssue|null>(null); const [selectedFeedback,setSelectedFeedback]=useState<Feedback|null>(null); const [search,setSearch]=useState(""); const [bugFilter,setBugFilter]=useState<BugFilter>(searchParams.get("filter")==="archived"?"archived":"active"); const [feedbackFilter,setFeedbackFilter]=useState<FeedbackFilter>("all"); const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [creatorNotes,setCreatorNotes]=useState(""); const [resolution,setResolution]=useState(""); const [fixedVersion,setFixedVersion]=useState(""); const [attachmentUrl,setAttachmentUrl]=useState(""); const [showConversations,setShowConversations]=useState(false);
 const getReporterIds = (items: Array<{ userId?: string }>) => items.map(item=>item.userId).filter((id): id is string => Boolean(id));
 const reporterName = (userId?: string) => userId ? reporterNames[userId] : undefined;
 async function load(){setLoading(true);setError("");try{const [loadedBugs,loadedFeedback]=await Promise.all([getCreatorReports(),getCreatorFeedback()]);setBugs(loadedBugs);setFeedback(loadedFeedback);setReporterNames(await getCreatorUserDisplayNames(getReporterIds([...loadedBugs,...loadedFeedback])));}catch(e){setError(e instanceof Error?e.message:"Creator issue queues could not be loaded.");}finally{setLoading(false);}}
 useEffect(()=>{if(!user)return;let active=true;void Promise.all([getCreatorReports(),getCreatorFeedback()]).then(async ([loadedBugs,loadedFeedback])=>{if(!active)return;setBugs(loadedBugs);setFeedback(loadedFeedback);setReporterNames(await getCreatorUserDisplayNames(getReporterIds([...loadedBugs,...loadedFeedback])));setError("");}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Creator issue queues could not be loaded.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user]);
 useEffect(()=>{const bug=selectedBug;const feedbackItem=selectedFeedback;queueMicrotask(()=>{setCreatorNotes(feedbackItem?.creatorNotes??"");setResolution(bug?.resolution??"");setFixedVersion(bug?.fixedVersion??"");setAttachmentUrl("");if(bug?.attachment?.path)void getIssueAttachmentUrl(bug.attachment.path).then(setAttachmentUrl).catch(()=>undefined);});},[selectedBug,selectedFeedback]);
 const filteredBugs=useMemo(()=>{const term=search.trim().toLowerCase();return bugs.filter(item=>{const archiveMatch=bugFilter==="all"||(bugFilter==="archived"?item.archived===true:item.archived!==true);const reporter=reporterNames[item.userId||""];return archiveMatch&&(!term||[item.title,item.description,item.category,item.source,item.issueToken,item.userId,reporter,item.appVersion].some(v=>String(v??"").toLowerCase().includes(term)));});},[bugs,bugFilter,search,reporterNames]); const filteredFeedback=useMemo(()=>{const term=search.trim().toLowerCase();return feedback.filter(item=>{const reporter=reporterNames[item.userId||""];return (feedbackFilter==="all"||(item.status??"New")==feedbackFilter)&&(!term||[item.title,item.message,item.category,item.userId,reporter,item.appVersion].some(v=>String(v??"").toLowerCase().includes(term)));});},[feedback,feedbackFilter,search,reporterNames]); const newBugCount=bugs.filter(item=>item.archived!==true&&isActiveReportIssueStatus(item.status)).length; const archivedBugCount=bugs.filter(item=>item.archived===true).length; const newFeedbackCount=feedback.filter(item=>!item.status||item.status==="New").length;
 function changeBugFilter(value:BugFilter){setBugFilter(value);setSearchParams(value==="archived"?{filter:"archived"}:{});}
 async function saveBugStatus(status: CanonicalReportIssueStatus){if(!selectedBug||!user||busyId)return;if(!canTransitionReport(selectedBug.status,status)){setError(`Invalid bug lifecycle transition: ${getReportLifecycleLabel(selectedBug.status)} → ${status}.`);return;}setBusyId(selectedBug.id);setError("");setMessage("");try{await updateCreatorReport(selectedBug.id,status,{resolution,fixedVersion,creatorMessage:creatorNotes},user.uid);const next={...selectedBug,status:status as ReportIssue["status"],resolution:resolution||undefined,fixedVersion:fixedVersion||undefined,creatorMessage:creatorNotes||undefined,reviewedBy:user.uid};setBugs(current=>current.map(item=>item.id===next.id?next:item));setSelectedBug(next);setMessage("Bug report updated.");}catch(e){setError(e instanceof Error?e.message:"Unable to update the bug report.");}finally{setBusyId("");}}
 async function markBugFixedAndNotify(){if(!selectedBug||!user||busyId)return;if(!canTransitionReport(selectedBug.status,"Resolved")){setError(`This report cannot be marked Fixed & Confirmed from ${bugStatusLabel(selectedBug.status)}.`);return;}const userMessage=resolution.trim()||creatorNotes.trim()||"We've fixed this issue and confirmed the fix. Thank you for reporting it to Tiny Titans.";setBusyId(selectedBug.id);setError("");setMessage("");try{await updateCreatorReport(selectedBug.id,"Resolved",{resolution,fixedVersion,creatorMessage:userMessage},user.uid);await sendConversationMessage({kind:"bug",parentId:selectedBug.id,senderId:user.uid,senderRole:"creator",message:userMessage});const next={...selectedBug,status:"Resolved" as ReportIssue["status"],resolution:resolution||undefined,fixedVersion:fixedVersion||undefined,creatorMessage:userMessage,reviewedBy:user.uid};setBugs(current=>current.map(item=>item.id===next.id?next:item));setSelectedBug(next);setMessage("Fixed & Confirmed. The reporter has been notified in the conversation thread.");navigate(`/creator/conversations?thread=bug:${selectedBug.id}`);}catch(e){setError(e instanceof Error?e.message:"Unable to confirm the fix and notify the reporter.");}finally{setBusyId("");}}
 async function setBugArchived(archived:boolean){if(!selectedBug||!user||busyId)return;setBusyId(selectedBug.id);setError("");setMessage("");try{await archiveCreatorReport(selectedBug.id,archived,user.uid);const next={...selectedBug,archived};setBugs(current=>current.map(item=>item.id===next.id?next:item));setSelectedBug(next);setMessage(archived?"Bug report archived. It has been removed from the active queue.":"Bug report restored to the active queue.");}catch(e){setError(e instanceof Error?e.message:"Unable to update the archive state.");}finally{setBusyId("");}}
 async function saveFeedbackStatus(status:FeedbackStatus){if(!selectedFeedback||!user||busyId)return;setBusyId(selectedFeedback.id);setError("");setMessage("");try{await updateCreatorFeedback(selectedFeedback.id,status,creatorNotes,user.uid);const next={...selectedFeedback,status,creatorNotes:creatorNotes||undefined};setFeedback(current=>current.map(item=>item.id===next.id?next:item));setSelectedFeedback(next);setMessage("Feedback updated.");}catch(e){setError(e instanceof Error?e.message:"Unable to update the feedback.");}finally{setBusyId("");}}
  return {
    user,navigate,searchParams,setSearchParams,tab,setTab,bugs,feedback,reporterNames,loading,busyId,selectedBug,setSelectedBug,
    selectedFeedback,setSelectedFeedback,search,setSearch,bugFilter,setBugFilter,feedbackFilter,setFeedbackFilter,error,message,
    creatorNotes,setCreatorNotes,resolution,setResolution,fixedVersion,setFixedVersion,attachmentUrl,showConversations,setShowConversations,
    filteredBugs,filteredFeedback,newBugCount,archivedBugCount,newFeedbackCount,reporterName,displayCreatorQueueDate,bugStatusLabel,
    changeBugFilter,saveBugStatus,markBugFixedAndNotify,setBugArchived,saveFeedbackStatus,feedbackStatuses:BUG_FEEDBACK_STATUSES
  };
}
