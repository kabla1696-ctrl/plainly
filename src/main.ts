// Plainly — UI wiring. All Firebase AI calls go through src/ai.ts;
// all persistence through src/library.ts. This file only touches the DOM.

import "./style.css";
import { InferenceMode } from "firebase/ai";
import {
  checkOnDeviceAvailability,
  decideRoute,
  explain,
  type EngineMode,
  type ExplainResult,
} from "./ai";
import {
  getRemoteValue,
  initServices,
} from "./firebase";
import {
  deleteExplanation,
  listExplanations,
  saveExplanation,
} from "./library";
import { SAMPLES } from "./samples";
import { DEFAULTS, type TaskId } from "./config";
import { isFirebaseConfigured } from "./firebase-config";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const docInput = $<HTMLTextAreaElement>("doc-input");
const charCount = $("char-count");
const routePreview = $("route-preview");
const explainBtn = $<HTMLButtonElement>("explain-btn");
const errorBox = $("error-box");
const resultCard = $("result-card");
const statusPill = $("status-pill");

let imageData: { mimeType: string; data: string } | null = null;
let lastResult: ExplainResult | null = null;
let lastTask: TaskId = "explain";
let maxChars = DEFAULTS.onDeviceMaxChars;
let cloudModel = DEFAULTS.cloudModel;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function selectedTask(): TaskId {
  return (
    (document.querySelector('input[name="task"]:checked') as HTMLInputElement)
      ?.value as TaskId
  ) ?? "explain";
}

function selectedMode(): EngineMode {
  return (
    (document.querySelector('input[name="mode"]:checked') as HTMLInputElement)
      ?.value as EngineMode
  ) ?? "auto";
}

function updateRoutePreview() {
  const len = docInput.value.length;
  charCount.textContent = `${len.toLocaleString()} characters${imageData ? " + photo" : ""}`;
  if (len === 0 && !imageData) {
    routePreview.textContent = "";
    return;
  }
  const route = decideRoute(len, !!imageData, selectedMode(), maxChars);
  routePreview.textContent =
    route.sdkMode === InferenceMode.ONLY_IN_CLOUD
      ? "☁️ Will use the cloud"
      : route.sdkMode === InferenceMode.ONLY_ON_DEVICE
        ? "🔒 Will stay on this device"
        : "🔒 Will try on-device first";
  routePreview.title = route.reason;
}

function renderList(items: string[], el: HTMLElement) {
  el.innerHTML =
    items.length > 0
      ? items.map((i) => `<li>${esc(i)}</li>`).join("")
      : `<li class="muted">Nothing listed.</li>`;
}

function renderActions(
  items: { text: string; due?: string }[],
  el: HTMLElement,
) {
  el.innerHTML =
    items.length > 0
      ? items
          .map(
            (a) =>
              `<li>${esc(a.text)}${a.due ? ` — <strong>by ${esc(a.due)}</strong>` : ""}</li>`,
          )
          .join("")
      : `<li class="muted">Nothing to do.</li>`;
}

function showResult(result: ExplainResult) {
  lastResult = result;
  resultCard.hidden = false;
  const badge = $("engine-badge");
  if (result.engine === "on-device") {
    badge.textContent = "🔒 On this device · Gemini Nano";
    badge.className = "engine-badge on-device";
  } else {
    badge.textContent = "☁️ Cloud · Gemini";
    badge.className = "engine-badge in-cloud";
  }
  $("route-reason").textContent = result.routeReason;
  $("latency-line").textContent =
    result.engine === "on-device"
      ? `Answered in ${(result.latencyMs / 1000).toFixed(1)}s — nothing left your device (0 bytes sent to the cloud).`
      : `Answered in ${(result.latencyMs / 1000).toFixed(1)}s — about ${(result.bytesSentToCloud / 1024).toFixed(1)} KB sent to Google's cloud.`;
  $("demo-note").hidden = !result.demoMode;
  $("result-summary").textContent = result.summary || "—";
  renderList(result.keyPoints, $("result-keypoints"));
  renderActions(result.actionItems, $("result-actions"));
  renderList(result.watchOuts, $("result-watchouts"));
  $("save-status").textContent = "";
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(message: string) {
  errorBox.hidden = false;
  errorBox.textContent = message;
}

async function onExplain() {
  errorBox.hidden = true;
  const text = docInput.value.trim();
  if (!text && !imageData) {
    showError("Paste a document, upload a file, or try a sample first.");
    return;
  }
  lastTask = selectedTask();
  explainBtn.disabled = true;
  explainBtn.textContent = "Explaining…";
  try {
    const result = await explain({
      task: lastTask,
      docText: text,
      image: imageData,
      mode: selectedMode(),
      maxChars,
      cloudModel,
      onDownloadProgress: (fraction) => {
        explainBtn.textContent =
          fraction < 1
            ? `Downloading on-device model… ${Math.round(fraction * 100)}%`
            : "Explaining…";
      },
    });
    showResult(result);
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (/on-device|device model|not available/i.test(msg)) {
      showError(
        "The on-device model isn't available in this browser. " +
          "Try Chrome 139+ on desktop with the Prompt API flag enabled, " +
          "or switch the mode to Cloud only. Details: " + msg,
      );
    } else {
      showError("Something went wrong: " + msg);
    }
  } finally {
    explainBtn.disabled = false;
    explainBtn.textContent = "Explain it →";
  }
}

async function refreshLibrary() {
  const list = $("library-list");
  const empty = $("library-empty");
  try {
    const items = await listExplanations();
    empty.hidden = items.length > 0;
    list.innerHTML = items
      .map(
        (it) => `<li>
          <button type="button" data-open="${it.id}" class="lib-title">${esc(it.title)}</button>
          <span class="lib-meta">${esc(it.engine)} · ${esc(it.task)}</span>
          <button type="button" data-del="${it.id}" class="ghost-btn small">Delete</button>
        </li>`,
      )
      .join("");
    list.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = items.find(
          (i) => i.id === (btn as HTMLElement).dataset.open,
        );
        if (!item) return;
        docInput.value = item.sourceText;
        updateRoutePreview();
        showResult({
          summary: item.summary,
          keyPoints: item.keyPoints,
          actionItems: item.actionItems,
          watchOuts: item.watchOuts,
          engine: item.engine === "on-device" ? "on-device" : "cloud",
          latencyMs: item.latencyMs,
          bytesSentToCloud: 0,
          routeReason: "Reopened from your library.",
          demoMode: false,
        });
      });
    });
    list.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await deleteExplanation((btn as HTMLElement).dataset.del!);
        await refreshLibrary();
      });
    });
  } catch {
    empty.hidden = false;
    empty.textContent = "Library needs Firebase — connect it to save explanations.";
  }
}

