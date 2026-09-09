import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';

export type CommunityCommentReport = {
  id: string;
  postId: string;
  commentId: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  reporterUid: string;
  createdAt: number;
  postTitle: string;
  commentText: string;
  commentAuthorName: string;
  commentExists: boolean;
};

const functions = getFunctions(app, 'europe-west2');
const getReports = httpsCallable<{ status?: string }, { reports: CommunityCommentReport[] }>(functions, 'getCommunityCommentReports');
const resolveReport = httpsCallable<{ reportId: string; status: 'resolved' | 'dismissed' | 'open' }, { success: boolean; status: string }>(functions, 'resolveCommunityCommentReport');
const deleteComment = httpsCallable<{ postId: string; commentId: string }, { success: boolean }>(functions, 'deleteCommunityPostComment');

export async function getCommunityCommentReports(status: 'open' | 'resolved' | 'dismissed' = 'open') {
  const result = await getReports({ status });
  return result.data.reports;
}
export async function setCommunityCommentReportStatus(reportId: string, status: 'resolved' | 'dismissed' | 'open') {
  const result = await resolveReport({ reportId, status });
  return result.data;
}
export async function removeReportedComment(postId: string, commentId: string) {
  const result = await deleteComment({ postId, commentId });
  return result.data;
}
