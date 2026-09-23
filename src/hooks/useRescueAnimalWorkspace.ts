import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  addRescueDocument,
  addRescueFosterPlacement,
  addRescueReminder,
  addRescueTransfer,
  appendRescueCareRecord,
  getRescueAccess,
  getRescueAnimal,
  getRescueOrganisation,
  setRescueReminderComplete,
  updateRescueAnimal,
} from "../services/rescueService";
import type {
  RescueAnimal,
  RescueAnimalStatus,
  RescueCareRecordType,
  RescueDocument,
  RescueReminder,
  RescueReminderPriority,
  RescueVisibility,
  RescueOrganisation,
} from "../types/rescue";
import { calculateIndividualProfile, RECORD_LABELS } from "../lib/rescueWorkspace";

export function useRescueAnimalWorkspace() {
  const { animalId } = useParams<{ animalId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [animal, setAnimal] = useState<RescueAnimal | null>(null);
  const [organisation, setOrganisation] = useState<RescueOrganisation | null>(null);
  const [tab, setTab] = useState<"overview" | "care" | "tasks" | "foster" | "transfer" | "documents" | "adoption">("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recordType, setRecordType] = useState<RescueCareRecordType>("note");
  const [recordTitle, setRecordTitle] = useState("");
  const [recordSummary, setRecordSummary] = useState("");
  const [recordDetails, setRecordDetails] = useState("");
  const [recordValue, setRecordValue] = useState("");
  const [recordFood, setRecordFood] = useState("");
  const [recordAccepted, setRecordAccepted] = useState("unknown");
  const [recordVisibility, setRecordVisibility] = useState<RescueVisibility>("staff");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const [reminderKind, setReminderKind] = useState("follow-up");
  const [reminderPriority, setReminderPriority] = useState<RescueReminderPriority>("normal");
  const [reminderNotes, setReminderNotes] = useState("");
  const [fosterName, setFosterName] = useState("");
  const [fosterContact, setFosterContact] = useState("");
  const [fosterNotes, setFosterNotes] = useState("");
  const [transferDirection, setTransferDirection] = useState<"incoming" | "outgoing">("outgoing");
  const [transferParty, setTransferParty] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentCategory, setDocumentCategory] = useState<RescueDocument["category"]>("other");
  const [documentNote, setDocumentNote] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editEnclosure, setEditEnclosure] = useState("");
  const [editStatus, setEditStatus] = useState<RescueAnimalStatus>("in_care");

  const load = useCallback(async () => {
    if (!animalId) return;
    const current = await getRescueAnimal(animalId);
    setAnimal(current);
    if (current) {
      setOrganisation(await getRescueOrganisation(current.organisationId));
      setEditSummary(current.publicSummary || "");
      setEditEnclosure(current.enclosure || "");
      setEditStatus(current.status);
    }
  }, [animalId]);

  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Could not load this animal record."),
    );
  }, [load]);

  const access = getRescueAccess(organisation, user?.uid);
  const profile = useMemo(
    () => (animal ? calculateIndividualProfile(animal) : null),
    [animal],
  );
  const isEditor = access.canEdit && Boolean(user);

  async function withBusy(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCareRecord() {
    if (!animal || !user || !isEditor) return;
    await withBusy(async () => {
      await appendRescueCareRecord(animal.id, {
        type: recordType,
        occurredAt: new Date().toISOString(),
        title: recordTitle.trim() || RECORD_LABELS[recordType],
        summary: recordSummary.trim(),
        details: recordDetails.trim(),
        recordedByUid: user.uid,
        visibility: recordVisibility,
        value: recordValue.trim() ? Number(recordValue) : null,
        unit: recordType === "weight" ? "g" : undefined,
        foodType: recordFood.trim() || undefined,
        accepted: recordType === "feeding"
          ? (recordAccepted === "unknown" ? null : recordAccepted === "accepted")
          : undefined,
      });
      setRecordTitle("");
      setRecordSummary("");
      setRecordDetails("");
      setRecordValue("");
      setRecordFood("");
      setRecordAccepted("unknown");
    }, "Care record added to the animal timeline.");
  }

  async function saveReminder() {
    if (!animal || !user || !isEditor || !reminderTitle.trim() || !reminderDue) return;
    await withBusy(async () => {
      await addRescueReminder(animal.id, {
        title: reminderTitle.trim(),
        dueAt: new Date(reminderDue).toISOString(),
        kind: reminderKind.trim() || "follow-up",
        priority: reminderPriority,
        completed: false,
        notes: reminderNotes.trim(),
        createdByUid: user.uid,
      });
      setReminderTitle("");
      setReminderDue("");
      setReminderNotes("");
    }, "Reminder added.");
  }

  async function toggleReminder(item: RescueReminder) {
    if (!animal || !isEditor) return;
    await withBusy(
      () => setRescueReminderComplete(animal.id, item.id, !item.completed),
      item.completed ? "Reminder reopened." : "Reminder completed.",
    );
  }

  async function saveFoster() {
    if (!animal || !user || !isEditor || !fosterName.trim()) return;
    await withBusy(async () => {
      await addRescueFosterPlacement(animal.id, {
        startedAt: new Date().toISOString(),
        fosterName: fosterName.trim(),
        contact: fosterContact.trim(),
        notes: fosterNotes.trim(),
        status: "active",
        recordedByUid: user.uid,
        visibility: "staff",
      });
      setFosterName("");
      setFosterContact("");
      setFosterNotes("");
    }, "Foster placement recorded.");
  }

  async function saveTransfer() {
    if (!animal || !user || !isEditor || !transferParty.trim()) return;
    await withBusy(async () => {
      await addRescueTransfer(animal.id, {
        occurredAt: new Date().toISOString(),
        direction: transferDirection,
        organisationOrPerson: transferParty.trim(),
        reason: transferReason.trim(),
        reference: transferReference.trim(),
        notes: transferNotes.trim(),
        recordedByUid: user.uid,
        visibility: "staff",
      });
      await updateRescueAnimal(animal.id, {
        status: transferDirection === "outgoing" ? "transferred" : "in_care",
      });
      setTransferParty("");
      setTransferReason("");
      setTransferReference("");
      setTransferNotes("");
    }, "Transfer recorded and animal status updated.");
  }

  async function saveDocument() {
    if (!animal || !user || !isEditor || !documentTitle.trim()) return;
    await withBusy(async () => {
      await addRescueDocument(animal.id, {
        title: documentTitle.trim(),
        category: documentCategory,
        note: documentNote.trim(),
        addedAt: new Date().toISOString(),
        addedByUid: user.uid,
        visibility: documentCategory === "medical" ? "medical" : "staff",
      });
      setDocumentTitle("");
      setDocumentNote("");
    }, "Document entry added.");
  }

  async function saveAnimalCore() {
    if (!animal || !isEditor) return;
    await withBusy(async () => {
      await updateRescueAnimal(animal.id, {
        publicSummary: editSummary.trim(),
        enclosure: editEnclosure.trim(),
        status: editStatus,
      });
    }, "Animal core updated.");
  }

  return {
    navigate,user,animal,organisation,tab,setTab,busy,message,recordType,setRecordType,recordTitle,setRecordTitle,
    recordSummary,setRecordSummary,recordDetails,setRecordDetails,recordValue,setRecordValue,recordFood,setRecordFood,
    recordAccepted,setRecordAccepted,recordVisibility,setRecordVisibility,reminderTitle,setReminderTitle,reminderDue,setReminderDue,
    reminderKind,setReminderKind,reminderPriority,setReminderPriority,reminderNotes,setReminderNotes,fosterName,setFosterName,
    fosterContact,setFosterContact,fosterNotes,setFosterNotes,transferDirection,setTransferDirection,transferParty,setTransferParty,
    transferReason,setTransferReason,transferReference,setTransferReference,transferNotes,setTransferNotes,documentTitle,setDocumentTitle,
    documentCategory,setDocumentCategory,documentNote,setDocumentNote,editSummary,setEditSummary,editEnclosure,setEditEnclosure,
    editStatus,setEditStatus,access,profile,isEditor,saveCareRecord,saveReminder,toggleReminder,saveFoster,saveTransfer,saveDocument,
    saveAnimalCore,withBusy,updateRescueAnimal,
  };
}
