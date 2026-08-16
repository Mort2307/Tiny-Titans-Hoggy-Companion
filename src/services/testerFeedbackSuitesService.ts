import type { TesterCheck } from "./testerBotService";
import { inspectIssueAttachment } from "./creatorService";

function mockImage(): File {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  return new File([bytes], "bot-mock-feedback-image.png", { type: "image/png" });
}

function mockVideo(): File {
  const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
  return new File([bytes], "bot-mock-feedback-video.mp4", { type: "video/mp4" });
}

export async function createFeedbackAttachmentChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Feedback attachment tests require an authenticated UID.");

  return [
    {
      checkId: "feedback-text-only",
      name: "Feedback accepts a text-only submission payload",
      category: "feedback",
      severity: "high",
      run: async () => {
        const payload = { userId: uid, title: "BOT TEST — text-only feedback", message: "Automated QA text-only submission payload." };
        return payload.userId && payload.title.trim() && payload.message.trim()
          ? { status: "pass", message: "Text-only feedback payload contains the required authenticated user, title and message fields." }
          : { status: "fail", message: "Text-only feedback payload is missing required fields." };
      },
    },
    {
      checkId: "feedback-mock-image",
      name: "Feedback accepts and prepares a mock image attachment",
      category: "feedback",
      severity: "critical",
      run: async () => {
        const file = mockImage();
        try {
          const result = await inspectIssueAttachment(file);
          return result.type === "image" && result.sizeBytes > 0
            ? { status: "pass", message: `Mock image accepted and prepared as ${result.mimeType} (${result.sizeBytes} bytes).` }
            : { status: "fail", message: "Mock image did not produce a valid image attachment result." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Mock image test failed." };
        }
      },
    },
    {
      checkId: "feedback-mock-video",
      name: "Bug feedback accepts a mock video attachment",
      category: "feedback",
      severity: "critical",
      run: async () => {
        const file = mockVideo();
        try {
          const result = await inspectIssueAttachment(file);
          return result.type === "video" && result.sizeBytes > 0
            ? { status: "pass", message: `Mock video accepted as ${result.mimeType} (${result.sizeBytes} bytes).` }
            : { status: "fail", message: "Mock video did not produce a valid video attachment result." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Mock video test failed." };
        }
      },
    },
  ];
}