function initSamples() {
  const box = $("samples");
  for (const s of SAMPLES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sample-btn";
    btn.textContent = s.title;
    btn.addEventListener("click", () => {
      docInput.value = s.text;
      imageData = null;
      $("image-preview").hidden = true;
      updateRoutePreview();
      docInput.focus();
    });
    box.appendChild(btn);
  }
}

function initFileInputs() {
  $<HTMLInputElement>("file-text").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    docInput.value = await file.text();
    updateRoutePreview();
  });
  $<HTMLInputElement>("file-image").addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      imageData = { mimeType: file.type, data: base64 };
      const img = $<HTMLImageElement>("image-preview-img");
      img.src = dataUrl;
      $("image-preview").hidden = false;
      updateRoutePreview();
    };
    reader.readAsDataURL(file);
  });
  $("remove-image-btn").addEventListener("click", () => {
    imageData = null;
    $("image-preview").hidden = true;
    updateRoutePreview();
  });
  $("clear-btn").addEventListener("click", () => {
    docInput.value = "";
    imageData = null;
    $("image-preview").hidden = true;
    resultCard.hidden = true;
    updateRoutePreview();
  });
}

async function init() {
  initSamples();
  initFileInputs();
  docInput.addEventListener("input", updateRoutePreview);
  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener("change", updateRoutePreview),
  );
  explainBtn.addEventListener("click", onExplain);
  $("save-btn").addEventListener("click", async () => {
    if (!lastResult) return;
    try {
      const title =
        docInput.value.trim().split("\n")[0]?.slice(0, 80) || "Untitled document";
      await saveExplanation(title, lastTask, docInput.value, lastResult);
      $("save-status").textContent = "Saved to your library ✓";
      await refreshLibrary();
    } catch (e) {
      $("save-status").textContent =
        "Could not save: " + ((e as Error).message || String(e));
    }
  });
  $("copy-btn").addEventListener("click", async () => {
    if (!lastResult) return;
    const text = [
      lastResult.summary,
      "",
      "Key points:",
      ...lastResult.keyPoints.map((k) => "- " + k),
      "",
      "Action items:",
      ...lastResult.actionItems.map(
        (a) => `- ${a.text}${a.due ? ` (by ${a.due})` : ""}`,
      ),
      "",
      "Watch out for:",
      ...lastResult.watchOuts.map((w) => "- " + w),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    $("save-status").textContent = "Copied ✓";
  });

  // Service status + on-device availability (best effort, never blocks the UI).
  if (!isFirebaseConfigured) {
    statusPill.textContent = "⚠️ Demo mode — Firebase not connected yet";
  }
  try {
    const [services, deviceStatus] = await Promise.all([
      initServices(),
      checkOnDeviceAvailability(),
    ]);
    maxChars = Number(getRemoteValue("on_device_max_chars", String(maxChars))) || maxChars;
    cloudModel = getRemoteValue("cloud_model", cloudModel);
    const deviceLabel: Record<string, string> = {
      available: "🟢 Gemini Nano ready on this device",
      downloading: "🟡 Gemini Nano downloading…",
      downloadable: "🟡 Gemini Nano can be downloaded",
      unavailable: "⚪ On-device AI unavailable here — cloud will be used",
    };
    statusPill.textContent = isFirebaseConfigured
      ? `${deviceLabel[deviceStatus] ?? deviceStatus} · Firebase: ${services.auth}`
      : `${deviceLabel[deviceStatus] ?? deviceStatus} · Demo mode`;
    updateRoutePreview();
    await refreshLibrary();
  } catch {
    statusPill.textContent = "Plainly ready";
    updateRoutePreview();
  }
}

init();
