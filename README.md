# Plainly — your letters, explained on your device

**An entry for Google's #BuildHybridAI 2026 hackathon** (Web platform).

Paste a rental agreement, a school letter, an insurance decision — Plainly
explains it in plain language. The hybrid part is the point:

- **Short documents stay on your device.** Gemini Nano (Chrome's built-in
  on-device model) explains them right in the browser. Nothing is uploaded —
  0 bytes sent to the cloud, free, and it works offline.
- **Long documents go to the cloud.** Gemini in the cloud handles them, and
  Plainly says so, with the reason.
- **Every answer is labelled** with the engine that actually ran it, from
  Firebase AI Logic's `inferenceSource` (`ON_DEVICE` / `IN_CLOUD`).

## How it works

1. Paste text, upload a `.txt`/`.md` file, or upload a photo of a letter
   (JPG/PNG — on-device multimodal input).
2. Pick what you need: explain simply, key points, action items, or risks.
3. Pick where it runs: Auto (privacy-first), on-device only, or cloud only.
4. Plainly routes **before** calling the model: documents up to 1,200
   characters (tunable via Remote Config) go to Gemini Nano; longer ones go
   straight to cloud Gemini with the reason shown. The routing decision is
   visible in the UI — nothing is silently decided for you.

## What Firebase AI Logic does here

- `firebase/ai` with `GoogleAIBackend`, `getGenerativeModel({ mode:
  InferenceMode.PREFER_ON_DEVICE, inCloudParams, onDeviceParams })`
- `model.initializeDeviceModel()` on the Explain click (with download
  progress on the button), `generateContent()`, `response.inferenceSource`
- Structured JSON output enforced on **both** paths: `responseSchema` for
  the cloud model, `responseConstraint` for the on-device model
- Default cloud model: `gemini-3.5-flash-lite` (overridable via Remote Config)
- App Check enforced for AI Logic (debug provider locally, reCAPTCHA
  Enterprise in production)
- Anonymous Auth + Firestore for the saved-explanations library (see
  `firestore.rules` — users only ever see their own documents)
- Remote Config: `on_device_max_chars`, `default_mode`, `cloud_model`

## Try it

**Live demo:** https://kabla1696-ctrl.github.io/plainly/ (after GitHub Pages is enabled)

**Local dev:**
```bash
npm install
npm run dev
```
Open in Chrome 139+ on desktop. Enable
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, then run
`await LanguageModel.availability()` in DevTools to check the on-device
model (it downloads on first use — the Explain button shows progress).

**Without a Firebase project** the app runs in clearly-labelled Demo mode
with placeholder answers, so the UI can still be tried end to end. To use
real AI, fill in `src/firebase-config.ts` from the Firebase console:

1. Create a project at console.firebase.google.com (no Analytics needed).
2. AI Services → AI Logic → Get started → Gemini Developer API (free).
3. Project settings → add a Web app → copy the config into
   `src/firebase-config.ts`.
4. Firestore → create database (production mode) and deploy `firestore.rules`.
5. Authentication → enable Anonymous sign-in.
6. App Check → register the web app; safelist your debug token for local dev,
   add a reCAPTCHA Enterprise site key for production.
7. Remote Config (optional): `on_device_max_chars` = 1200,
   `default_mode` = auto, `cloud_model` = gemini-2.5-flash.

## What I built during the submission period

Everything in this repo was built 21–30 Nov 2026 for #BuildHybridAI: the
app, the hybrid routing, the Firestore library, the samples, and the demo
video. No prior codebase existed.

## License

MIT — see `LICENSE`.
