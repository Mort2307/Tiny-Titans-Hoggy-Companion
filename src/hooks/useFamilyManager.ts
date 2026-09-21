import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { removeFamilyMember, type FamilyAccount, type FamilyMember } from "../services/familyService";
import { getFamilyManagerData, setFamilyMemberAccessMode } from "../services/familyManagerService";
import type { FamilyAccessMode } from "../services/familyPermissionsService";
import { FAMILY_PERMISSION_MODES } from "../config/familyManager";
import { familyMemberLabel } from "../lib/familyManager";

export function useFamilyManager() {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [selected, setSelected] = useState("");
  const [modesByUid, setModesByUid] = useState<Record<string, FamilyAccessMode>>({});
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await getFamilyManagerData(user.uid);
      setFamily(data.family);
      setModesByUid(data.modes);
      setSelected((current) => current || data.family?.members.find((member) => member.uid !== user.uid)?.uid || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load Family Manager.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const changeMode = useCallback(async (memberUid: string, mode: FamilyAccessMode) => {
    if (!user) return;
    setBusyUid(memberUid);
    setError("");
    setMessage("");
    try {
      await setFamilyMemberAccessMode(user.uid, memberUid, mode);
      setModesByUid((current) => ({ ...current, [memberUid]: mode }));
      setMessage("Family permission updated. The new access level is now active for that account.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update family permission.");
    } finally {
      setBusyUid("");
    }
  }, [user]);

  const remove = useCallback(async (memberUid: string) => {
    if (!user) return;
    const member = family?.members.find((item) => item.uid === memberUid);
    if (!member || !window.confirm("Remove " + member.displayName + " from this family? Their personal account will remain intact.")) return;
    setBusyUid(memberUid);
    setError("");
    setMessage("");
    try {
      await removeFamilyMember(user.uid, memberUid);
      setMessage(member.displayName + " has been removed from the family.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove that family member.");
    } finally {
      setBusyUid("");
    }
  }, [family?.members, load, user]);

  const members = family?.members.filter((member) => member.uid !== user?.uid) ?? [];
  const activeMember = members.find((member) => member.uid === selected) || members[0] || null;
  const activeMode = activeMember ? modesByUid[activeMember.uid] || "review" : "review";

  return { user, family, selected, setSelected, modesByUid, loading, busyUid, message, error, changeMode, remove, members, activeMember, activeMode, load, modes: FAMILY_PERMISSION_MODES, memberLabel: familyMemberLabel };
}
