// Plainly — hybrid inference engine (Firebase AI Logic).
//
// One call, two engines:
//   - Short, private documents run ON-DEVICE in Chrome via Gemini Nano
//     (Chrome's Prompt API). Nothing leaves the device.
//   - Long or complex documents fall back to a cloud Gemini model.
// The routing decision is made BEFORE the call, shown to the user, and the
// response tells us which engine actually ran (inferenceSource).

import { initializeApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
} from "firebase/ai";
import {
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config";
import { DEFAULTS, type TaskId } from "./config";

// Chrome's Prompt API is not in TypeScript's DOM lib yet.
declare global {
  interface Window {
    LanguageModel?: {
      availability: () => Promise<
        "available" | "downloading" | "downloadable" | "unavailable"
      >;
    };
  }
}

export type EngineMode = "auto" | "device" | "cloud";
export type EngineUsed = "on-device" | "cloud";

export interface ExplainResult {
  summary: string;
  keyPoints: string[];
  actionItems: { text: string; due?: string }[];
  watchOuts: string[];
  engine: EngineUsed;
  latencyMs: number;
  bytesSentToCloud: number;
  routeReason: string;
  demoMode: boolean;
}

export interface RouteDecision {
  sdkMode: (typeof InferenceMode)[keyof typeof InferenceMode];
  reason: string;
  mayUseDevice: boolean;
}

/** Decide the route BEFORE calling the model, and show the reason in the UI. */
export function decideRoute(
  textLen: number,
  hasImage: boolean,
  mode: EngineMode,
  maxChars: number,
): RouteDecision {
  if (mode === "device") {
    return {
      sdkMode: InferenceMode.ONLY_ON_DEVICE,
      reason: "You asked for on-device only — nothing will leave this device.",
      mayUseDevice: true,
    };
  }
  if (mode === "cloud") {
    return {
      sdkMode: InferenceMode.ONLY_IN_CLOUD,
      reason: "You asked for cloud only.",
      mayUseDevice: false,
    };
  }
  // Auto: privacy-first. Short documents stay on-device; long ones need the cloud.
  if (textLen > maxChars) {
    return {
      sdkMode: InferenceMode.ONLY_IN_CLOUD,
      reason: `Too long for on-device Gemini Nano (${textLen.toLocaleString()} characters — limit ${maxChars.toLocaleString()}), so this goes to the cloud.`,
      mayUseDevice: false,
    };
  }
  if (hasImage) {
    return {
      sdkMode: InferenceMode.PREFER_ON_DEVICE,
      reason:
        "Photo + short text — Gemini Nano will try it on-device first, cloud if it can't.",
      mayUseDevice: true,
    };
  }
  return {
    sdkMode: InferenceMode.PREFER_ON_DEVICE,
    reason:
      "Short document — it stays on your device and is explained by Gemini Nano.",
    mayUseDevice: true,
  };
}

// The same JSON shape is enforced on both paths: as a responseSchema for the
// cloud model and as a responseConstraint for the on-device model.
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          due: { type: "string" },
        },
        required: ["text"],
      },
    },
    watchOuts: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keyPoints", "actionItems", "watchOuts"],
} as const;

const SYSTEM_PROMPT =
  "You are Plainly, a plain-language explainer. Explain documents so a " +
  "non-expert can understand them. Use simple words, short sentences, no jargon. " +
  "Never invent facts that are not in the document. If a date, amount or deadline " +
  "appears in the document, keep it exact. Reply ONLY with the requested JSON.";

function buildPrompt(task: TaskId, docText: string): string {
  const taskLine: Record<TaskId, string> = {
    explain:
      "Explain this document in plain language, as if to a friend who has never seen one like it.",
    keypoints: "List the key points of this document — what it says and what it means.",
    actions:
      "List every action the reader must take, with the deadline for each if the document states one.",
    watchouts:
      "List the risks, catches, penalties and things to watch out for in this document.",
  };
  return (
    `${SYSTEM_PROMPT}\n\n${taskLine[task]}\n\n` +
    `Return JSON with exactly these fields: summary (string), keyPoints (array of strings), ` +
    `actionItems (array of {text, due}), watchOuts (array of strings). ` +
    `Fill every field; use empty arrays when there is nothing to list.\n\nDocument:\n${docText}`
  );
}

