import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getPaidAccess, type PaidAccess } from "./paidTierService";
import { getMyRescueWorkspace } from "./rescueWorkspaceService";
import { getWorkspaceProduct, type WorkspaceProduct, type WorkspaceProductId, type WorkspacePermission } from "../config/workspaceProducts";

export type WorkspaceMode = "personal" | "work";
export type WorkspacePresentation = { mode: WorkspaceMode; productId: WorkspaceProductId; product: WorkspaceProduct; permissions: WorkspacePermission[]; access: PaidAccess | null; rescueWorkspace: boolean };
const PATH_EVENT = "tinytitans:workspace-path-changed";
const WORKSPACE_EVENT = "tinytitans:workspace-changed";
const MODE_KEY_PREFIX = "tinytitans:active-workspace:v2:";
const LEGACY_MODE_KEY_PREFIX = "tinytitans:active-workspace:";

function modeKey(uid: string) { return `${MODE_KEY_PREFIX}${uid}`; }
function legacyModeKey(uid: string) { return `${LEGACY_MODE_KEY_PREFIX}${uid}`; }
function getStoredMode(uid: string): WorkspaceMode {
  try {
    const stored = window.localStorage.getItem(modeKey(uid));
    if (stored === "work" || stored === "personal") return stored;
    window.localStorage.removeItem(legacyModeKey(uid));
  } catch { /* best effort */ }
  return "personal";
}
function storeMode(uid: string, mode: WorkspaceMode) {
  try {
    window.localStorage.setItem(modeKey(uid), mode);
    window.localStorage.removeItem(legacyModeKey(uid));
  } catch { /* best effort */ }
}
let current: WorkspacePresentation = { mode: "personal", productId: "personal", product: getWorkspaceProduct("personal"), permissions: [], access: null, rescueWorkspace: false };
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
export function getActiveWorkspaceMode(uid?: string | null): WorkspaceMode {
  if (!uid || typeof window === "undefined") return "personal";
  return getStoredMode(uid);
}
export function setActiveWorkspaceMode(uid: string, mode: WorkspaceMode) {
  storeMode(uid, mode);
  void sync(uid);
}
export function workspaceSwitchTargets(uid: string | null, rescueAvailable: boolean, paid: boolean) {
  const targets: Array<{ id: WorkspaceMode; label: string; path: string; available: boolean }> = [
    { id: "personal", label: "Personal Reptile Companion", path: "/", available: Boolean(uid) },
    { id: "work", label: "Work Workspace", path: rescueAvailable ? "/rescue" : "/", available: rescueAvailable || paid },
  ];
  return targets;
}
function publish() {
  const product = current.product;
  document.documentElement.dataset.ttTier = current.access?.effectiveTier ?? product.tierId;
  document.documentElement.dataset.ttWorkspace = product.id;
  document.documentElement.dataset.ttWorkspacePurpose = product.eyebrow;
  document.documentElement.dataset.ttWorkspacePermissions = product.permissions.join(",");
  document.documentElement.dataset.ttWorkspaceRole = current.rescueWorkspace ? "organisation_member" : "account_owner";
  document.documentElement.dataset.ttWorkspaceMode = current.mode;
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: current }));
}
async function sync(uid: string | null) {
  if (!uid) {
    current = { mode: "personal", productId: "personal", product: getWorkspaceProduct("personal"), permissions: [], access: null, rescueWorkspace: false };
    publish();
    return;
  }
  const [access, workspace] = await Promise.all([getPaidAccess(uid), getMyRescueWorkspace().catch(() => ({ organisation: null, role: null }))]);
  const rescueAvailable = rescueIsActive(workspace);
  const rescuePath = isRescuePath();
  let mode: WorkspaceMode = getStoredMode(uid);

  if (rescuePath && rescueAvailable) {
    mode = "work";
  } else if (mode === "work" && access.effectiveTier === "free") {
    mode = "personal";
    storeMode(uid, mode);
  }

  const rescue = mode === "work" && rescuePath && rescueAvailable;
  const productId: WorkspaceProductId = rescue ? "rescue" : mode === "work" && access.effectiveTier !== "free" ? access.effectiveTier : "personal";
  const product = getWorkspaceProduct(productId);
  current = { mode, productId, product, permissions: product.permissions, access, rescueWorkspace: rescue };
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