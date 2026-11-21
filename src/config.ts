// Plainly — routing + product defaults.
// These are the in-app fallbacks; Remote Config can override them at runtime
// (see src/remoteConfig.ts). Values are intentionally conservative: Gemini Nano's
// context window is 9,216 tokens, and short private documents are the ones that
// matter most to keep on-device.

export const DEFAULTS = {
  // Documents up to this many characters are attempted on-device in Auto mode.
  onDeviceMaxChars: 1200,
  // "auto" | "device" | "cloud"
  defaultMode: "auto" as const,
  // Cloud model used for the fallback / cloud-only path.
  cloudModel: "gemini-2.5-flash",
};

export type TaskId = "explain" | "keypoints" | "actions" | "watchouts";

export const TASKS: Record<
  TaskId,
  { label: string; short: string }
> = {
  explain: { label: "Explain simply", short: "plain-language explanation" },
  keypoints: { label: "Key points", short: "the key points" },
  actions: { label: "Action items", short: "action items with dates" },
  watchouts: { label: "Watch out for", short: "risks and catches to watch out for" },
};