function parseResult(raw: string): Omit<
  ExplainResult,
  "engine" | "latencyMs" | "bytesSentToCloud" | "routeReason" | "demoMode"
> {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return {
      summary: String(parsed.summary ?? ""),
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.map(String)
        : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((a: unknown) =>
            typeof a === "string"
              ? { text: a }
              : {
                  text: String((a as { text?: unknown }).text ?? ""),
                  due:
                    (a as { due?: unknown }).due != null
                      ? String((a as { due?: unknown }).due)
                      : undefined,
                },
          )
        : [],
      watchOuts: Array.isArray(parsed.watchOuts)
        ? parsed.watchOuts.map(String)
        : [],
    };
  } catch {
    // The model did not return JSON — keep the raw text as the summary so
    // the user still gets an answer instead of an error.
    return { summary: raw.trim(), keyPoints: [], actionItems: [], watchOuts: [] };
  }
}

let firebaseApp: ReturnType<typeof initializeApp> | null = null;

function getFirebaseApp() {
  if (!firebaseApp) firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
}

export async function checkOnDeviceAvailability(): Promise<string> {
  try {
    if (!("LanguageModel" in window) || !window.LanguageModel) {
      return "unavailable";
    }
    return await window.LanguageModel.availability();
  } catch {
    return "unavailable";
  }
}

export interface ExplainOptions {
  task: TaskId;
  docText: string;
  image?: { mimeType: string; data: string } | null;
  mode: EngineMode;
  maxChars: number;
  cloudModel: string;
  onDownloadProgress?: (fraction: number) => void;
}

export async function explain(opts: ExplainOptions): Promise<ExplainResult> {
  const route = decideRoute(
    opts.docText.length,
    !!opts.image,
    opts.mode,
    opts.maxChars,
  );

  // No Firebase project wired up yet: clearly-labelled demo mode so the UI
  // can still be tried end to end. Real builds always take the path below.
  if (!isFirebaseConfigured) {
    return explainDemo(opts, route.reason);
  }

  const ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    mode: route.sdkMode,
    inCloudParams: {
      model: opts.cloudModel,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESULT_SCHEMA as never,
      },
    },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [
          {
            role: "system",
            content: [{ type: "text", value: SYSTEM_PROMPT }],
          },
        ],
      },
      promptOptions: {
        responseConstraint: RESULT_SCHEMA as never,
      },
    },
  });

  if (route.mayUseDevice) {
    // Must be called on a user gesture, before generateContent. Shows the
    // Nano download progress on the button while the model downloads.
    await model.initializeDeviceModel((fraction: number) =>
      opts.onDownloadProgress?.(fraction),
    );
  }

  const prompt = buildPrompt(opts.task, opts.docText);
  const started = performance.now();
  const result = await model.generateContent(
    opts.image
      ? [prompt, { type: "inlineData" as const, inlineData: opts.image }]
      : prompt,
  );
  const latencyMs = Math.round(performance.now() - started);

  const source = result.response.inferenceSource;
  const engine: EngineUsed =
    source === InferenceSource.ON_DEVICE ? "on-device" : "cloud";
  const parsed = parseResult(result.response.text());
  return {
    ...parsed,
    engine,
    latencyMs,
    bytesSentToCloud:
      engine === "on-device" ? 0 : new Blob([prompt]).size,
    routeReason: route.reason,
    demoMode: false,
  };
}

// --- Demo mode (only when no Firebase config is present) -------------------
function explainDemo(opts: ExplainOptions, reason: string): ExplainResult {
  const text = opts.docText;
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text.slice(0, 200);
  const words = text.split(/\s+/).length;
  return {
    summary: `(Demo mode — connect Firebase to use real AI.) ${firstSentence} The document has about ${words} words.`,
    keyPoints: [
      "This is a demo answer shown before Firebase is connected.",
      `The document is ${text.length.toLocaleString()} characters long.`,
      "In the real app, Gemini Nano explains short documents on your device, and Gemini in the cloud handles long ones.",
    ],
    actionItems: [{ text: "Connect Firebase (see README) to get real explanations." }],
    watchOuts: ["Demo answers are placeholders, not real analysis."],
    engine: opts.mode === "cloud" ? "cloud" : "on-device",
    latencyMs: 42,
    bytesSentToCloud: 0,
    routeReason: reason,
    demoMode: true,
  };
}

export { DEFAULTS };
