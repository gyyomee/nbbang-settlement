import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
  writeBatch,
} from "firebase/firestore";
import { ArrowRight, Plus, ReceiptText, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, hasFirebaseConfig } from "../firebase";
import { homeTranslations, useCurrentLanguage } from "../i18n";
import type { Participant, Settlement, SettlementHistoryItem } from "../types";
import { formatDateTime } from "../utils/format";
import {
  generateSettlementCode,
  isValidSettlementCode,
  normalizeSettlementCode,
} from "../utils/settlementCode";
import {
  getSettlementHistory,
  removeSettlementHistoryItem,
  setCurrentParticipantId,
  upsertSettlementHistory,
} from "../utils/storage";
import {
  PARTICIPANT_NAME_MAX_LENGTH,
  getNameKey,
  isValidParticipantName,
  normalizeName,
} from "../utils/validation";
import { createClientId } from "../utils/id";

interface PendingJoin {
  settlement: Settlement;
  participant: Participant;
}

interface JoinPreview {
  settlement: Settlement;
  participants: Participant[];
}

type HomeMode = "create" | "join" | null;
type HomeTranslation = (typeof homeTranslations)["ko"];
const SETTLEMENT_EXPIRATION_DAYS = 90;

export default function HomePage() {
  const navigate = useNavigate();
  const language = useCurrentLanguage();
  const t = homeTranslations[language];
  const checkingPreviewMessage =
    language === "ko"
      ? "정산 정보를 확인하는 중..."
      : "Checking split information...";
  const [settlementName, setSettlementName] = useState("");
  const [myName, setMyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [history, setHistory] = useState<SettlementHistoryItem[]>(() =>
    getSettlementHistory(),
  );
  const [error, setError] = useState("");
  const [joinPreview, setJoinPreview] = useState<JoinPreview | null>(null);
  const [pendingJoin, setPendingJoin] = useState<PendingJoin | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "create" | "check" | "join" | "existing" | null
  >(null);
  const [mode, setMode] = useState<HomeMode>(null);
  const visibleHistory = history.filter(
    (item) => !isExpiredHistoryItem(item),
  );

  async function handleCreateSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSettlementName = settlementName.trim();
    const participantName = normalizeName(myName);

    if (!normalizedSettlementName) {
      setError(t.settlementNameRequired);
      return;
    }

    if (!participantName) {
      setError(t.myNameRequired);
      return;
    }

    if (!isValidParticipantName(participantName)) {
      setError(t.myNameMaxLength(PARTICIPANT_NAME_MAX_LENGTH));
      return;
    }

    if (!hasFirebaseConfig) {
      setError(t.firebaseConfigError);
      return;
    }

    try {
      setError("");
      setPendingJoin(null);
      setJoinPreview(null);
      setLoadingAction("create");

      const { save, ...createdSettlement } = createSettlementWithParticipant(
        normalizedSettlementName,
        participantName,
      );
      setLoadingAction(null);
      enterSettlement(createdSettlement);
      window.setTimeout(() => {
        save().catch((createError) => {
          alert(
            getFirestoreErrorMessage(
              createError,
              t.saveSettlementFailed,
              t,
            ),
          );
        });
      }, 100);
    } catch (createError) {
      setError(
        getFirestoreErrorMessage(createError, t.createSettlementFailed, t),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCheckSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const settlementCode = normalizeSettlementCode(joinCode);

    if (!isValidSettlementCode(settlementCode)) {
      setError(t.invalidSettlementCode);
      return;
    }

    if (!hasFirebaseConfig) {
      setError(t.firebaseConfigError);
      return;
    }

    if (joinPreview?.settlement.settlementCode === settlementCode) {
      setError("");
      setPendingJoin(null);
      return;
    }

    try {
      const startedAt = performance.now();
      setError("");
      setPendingJoin(null);
      setJoinPreview(null);
      setLoadingAction("check");

      const [settlementDoc, participantsSnapshot] = await Promise.all([
        getDoc(doc(db, "settlements", settlementCode)),
        getDocs(collection(db, "settlements", settlementCode, "participants")),
      ]);
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log("[join preview] loaded in", elapsedMs, "ms");

      if (!settlementDoc.exists()) {
        setError(t.settlementNotFound);
        return;
      }

      const settlement = settlementDoc.data() as Settlement;

      if (isSettlementExpired(settlement)) {
        setError("만료된 정산입니다.");
        return;
      }

      setJoinPreview({
        settlement,
        participants: participantsSnapshot.docs.map(
          (participantDoc) => participantDoc.data() as Participant,
        ),
      });
    } catch (joinError) {
      setError(
        getFirestoreErrorMessage(joinError, t.checkSettlementFailed, t),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleJoinSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!joinPreview) {
      setError(t.joinNeedsSettlementCheck);
      return;
    }

    if (pendingJoin) {
      await joinAsExistingParticipant();
      return;
    }

    const participantName = normalizeName(myName);

    if (!participantName) {
      setError(t.myNameRequired);
      return;
    }

    if (!isValidParticipantName(participantName)) {
      setError(t.myNameMaxLength(PARTICIPANT_NAME_MAX_LENGTH));
      return;
    }

    try {
      setError("");
      setPendingJoin(null);
      setLoadingAction("join");

      const settlement = joinPreview.settlement;
      const sameNameSnapshot = await getDocs(
        query(
          collection(
            db,
            "settlements",
            settlement.settlementCode,
            "participants",
          ),
          where("nameKey", "==", getNameKey(participantName)),
          limit(1),
        ),
      );

      if (!sameNameSnapshot.empty) {
        setPendingJoin({
          settlement,
          participant: sameNameSnapshot.docs[0].data() as Participant,
        });
        return;
      }

      await joinAsNewParticipant(settlement, participantName);
    } catch (joinError) {
      setError(
        getFirestoreErrorMessage(joinError, t.joinSettlementFailed, t),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function joinAsExistingParticipant() {
    if (!pendingJoin) {
      return;
    }

    try {
      setLoadingAction("existing");
      enterSettlement({
        settlementCode: pendingJoin.settlement.settlementCode,
        settlementName: pendingJoin.settlement.settlementName,
        participantId: pendingJoin.participant.id,
        participantName: pendingJoin.participant.name,
        expiresAt: getSettlementExpiresAtIso(pendingJoin.settlement),
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function joinAsNewParticipant(
    settlement: Settlement,
    participantName: string,
  ) {
    const participantId = createClientId();
    const now = Timestamp.now();
    await runTransaction(db, async (transaction) => {
      transaction.set(
        doc(
          db,
          "settlements",
          settlement.settlementCode,
          "participants",
          participantId,
        ),
        {
          id: participantId,
          name: participantName,
          nameKey: getNameKey(participantName),
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        } satisfies Participant,
      );
      transaction.update(doc(db, "settlements", settlement.settlementCode), {
        updatedAt: now,
      });
    });

    enterSettlement({
      settlementCode: settlement.settlementCode,
      settlementName: settlement.settlementName,
      participantId,
      participantName,
      expiresAt: getSettlementExpiresAtIso(settlement),
    });
  }

  function enterSettlement({
    settlementCode,
    settlementName,
    participantId,
    participantName,
    expiresAt,
  }: {
    settlementCode: string;
    settlementName: string;
    participantId: string;
    participantName: string;
    expiresAt?: string;
  }) {
    const now = new Date().toISOString();

    setCurrentParticipantId(settlementCode, participantId);
    upsertSettlementHistory({
      settlementCode,
      settlementName,
      participantId,
      participantName,
      joinedAt: now,
      lastVisitedAt: now,
      expiresAt,
    });
    setHistory(getSettlementHistory());
    navigate(`/settlements/${settlementCode}`, { flushSync: true });
  }

  function handleOpenHistoryItem(item: SettlementHistoryItem) {
    upsertSettlementHistory({
      ...item,
      lastVisitedAt: new Date().toISOString(),
    });
    setCurrentParticipantId(item.settlementCode, item.participantId);
    setHistory(getSettlementHistory());
    navigate(`/settlements/${item.settlementCode}`);
  }

  function handleRemoveHistoryItem(settlementCode: string) {
    removeSettlementHistoryItem(settlementCode);
    setHistory(getSettlementHistory());
  }

  function selectMode(nextMode: Exclude<HomeMode, null>) {
    setMode(nextMode);
    setError("");
    setPendingJoin(null);
    setJoinPreview(null);
  }

  function updateJoinName(nextName: string) {
    setMyName(nextName);

    if (!joinPreview) {
      setPendingJoin(null);
      return;
    }

    const participantName = normalizeName(nextName);
    const existingParticipant = participantName
      ? joinPreview.participants.find(
          (participant) =>
            participant.nameKey === getNameKey(participantName),
        )
      : null;

    setPendingJoin(
      existingParticipant
        ? {
            settlement: joinPreview.settlement,
            participant: existingParticipant,
          }
        : null,
    );
  }

  function selectPreviewParticipant(participant: Participant) {
    setError("");
    updateJoinName(participant.name);
  }

  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-black tracking-normal">
            {t.appTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-receipt-muted">
            {t.appSubtitle}
          </p>
        </header>

        {!hasFirebaseConfig ? (
          <div className="border border-receipt-danger bg-[#f5dfd8] px-3 py-3 text-sm leading-6 text-receipt-danger">
            {t.firebaseConfigError}
          </div>
        ) : null}

        <section className="receipt-section space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className={`key-button w-full ${mode === "create" ? "key-button-primary" : ""}`}
              type="button"
              onClick={() => selectMode("create")}
            >
              <Plus size={17} aria-hidden="true" />
              {t.createModeButton}
            </button>
            <button
              className={`key-button w-full ${mode === "join" ? "key-button-primary" : ""}`}
              type="button"
              onClick={() => selectMode("join")}
            >
              <ArrowRight size={17} aria-hidden="true" />
              {t.joinModeButton}
            </button>
          </div>
        </section>

        {mode === "create" ? (
          <form
            className="receipt-section space-y-4"
            onSubmit={handleCreateSettlement}
          >
            <div className="flex items-center gap-2">
              <ReceiptText size={18} aria-hidden="true" />
              <h2 className="text-base font-black">{t.createTitle}</h2>
            </div>

            <div>
              <label className="label" htmlFor="create-name">
                {t.myNameLabel}
              </label>
              <input
                className="input"
                id="create-name"
                maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                placeholder={t.myNamePlaceholder(
                  PARTICIPANT_NAME_MAX_LENGTH,
                )}
                value={myName}
                onChange={(event) => setMyName(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="settlement-name">
                {t.settlementNameLabel}
              </label>
              <input
                className="input"
                id="settlement-name"
                maxLength={40}
                placeholder={t.settlementNamePlaceholder}
                value={settlementName}
                onChange={(event) => setSettlementName(event.target.value)}
              />
            </div>

            <button
              className="key-button key-button-primary w-full"
              type="submit"
              disabled={Boolean(loadingAction)}
            >
              <Plus size={17} aria-hidden="true" />
              {loadingAction === "create" ? t.createLoading : t.createModeButton}
            </button>
          </form>
        ) : null}

        {mode === "join" ? (
          <section className="receipt-section space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight size={18} aria-hidden="true" />
              <h2 className="text-base font-black">{t.joinTitle}</h2>
            </div>

            <form className="space-y-4" onSubmit={handleCheckSettlement}>
              <div>
                <label className="label" htmlFor="join-code">
                  {t.settlementCodeLabel}
                </label>
                <input
                  className="input text-center text-xl font-black tracking-[0.18em]"
                  id="join-code"
                  maxLength={8}
                  placeholder={t.settlementCodePlaceholder}
                  value={joinCode}
                  onChange={(event) => {
                    const nextCode = normalizeSettlementCode(
                      event.target.value,
                    );
                    setJoinCode(nextCode);

                    if (
                      joinPreview?.settlement.settlementCode !== nextCode
                    ) {
                      setJoinPreview(null);
                      setPendingJoin(null);
                    }
                  }}
                />
              </div>

              <button
                className="key-button key-button-primary w-full"
                type="submit"
                disabled={Boolean(loadingAction)}
              >
                <ArrowRight size={17} aria-hidden="true" />
                {loadingAction === "check"
                  ? t.checkingSettlement
                  : t.checkSettlementButton}
              </button>
            </form>

            {loadingAction === "check" ? (
              <p className="border border-dashed border-receipt-line bg-white/55 px-3 py-3 text-sm font-bold leading-6 text-receipt-muted">
                {checkingPreviewMessage}
              </p>
            ) : null}

            {joinPreview ? (
              <div className="space-y-4 border border-receipt-line bg-white/55 p-3">
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <span className="text-sm font-bold text-receipt-muted">
                    {t.settlementNameLabel}
                  </span>
                  <span className="min-w-0 text-right text-sm font-black">
                    {joinPreview.settlement.settlementName}
                  </span>
                  <span className="text-sm font-bold text-receipt-muted">
                    {t.currentParticipantsLabel}
                  </span>
                  <span className="amount text-sm font-black">
                    {t.participantCount(joinPreview.participants.length)}
                  </span>
                </div>

                {joinPreview.participants.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {joinPreview.participants.map((participant) => (
                      <li key={participant.id}>
                        <button
                          className={`w-full border px-2 py-1.5 text-center text-sm font-bold shadow-key transition active:translate-y-0.5 active:shadow-none ${
                            pendingJoin?.participant.id === participant.id
                              ? "border-receipt-ink bg-receipt-button"
                              : "border-receipt-line bg-receipt-paper"
                          }`}
                          type="button"
                          onClick={() => selectPreviewParticipant(participant)}
                        >
                          {participant.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-receipt-muted">
                    {t.noParticipants}
                  </p>
                )}
              </div>
            ) : null}

            {joinPreview ? (
              <form className="space-y-4" onSubmit={handleJoinSettlement}>
                <div>
                  <label className="label" htmlFor="join-name">
                    {t.myNameLabel}
                  </label>
                  <input
                    className="input"
                    id="join-name"
                    maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                    placeholder={t.myNamePlaceholder(
                      PARTICIPANT_NAME_MAX_LENGTH,
                    )}
                    value={myName}
                    onChange={(event) => {
                      updateJoinName(event.target.value);
                    }}
                  />
                </div>

                {pendingJoin ? (
                  <div className="border-t border-dashed border-receipt-line pt-3">
                    <p className="text-xs leading-5 text-receipt-muted">
                      {t.duplicateNameMessage}
                    </p>
                  </div>
                ) : null}

                <button
                  className="key-button key-button-primary w-full"
                  type="submit"
                  disabled={Boolean(loadingAction)}
                >
                  <ArrowRight size={17} aria-hidden="true" />
                  {loadingAction === "join" || loadingAction === "existing"
                    ? t.joiningSettlement
                    : t.joinSettlementButton}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <p className="receipt-section text-sm leading-6 text-receipt-danger">
            {error}
          </p>
        ) : null}

        <section className="receipt-section space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black">
              {t.recentSettlementsTitle}
            </h2>
            <span className="text-sm font-bold text-receipt-muted">
              {visibleHistory.length}/10
            </span>
          </div>

          {visibleHistory.length === 0 ? (
            <p className="text-sm leading-6 text-receipt-muted">
              {t.noRecentSettlements}
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleHistory.map((item) => (
                <li
                  className="grid grid-cols-[1fr_auto] gap-2 border border-receipt-line bg-white/55 p-3"
                  key={item.settlementCode}
                >
                  <button
                    className="min-w-0 text-left"
                    type="button"
                    onClick={() => handleOpenHistoryItem(item)}
                  >
                    <span className="block truncate text-sm font-black">
                      {item.settlementName}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-receipt-muted">
                      {item.settlementCode} / {item.participantName} /{" "}
                      {formatDateTime(item.lastVisitedAt)}
                    </span>
                  </button>
                  <button
                    className="tiny-button self-center"
                    type="button"
                    aria-label={t.removeFromListLabel(item.settlementName)}
                    onClick={() => handleRemoveHistoryItem(item.settlementCode)}
                  >
                    <X size={14} aria-hidden="true" />
                    {t.removeFromListButton}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

function createSettlementWithParticipant(
  settlementName: string,
  participantName: string,
) {
  const settlementCode = generateSettlementCode();
  const participantId = createClientId();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(
      now.toDate().getTime() +
        SETTLEMENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    ),
  );
  const settlementRef = doc(db, "settlements", settlementCode);
  const participantRef = doc(
    db,
    "settlements",
    settlementCode,
    "participants",
    participantId,
  );
  const batch = writeBatch(db);

  batch.set(settlementRef, {
    settlementCode,
    settlementName,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    status: "open",
  } satisfies Settlement);
  batch.set(participantRef, {
    id: participantId,
    name: participantName,
    nameKey: getNameKey(participantName),
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  } satisfies Participant);

  return {
    settlementCode,
    settlementName,
    participantId,
    participantName,
    expiresAt: expiresAt.toDate().toISOString(),
    save: () => batch.commit(),
  };
}

function isSettlementExpired(settlement: Settlement) {
  return settlement.expiresAt.toDate().getTime() <= Date.now();
}

function getSettlementExpiresAtIso(settlement: Settlement) {
  return settlement.expiresAt.toDate().toISOString();
}

function isExpiredHistoryItem(item: SettlementHistoryItem) {
  return item.expiresAt
    ? new Date(item.expiresAt).getTime() <= Date.now()
    : false;
}

function getFirestoreErrorMessage(
  error: unknown,
  fallbackMessage: string,
  translations: HomeTranslation,
) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("client is offline")) {
    return translations.firestoreOfflineError;
  }

  if (message.includes("Missing or insufficient permissions")) {
    return translations.firestorePermissionError;
  }

  return message || fallbackMessage;
}
