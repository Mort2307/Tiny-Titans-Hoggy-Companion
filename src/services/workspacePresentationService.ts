import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getPaidAccess, type PaidAccess } from "./paidTierService";
import { getMyRescueWorkspace } from "./rescueWorkspaceService";
import { getWorkspaceProduct, type WorkspaceProduct, type WorkspaceProductId, type WorkspacePermission } from "../config/workspaceProducts";

export type WorkspacePresentation = { productId: WorkspaceProductId; product: WorkspaceProduct; permissions: WorkspacePermission[]; access: PaidAccess | null; rescueWorkspace: boolean };
const PATH_EVENT = "tinytitans:workspace-path-changed";
const WORKSPACE_EVENT = "tinytitans:workspace-changed";
let current: WorkspacePresentation = { productId: "personal", product: getWorkspaceProduct("personal"), permissions: [], access: null, rescueWorkspace: false };
let started = false;

function rescueIsActive(workspace: { organisation: { accountStatus?: string; pilotStatus?: string; pilotEndsAt?: string } | null }) {
  const org = workspace.organisation;
  if (!org) return false;
  if (org.accountStatus === "paid_active") return true;
  if (org.pilotStatus !== "pilot_active") return false;
  const end = org.pilotEndsAt ? Date.parse(org.pilotEndsAt) : 0;
  return Number.isFinite(end) && end > Date.now();
}
function isRescuePath() { return window.location.pathname === "/rescue" || window.location.pathname.startsWith("/rescue/"); }
function publish() {
  const product = current.product;
  document.documentElement.dataset.ttTier = current.access?.effectiveTier ?? product.tierId;
  document.documentElement.dataset.ttWorkspace = product.id;
  document.documentElement.dataset.ttWorkspacePurpose = product.eyebrow;
  document.documentElement.dataset.ttWorkspacePermissions = product.permissions.join(",");
  document.documentElement.dataset.ttWorkspaceRole = current.rescueWorkspace ? "organisation_member" : "account_owner";
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: current }));
}
async function sync(uid: string | null) {
  if (!uid) { current = { productId: "personal", product: getWorkspaceProduct("personal"), permissions: [], access: null, rescueWorkspace: false }; publish(); return; }
  const [access, workspace] = await Promise.all([getPaidAccess(uid), getMyRescueWorkspace().catch(() => ({ organisation: null, role: null }))]);
  const rescue = rescueIsActive(workspace) && isRescuePath();
  const productId: WorkspaceProductId = rescue ? "rescue" : access.effectiveTier === "free" ? "personal" : access.effectiveTier;
  const product = getWorkspaceProduct(productId);
  current = { productId, product, permissions: product.permissions, access, rescueWorkspace: rescue };
  publish();
}
function watchPath() { void sync(auth.currentUser?.uid ?? null); }
function installHistoryHooks() {
  const guardedWindow = window as Window & { __ttWorkspacePresentation?: boolean };
  if (guardedWindow.__ttWorkspacePresentation) return;
  guardedWindow.__ttWorkspacePresentation = true;
  (["pushState", "replaceState"] as const).forEach((method) => {
    const original = window.history[method];
    window.history[method] = function (...args) { const result = original.apply(this, args); window.dispatchEvent(new Event(PATH_EVENT)); return result; };
  });
  window.addEventListener("popstate", watchPath);
  window.addEventListener(PATH_EVENT, watchPath);
}
export function getWorkspacePresentation() { return current; }
export function hasWorkspacePermission(permission: WorkspacePermission) { return current.permissions.includes(permission); }
export function subscribeToWorkspacePresentation(listener: (value: WorkspacePresentation) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<WorkspacePresentation>).detail ?? current);
  window.addEventListener(WORKSPACE_EVENT, handler);
  listener(current);
  return () => window.removeEventListener(WORKSPACE_EVENT, handler);
}
export function startWorkspacePresentation() {
  if (started || typeof window === "undefined") return;
  started = true;
  installHistoryHooks();
  onAuthStateChanged(auth, (user) => { void sync(user?.uid ?? null).catch(() => publish()); });
}
startWorkspacePresentation();
