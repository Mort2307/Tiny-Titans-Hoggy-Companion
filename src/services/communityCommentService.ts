import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";

export type CommunityComment = {
  id: string;
  postId: string;
  text: string;
  authorName: string;
  authorIsCreator: boolean;
  createdAt: number;
  canDelete: boolean;
};

type ListResponse = { comments: CommunityComment[]; hasMore: boolean };
const functions = getFunctions(app);
const listComments = httpsCallable<{ postId: string }, ListResponse>(functions, "getCommunityPostComments");
const createComment = httpsCallable<{ postId: string; text: string }, CommunityComment>(functions, "createCommunityPostComment");
const deleteComment = httpsCallable<{ postId: string; commentId: string }, { success: boolean }>(functions, "deleteCommunityPostComment");
const reportComment = httpsCallable<{ postId: string; commentId: string; reason: string }, { success: boolean }>(functions, "reportCommunityPostComment");

export async function getCommunityPostComments(postId: string) {
  const result = await listComments({ postId });
  return result.data;
}

export async function createCommunityPostComment(postId: string, text: string) {
  const result = await createComment({ postId, text });
  return result.data;
}

export async function deleteCommunityPostComment(postId: string, commentId: string) {
  const result = await deleteComment({ postId, commentId });
  return result.data;
}

export async function reportCommunityPostComment(postId: string, commentId: string, reason: string) {
  const result = await reportComment({ postId, commentId, reason });
  return result.data;
}
