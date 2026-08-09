import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "../lib/logger";
import { findAttachedAsset } from "./paths";
import "./runtime-config";

function findServiceAccount(): Record<string, string> | null {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [
    configuredPath ? path.resolve(configuredPath) : null,
    path.resolve(process.cwd(), "serviceAccountKey.json"),
    path.resolve(process.cwd(), "artifacts/api-server/serviceAccountKey.json"),
    findAttachedAsset((file) =>
      file.startsWith("serviceAccountKey") && file.endsWith(".json"),
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, "utf8")) as Record<string, string>;
    } catch (error) {
      logger.warn({ err: error }, "No se pudo leer el archivo de credenciales de Firebase");
      return null;
    }
  }
  return null;
}

function initializeFirebase(): App | null {
  if (getApps().length) return getApps()[0]!;
  const serviceAccount = findServiceAccount();
  if (!serviceAccount) return null;
  try {
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (error) {
    logger.warn({ err: error }, "Firebase no pudo inicializarse; se usará SQLite local");
    return null;
  }
}

const app = initializeFirebase();
export const firestore: Firestore | null = app ? getFirestore(app) : null;
export const firebaseEnabled = Boolean(firestore);