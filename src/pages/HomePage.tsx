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
import { getNameKey, normalizeName } from "../utils/validation";
import { createClientId } from "../utils/id";

interface PendingJoin {
  settlement: Settlement;
  participant: Participant;
  participantName: string;
}

type HomeMode = "create" | "join" | null;

const FIREBASE_CONFIG_ERROR =
  "Firebase 설정이 아직 없어서 정산을 저장할 수 없어요. .env에 Firebase 값을 넣고 개발 서버를 다시 시작해주세요.";

export default function HomePage() {
  const navigate = useNavigate();
  const [settlementName, setSettlementName] = useState("");
  const [myName, setMyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [history, setHistory] = useState<SettlementHistoryItem[]>(() =>
    getSettlementHistory(),
  );
  const [error, setError] = useState("");
  const [pendingJoin, setPendingJoin] = useState<PendingJoin | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "create" | "join" | "existing" | "new" | null
  >(null);
  const [mode, setMode] = useState<HomeMode>(null);

  async function handleCreateSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSettlementName = settlementName.trim();
    const participantName = normalizeName(myName);

    if (!normalizedSettlementName) {
      setError("정산 이름을 입력해주세요.");
      return;
    }

    if (!participantName) {
      setError("내 이름을 입력해주세요.");
      return;
    }

    if (!hasFirebaseConfig) {
      setError(FIREBASE_CONFIG_ERROR);
      return;
    }

    try {
      setError("");
      setPendingJoin(null);
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
              "정산을 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.",
            ),
          );
        });
      }, 100);
    } catch (createError) {
      setError(
        getFirestoreErrorMessage(createError, "정산을 만들지 못했어요."),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleJoinSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const settlementCode = normalizeSettlementCode(joinCode);
    const participantName = normalizeName(myName);

    if (!participantName) {
      setError("내 이름을 입력해주세요.");
      return;
    }

    if (!isValidSettlementCode(settlementCode)) {
      setError("정산 코드는 8자리 영문 대문자와 숫자로 입력해주세요.");
      return;
    }

    if (!hasFirebaseConfig) {
      setError(FIREBASE_CONFIG_ERROR);
      return;
    }

    try {
      setError("");
      setPendingJoin(null);
      setLoadingAction("join");

      const settlementDoc = await getDoc(
        doc(db, "settlements", settlementCode),
      );

      if (!settlementDoc.exists()) {
        setError("존재하지 않는 정산 코드예요.");
        return;
      }

      const settlement = settlementDoc.data() as Settlement;
      const sameNameSnapshot = await getDocs(
        query(
          collection(db, "settlements", settlementCode, "participants"),
          where("nameKey", "==", getNameKey(participantName)),
          limit(1),
        ),
      );

      if (!sameNameSnapshot.empty) {
        setPendingJoin({
          settlement,
          participant: sameNameSnapshot.docs[0].data() as Participant,
          participantName,
        });
        return;
      }

      await joinAsNewParticipant(settlement, participantName);
    } catch (joinError) {
      setError(
        getFirestoreErrorMessage(joinError, "정산에 참여하지 못했어요."),
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
    });
  }

  async function handleJoinAsNewParticipant() {
    if (!pendingJoin) {
      return;
    }

    try {
      setLoadingAction("new");
      await joinAsNewParticipant(
        pendingJoin.settlement,
        pendingJoin.participantName,
      );
    } catch (joinError) {
      setError(
        getFirestoreErrorMessage(joinError, "새 참여자로 입장하지 못했어요."),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  function enterSettlement({
    settlementCode,
    settlementName,
    participantId,
    participantName,
  }: {
    settlementCode: string;
    settlementName: string;
    participantId: string;
    participantName: string;
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
  }

  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-black tracking-normal">N빵 정산</h1>
          <p className="mt-2 text-sm leading-6 text-receipt-muted">
            최소한의 이체로 깔끔하게 끝내는 똑똑한 정산
          </p>
        </header>

        {!hasFirebaseConfig ? (
          <div className="border border-receipt-danger bg-[#f5dfd8] px-3 py-3 text-sm leading-6 text-receipt-danger">
            Firebase 환경변수가 비어 있어요. `.env`를 설정해야 Firestore 저장이
            동작합니다.
          </div>
        ) : null}

        <section className="receipt-section space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className={`key-button w-full ${mode === "create" ? "key-button-primary" : ""}`}
              type="button"
              onClick={() => selectMode("create")}
            >
              <Plus size={17} aria-hidden="true" />새 정산 만들기
            </button>
            <button
              className={`key-button w-full ${mode === "join" ? "key-button-primary" : ""}`}
              type="button"
              onClick={() => selectMode("join")}
            >
              <ArrowRight size={17} aria-hidden="true" />
              기존 정산 참여하기
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
              <h2 className="text-base font-black">새 정산 만들기</h2>
            </div>

            <div>
              <label className="label" htmlFor="create-name">
                내 이름
              </label>
              <input
                className="input"
                id="create-name"
                maxLength={5}
                placeholder="예: 가요미 (최대 5자)"
                value={myName}
                onChange={(event) => setMyName(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="settlement-name">
                정산 이름
              </label>
              <input
                className="input"
                id="settlement-name"
                maxLength={40}
                placeholder="예: 서핑 여행"
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
              {loadingAction === "create" ? "만드는 중" : "새 정산 만들기"}
            </button>
          </form>
        ) : null}

        {mode === "join" ? (
          <form
            className="receipt-section space-y-4"
            onSubmit={handleJoinSettlement}
          >
            <div className="flex items-center gap-2">
              <ArrowRight size={18} aria-hidden="true" />
              <h2 className="text-base font-black">기존 정산 참여하기</h2>
            </div>

            <div>
              <label className="label" htmlFor="join-name">
                내 이름
              </label>
              <input
                className="input"
                id="join-name"
                maxLength={5}
                placeholder="예: 가요미 (최대 5자)"
                value={myName}
                onChange={(event) => setMyName(event.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="join-code">
                정산 코드
              </label>
              <input
                className="input text-center text-xl font-black tracking-[0.18em]"
                id="join-code"
                maxLength={8}
                placeholder="A7K9Q2MD"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(normalizeSettlementCode(event.target.value))
                }
              />
            </div>

            <button
              className="key-button key-button-primary w-full"
              type="submit"
              disabled={Boolean(loadingAction)}
            >
              <ArrowRight size={17} aria-hidden="true" />
              {loadingAction === "join" ? "확인 중" : "정산 참여하기"}
            </button>
          </form>
        ) : null}

        {pendingJoin ? (
          <div className="receipt-section space-y-3">
            <h2 className="text-base font-black">같은 이름이 있어요</h2>
            <p className="text-sm leading-6 text-receipt-muted">
              이미 같은 이름의 참여자가 있어요. 기존 참여자로 다시 입장할까요?
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="key-button key-button-primary"
                type="button"
                onClick={joinAsExistingParticipant}
                disabled={Boolean(loadingAction)}
              >
                기존 참여자로 입장
              </button>
              <button
                className="key-button"
                type="button"
                onClick={handleJoinAsNewParticipant}
                disabled={Boolean(loadingAction)}
              >
                새 참여자로 입장
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="receipt-section text-sm leading-6 text-receipt-danger">
            {error}
          </p>
        ) : null}

        <section className="receipt-section space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black">최근 참여한 정산</h2>
            <span className="text-sm font-bold text-receipt-muted">
              {history.length}/10
            </span>
          </div>

          {history.length === 0 ? (
            <p className="text-sm leading-6 text-receipt-muted">
              최근 참여한 정산이 아직 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => (
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
                    aria-label={`${item.settlementName} 목록에서 제외`}
                    onClick={() => handleRemoveHistoryItem(item.settlementCode)}
                  >
                    <X size={14} aria-hidden="true" />
                    목록에서 제외
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
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    save: () => batch.commit(),
  };
}

function getFirestoreErrorMessage(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("client is offline")) {
    return "Firestore에 연결할 수 없어요. 인터넷 연결, Firebase 프로젝트의 Firestore Database 생성 여부, Firestore Rules 배포 상태를 확인해주세요.";
  }

  if (message.includes("Missing or insufficient permissions")) {
    return "Firestore 권한이 거부됐어요. firestore.rules 내용을 Firebase 콘솔 또는 Firebase CLI로 배포했는지 확인해주세요.";
  }

  return message || fallbackMessage;
}
