import type { SettlementHistoryItem } from "../types";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type Language,
} from "../i18n";

const HISTORY_KEY = "settlement_history";
const LANGUAGE_KEY = "settlement_language";
const MAX_HISTORY_ITEMS = 10;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getCurrentParticipantStorageKey(settlementCode: string) {
  return `settlement_current_participant_${settlementCode}`;
}

export function getCurrentParticipantId(settlementCode: string) {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(getCurrentParticipantStorageKey(settlementCode));
}

export function setCurrentParticipantId(settlementCode: string, participantId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(getCurrentParticipantStorageKey(settlementCode), participantId);
}

export function removeCurrentParticipantId(settlementCode: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(getCurrentParticipantStorageKey(settlementCode));
}

export function getStoredLanguage(): Language {
  if (!canUseLocalStorage()) {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);

  return storedLanguage && isSupportedLanguage(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;
}

export function setStoredLanguage(language: Language) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(LANGUAGE_KEY, language);
}

export function getSettlementHistory(): SettlementHistoryItem[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is SettlementHistoryItem => {
        return (
          typeof item?.settlementCode === "string" &&
          typeof item?.settlementName === "string" &&
          typeof item?.participantId === "string" &&
          typeof item?.participantName === "string" &&
          typeof item?.joinedAt === "string" &&
          typeof item?.lastVisitedAt === "string"
        );
      })
      .sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt))
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function saveSettlementHistory(items: SettlementHistoryItem[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(items.sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt)).slice(0, MAX_HISTORY_ITEMS)),
  );
}

export function upsertSettlementHistory(item: SettlementHistoryItem) {
  const now = new Date().toISOString();
  const history = getSettlementHistory();
  const existingItem = history.find((historyItem) => historyItem.settlementCode === item.settlementCode);
  const currentItems = history.filter((historyItem) => historyItem.settlementCode !== item.settlementCode);
  const joinedAt =
    existingItem && existingItem.participantId === item.participantId ? existingItem.joinedAt : item.joinedAt || now;

  saveSettlementHistory([{ ...item, joinedAt, lastVisitedAt: item.lastVisitedAt || now }, ...currentItems]);
}

export function removeSettlementHistoryItem(settlementCode: string) {
  saveSettlementHistory(getSettlementHistory().filter((item) => item.settlementCode !== settlementCode));
}
