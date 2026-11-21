// Plainly — Firebase configuration.
//
// Fill this in from the Firebase console (Project settings > Your apps > Web app).
// Steps for the console (parent runs these in the browser):
//   1. console.firebase.google.com → create project "plainly-hybrid-ai" (no Analytics needed)
//   2. AI Services > AI Logic → Get started → Gemini Developer API (free, no billing)
//      (this also enforces App Check for AI Logic)
//   3. Project settings → add a Web app → copy the config object below
//   4. Firestore Database → create (production mode, region of choice)
//   5. Authentication → Sign-in method → enable Anonymous
//   6. App Check → register the web app; for local dev use the debug provider
//      (see src/firebase.ts); for production use reCAPTCHA Enterprise and paste
//      the site key into appCheckSiteKey below.
//   7. Remote Config → add parameters (optional, defaults below are used otherwise):
//      on_device_max_chars (1200), default_mode ("auto"), cloud_model ("gemini-2.5-flash")
//
// The apiKey below is a public client identifier, not a secret — but it only
// works once the Firebase project above exists. While the values are still
// placeholders, the app runs in clearly-labelled Demo mode (no real AI calls).

export const firebaseConfig = {
  apiKey: "AIzaSyCVKIidx5GynfoS362QQHRlE5qbShAO79c",
  authDomain: "plainly-hackathon.firebaseapp.com",
  projectId: "plainly-hackathon",
  storageBucket: "plainly-hackathon.firebasestorage.app",
  messagingSenderId: "199896079293",
  appId: "1:199896079293:web:334cf2fe3381112ffe90d4",
};

// reCAPTCHA Enterprise site key for App Check in production.
// Leave empty for local development (debug provider is used instead).
export const appCheckSiteKey = "6LemICsuAAAAANna4GZ-xtGkY8DVhoQW-wuw7drF";

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID";
