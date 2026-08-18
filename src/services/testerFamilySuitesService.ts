import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFamilyForUser } from "./familyService";
import { defaultAdultPermissions, defaultChildPermissions, getMemberPermissions } from "./familyPermissionsService";
import { getSandboxExperiments } from "./sandboxService";
import type { TesterCheck } from "./testerBotService";

const REQUIRED_AREAS = ["snakes", "weights", "feeding", "sheds", "breeding", "genetics"] as const;
const REQUIRED_ACTIONS = ["view", "create", "edit", "delete"] as const;
const VALID_MODES = new Set(["allow", "deny", "verify"]);
const VALID_ROLES = new Set(["owner", "adult", "child"]);

export async function createFamilyAccountChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Family Account BOT requires an authenticated UID.");

  let familyCache: Awaited<ReturnType<typeof getFamilyForUser>> | undefined;
  let familyError: string | null = null;
  const loadFamily = async () => {
    if (familyCache !== undefined || familyError) return;
    try {
      familyCache = await getFamilyForUser(uid);
    } catch (error) {
      familyError = error instanceof Error ? error.message : "Unable to read the current Tiny Titans family.";
    }
  };

  return [
    {
      checkId: "family-account-readable",
      name: "Current Tiny Titans Family record is readable",
      category: "account",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (familyError) return { status: "fail", message: `Family record could not be read: ${familyError}` };
        if (!familyCache) return { status: "blocked", message: "The authenticated tester account is not currently connected to a Tiny Titans Family; family membership checks cannot execute for this account." };
        return { status: "pass", message: `Family ${familyCache.id} is readable and identifies ${familyCache.memberUids.length} member account${familyCache.memberUids.length === 1 ? "" : "s"}.` };
      },
    },
    {
      checkId: "family-membership-integrity",
      name: "Family member UID list and member records agree",
      category: "firebase",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        const uidSet = new Set(familyCache.memberUids);
        const memberSet = new Set(familyCache.members.map((member) => member.uid));
        const missingMemberRecords = familyCache.memberUids.filter((memberUid) => !memberSet.has(memberUid));
        const orphanMemberRecords = familyCache.members.filter((member) => !uidSet.has(member.uid));
        return missingMemberRecords.length === 0 && orphanMemberRecords.length === 0
          ? { status: "pass", message: "Every family member UID has a matching member record and no orphan member records were found." }
          : { status: "fail", message: `Family membership is inconsistent: ${missingMemberRecords.length} missing member records and ${orphanMemberRecords.length} orphan records.` };
      },
    },
    {
      checkId: "family-owner-integrity",
      name: "Family owner is a member and has owner role",
      category: "account",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        const owner = familyCache.members.find((member) => member.uid === familyCache!.ownerUid);
        return owner && owner.role === "owner" && familyCache.memberUids.includes(familyCache.ownerUid)
          ? { status: "pass", message: "Family Owner is present in memberUids and has the owner role." }
          : { status: "fail", message: "Family Owner integrity failed: owner UID is missing from membership or does not have owner role." };
      },
    },
    {
      checkId: "family-capacity",
      name: "Family membership remains within the three-account limit",
      category: "account",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        return familyCache.memberUids.length <= 3 && familyCache.members.length <= 3
          ? { status: "pass", message: `Family contains ${familyCache.memberUids.length}/3 permitted accounts.` }
          : { status: "fail", message: `Family exceeds the three-account limit: ${familyCache.memberUids.length} member UIDs and ${familyCache.members.length} member records.` };
      },
    },
    {
      checkId: "family-role-integrity",
      name: "Family member roles use the supported owner/adult/child model",
      category: "account",
      severity: "high",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        const invalid = familyCache.members.filter((member) => !VALID_ROLES.has(member.role));
        return invalid.length === 0
          ? { status: "pass", message: "All family member records use a supported role: owner, adult or child." }
          : { status: "fail", message: `${invalid.length} family member record${invalid.length === 1 ? "" : "s"} has an unsupported role.` };
      },
    },
    {
      checkId: "family-permission-model",
      name: "Family permissions expose Allow, Deny and Verify for every data area/action",
      category: "firebase",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        const members = familyCache.members.filter((member) => member.uid !== familyCache!.ownerUid);
        if (!members.length) return { status: "blocked", message: "No non-owner family member exists yet; member permission records cannot be exercised." };
        const findings: string[] = [];
        for (const member of members) {
          const permissions = await getMemberPermissions(member.uid);
          for (const area of REQUIRED_AREAS) for (const action of REQUIRED_ACTIONS) {
            const key = `${area}.${action}` as keyof typeof permissions;
            if (!VALID_MODES.has(permissions[key])) findings.push(`${member.uid}:${key}`);
          }
        }
        return findings.length === 0
          ? { status: "pass", message: `Permission matrix is valid for ${members.length} non-owner family member${members.length === 1 ? "" : "s"}; every area/action resolves to Allow, Deny or Verify.` }
          : { status: "fail", message: `Invalid family permission values found at ${findings.slice(0, 8).join(", ")}${findings.length > 8 ? "…" : ""}.` };
      },
    },
    {
      checkId: "family-default-permission-contract",
      name: "Default child/adult permission policies are internally complete",
      category: "account",
      severity: "high",
      run: async () => {
        const expectedCount = REQUIRED_AREAS.length * REQUIRED_ACTIONS.length;
        const childCount = Object.keys(defaultChildPermissions).length;
        const adultCount = Object.keys(defaultAdultPermissions).length;
        return childCount === expectedCount && adultCount === expectedCount
          ? { status: "pass", message: `Child and adult defaults each define all ${expectedCount} area/action permissions.` }
          : { status: "fail", message: `Permission defaults are incomplete: child=${childCount}, adult=${adultCount}, expected=${expectedCount}.` };
      },
    },
    {
      checkId: "family-approval-records-readable",
      name: "Family approval queue is family-bound",
      category: "firebase",
      severity: "critical",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        try {
          const snapshot = await getDocs(query(collection(db, "familyApprovals"), where("familyId", "==", familyCache.id)));
          const invalid = snapshot.docs.filter((item) => {
            const data = item.data() as Record<string, unknown>;
            return data.familyId !== familyCache!.id || typeof data.requesterUid !== "string" || !["pending", "approved", "rejected"].includes(String(data.status));
          });
          return invalid.length === 0
            ? { status: "pass", message: `Family approval queue is readable; ${snapshot.size} family-bound approval record${snapshot.size === 1 ? "" : "s"} inspected.` }
            : { status: "fail", message: `${invalid.length} approval records have invalid family/requester/status fields.` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Family approval queue could not be read." };
        }
      },
    },
    {
      checkId: "family-invite-records-readable",
      name: "Family invitation records are correctly bound to the family",
      category: "account",
      severity: "high",
      run: async () => {
        await loadFamily();
        if (!familyCache) return { status: "blocked", message: familyError ?? "No family is connected to the tester account." };
        try {
          const snapshot = await getDocs(query(collection(db, "familyInvites"), where("familyId", "==", familyCache.id)));
          const invalid = snapshot.docs.filter((item) => {
            const data = item.data() as Record<string, unknown>;
            return data.familyId !== familyCache!.id || data.ownerUid !== familyCache!.ownerUid || typeof data.targetEmail !== "string" || !["pending", "accepted", "declined"].includes(String(data.status));
          });
          return invalid.length === 0
            ? { status: "pass", message: `Family invitation records are correctly bound; ${snapshot.size} invitation record${snapshot.size === 1 ? "" : "s"} inspected.` }
            : { status: "fail", message: `${invalid.length} invitation records have invalid owner, family, email or status fields.` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Family invitation records could not be read." };
        }
      },
    },
    {
      checkId: "family-sandbox-isolation",
      name: "Family sandbox experiments remain owner-bound and separate from real family records",
      category: "firebase",
      severity: "critical",
      run: async () => {
        try {
          const experiments = await getSandboxExperiments(uid);
          const invalid = experiments.filter((experiment) => experiment.ownerUid !== uid || !["genetics", "pairing", "clutch", "custom"].includes(experiment.type));
          return invalid.length === 0
            ? { status: "pass", message: `Read ${experiments.length} sandbox experiment${experiments.length === 1 ? "" : "s"}; all are owner-bound and use supported sandbox types.` }
            : { status: "fail", message: `${invalid.length} sandbox experiment records violate owner/type isolation.` };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Sandbox isolation could not be verified." };
        }
      },
    },
    {
      checkId: "family-live-cross-account-runner",
      name: "Existing-user invitation acceptance and cross-account permission journey",
      category: "application",
      severity: "critical",
      run: async () => ({
        status: "blocked",
        message: "The live multi-identity journey runner is not yet wired. This check deliberately remains blocked rather than falsely claiming that an Owner → existing member → accept → shared data → Allow/Deny/Verify journey has executed."
      }),
    },
  ];
}
