import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
export const firebaseApp = initializeApp(firebaseConfig);
export const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});

const FIRESTORE_PERMISSION_ERROR_MESSAGE = "Firestore 권한이 거부됐어요.";
const FIRESTORE_TRANSPORT_ERROR_MESSAGE =
  "Firestore 연결에 실패했어요. Safari 또는 네트워크 설정을 확인해주세요.";
const FIRESTORE_TRANSPORT_ERROR_CODES = new Set([
  "unavailable",
  "aborted",
  "deadline-exceeded",
]);

export function getFirestoreRealtimeErrorMessage(error: unknown) {
  const code = getErrorCode(error);

  if (code === "permission-denied") {
    return FIRESTORE_PERMISSION_ERROR_MESSAGE;
  }

  if (FIRESTORE_TRANSPORT_ERROR_CODES.has(code)) {
    return FIRESTORE_TRANSPORT_ERROR_MESSAGE;
  }

  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (isTransportErrorMessage(normalizedMessage)) {
    return FIRESTORE_TRANSPORT_ERROR_MESSAGE;
  }

  if (normalizedMessage.includes("missing or insufficient permissions")) {
    return FIRESTORE_PERMISSION_ERROR_MESSAGE;
  }

  return message || FIRESTORE_TRANSPORT_ERROR_MESSAGE;
}

function getErrorCode(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "";
}

function isTransportErrorMessage(message: string) {
  return [
    "access control",
    "client is offline",
    "cors",
    "failed to fetch",
    "fetch api cannot load",
    "listen/channel",
    "load failed",
    "network",
    "transport",
  ].some((transportPattern) => message.includes(transportPattern));
}
