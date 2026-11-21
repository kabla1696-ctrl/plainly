// Plainly — saved-explanations library (Firestore, anonymous auth).
// Each document belongs to the anonymous user who created it; see
// firestore.rules in the repo root.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getAuthUid, getDb } from "./firebase";
import type { ExplainResult } from "./ai";
import type { TaskId } from "./config";

export interface SavedItem {
  id: string;
  title: string;
  task: TaskId;
  sourceText: string;
  summary: string;
  keyPoints: string[];
  actionItems: { text: string; due?: string }[];
  watchOuts: string[];
  engine: string;
  latencyMs: number;
  createdAt?: unknown;
}

const COLLECTION = "plainly-summaries";

export async function saveExplanation(
  title: string,
  task: TaskId,
  sourceText: string,
  result: ExplainResult,
): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured yet.");
  const uid = getAuthUid();
  const ref = await addDoc(collection(db, COLLECTION), {
    ownerUid: uid,
    title,
    task,
    sourceText: sourceText.slice(0, 8000),
    summary: result.summary,
    keyPoints: result.keyPoints,
    actionItems: result.actionItems,
    watchOuts: result.watchOuts,
    engine: result.engine,
    latencyMs: result.latencyMs,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listExplanations(): Promise<SavedItem[]> {
  const db = getDb();
  if (!db) return [];
  const uid = getAuthUid();
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedItem, "id">) }));
}

export async function deleteExplanation(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, id));
}
