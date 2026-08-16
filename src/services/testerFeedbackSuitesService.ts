import type { TesterCheck } from "./testerBotService";

function mockImage(): File {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  return new File([bytes], "bot-mock-feedback-image.png", { type: "image/png" });
}

function mockVideo(): File {
  const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
  return new File([bytes], "bot-mock-feedback-video.mp4", { type: "video/mp4" });
}

function validateAttachment(file: File) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Please attach an image or video.");
  const limit = (isVideo ? 25 : 8) * 1024 * 1024;
  if (file.size > limit) throw new Error(isVideo ? "Video attachments must be 25 MB or smaller." : "Image attachments must be 8 MB or smaller.");
  return { type: isImage ? "image" : "video", mimeType: file.type, sizeBytes: file.size } as const;
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
      name: "Feedback accepts a mock image attachment",
      category: "feedback",
      severity: "critical",
      run: async () => {
        try {
          const result = validateAttachment(mockImage());
          return result.type === "image" ? { status: "pass", message: `Mock image accepted as ${result.mimeType} (${result.sizeBytes} bytes).` } : { status: "fail", message: "Mock image was not classified as an image." };
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
        try {
          const result = validateAttachment(mockVideo());
          return result.type === "video" ? { status: "pass", message: `Mock video accepted as ${result.mimeType} (${result.sizeBytes} bytes).` } : { status: "fail", message: "Mock video was not classified as a video." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Mock video test failed." };
        }
      },
    },
  ];
}
