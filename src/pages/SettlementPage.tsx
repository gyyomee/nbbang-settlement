import {
  type DocumentReference,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorView from "../components/ErrorView";
import ExpenseForm, { type ExpenseFormValues } from "../components/ExpenseForm";
import ExpenseList, { type ExpenseEditValues } from "../components/ExpenseList";
import LoadingView from "../components/LoadingView";
import ParticipantList from "../components/ParticipantList";
import SettlementHeader from "../components/SettlementHeader";
import SettlementResult from "../components/SettlementResult";
import { db, hasFirebaseConfig } from "../firebase";
import { useExpenses } from "../hooks/useExpenses";
import { useParticipants } from "../hooks/useParticipants";
import { useSettlement } from "../hooks/useSettlement";
import type { Participant } from "../types";
import {
  normalizeSettlementCode,
  isValidSettlementCode,
} from "../utils/settlementCode";
import { calculateSettlement } from "../utils/settlement";
import {
  getCurrentParticipantId,
  removeCurrentParticipantId,
  removeSettlementHistoryItem,
  setCurrentParticipantId,
  upsertSettlementHistory,
} from "../utils/storage";
import { getNameKey, normalizeName } from "../utils/validation";
import { createClientId } from "../utils/id";
import InvalidSettlementPage from "./InvalidSettlementPage";

export default function SettlementPage() {
  const navigate = useNavigate();
  const { settlementCode: settlementCodeParam } = useParams();
  const settlementCode = normalizeSettlementCode(settlementCodeParam ?? "");
  const isCodeValid = isValidSettlementCode(settlementCode);
  const {
    settlement,
    loading: settlementLoading,
    error: settlementError,
  } = useSettlement(isCodeValid ? settlementCode : undefined);
  const {
    participants,
    loading: participantsLoading,
    error: participantsError,
  } = useParticipants(isCodeValid ? settlementCode : undefined);
  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
  } = useExpenses(isCodeValid ? settlementCode : undefined);
  const [currentParticipantId, setCurrentParticipantIdState] = useState<
    string | null
  >(() => (isCodeValid ? getCurrentParticipantId(settlementCode) : null));
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [duplicateParticipant, setDuplicateParticipant] =
    useState<Participant | null>(null);
  const [joining, setJoining] = useState<"check" | "existing" | "new" | null>(
    null,
  );
  const [deletingSettlement, setDeletingSettlement] = useState(false);
  const currentParticipant =
    participants.find(
      (participant) => participant.id === currentParticipantId,
    ) ?? null;
  const shouldShowJoinBox = Boolean(settlement) && !currentParticipant;
  const calculation = useMemo(
    () => calculateSettlement(participants, expenses),
    [participants, expenses],
  );

  useEffect(() => {
    setCurrentParticipantIdState(
      isCodeValid ? getCurrentParticipantId(settlementCode) : null,
    );
  }, [isCodeValid, settlementCode]);

  useEffect(() => {
    if (!settlement || !currentParticipant) {
      return;
    }

    upsertSettlementHistory({
      settlementCode: settlement.settlementCode,
      settlementName: settlement.settlementName,
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      joinedAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
    });
  }, [currentParticipant, settlement]);

  if (!isCodeValid) {
    return <InvalidSettlementPage />;
  }

  if (settlementLoading) {
    return <LoadingView message="정산 영수증을 불러오는 중..." />;
  }

  if (settlementError) {
    return <ErrorView message={settlementError} />;
  }

  if (!settlement) {
    return <InvalidSettlementPage />;
  }

  const activeSettlement = settlement;
  const loadingCollections = participantsLoading || expensesLoading;
  const collectionError = participantsError || expensesError;
  const canDeleteSettlement = Boolean(currentParticipant);

  async function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settlement) {
      return;
    }

    const participantName = normalizeName(joinName);

    if (!participantName) {
      setJoinError("참여할 이름을 입력해주세요.");
      return;
    }

    try {
      setJoinError("");
      setDuplicateParticipant(null);
      setJoining("check");

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
        setDuplicateParticipant(sameNameSnapshot.docs[0].data() as Participant);
        return;
      }

      await joinAsNewParticipant(participantName);
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "참여하지 못했어요.",
      );
    } finally {
      setJoining(null);
    }
  }

  async function joinAsExistingParticipant() {
    if (!duplicateParticipant || !settlement) {
      return;
    }

    setJoining("existing");
    setCurrentParticipantId(settlement.settlementCode, duplicateParticipant.id);
    setCurrentParticipantIdState(duplicateParticipant.id);
    upsertSettlementHistory({
      settlementCode: settlement.settlementCode,
      settlementName: settlement.settlementName,
      participantId: duplicateParticipant.id,
      participantName: duplicateParticipant.name,
      joinedAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
    });
    setDuplicateParticipant(null);
    setJoining(null);
  }

  async function joinAsNewParticipant(
    participantName = normalizeName(joinName),
  ) {
    if (!settlement) {
      return;
    }

    const participantId = createClientId();
    const now = Timestamp.now();
    const batch = writeBatch(db);

    setJoining("new");
    batch.set(
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
    batch.update(doc(db, "settlements", settlement.settlementCode), {
      updatedAt: now,
    });
    await batch.commit();

    setCurrentParticipantId(settlement.settlementCode, participantId);
    setCurrentParticipantIdState(participantId);
    upsertSettlementHistory({
      settlementCode: settlement.settlementCode,
      settlementName: settlement.settlementName,
      participantId,
      participantName,
      joinedAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
    });
    setJoinName("");
    setDuplicateParticipant(null);
    setJoining(null);
  }

  async function handleAddExpense(values: ExpenseFormValues) {
    const payer = participants.find(
      (participant) => participant.id === values.payerId,
    );
    const targetParticipants = participants.filter((participant) =>
      values.targetParticipantIds.includes(participant.id),
    );

    if (!payer || targetParticipants.length === 0) {
      throw new Error("결제자와 정산 대상자를 다시 확인해주세요.");
    }

    const now = Timestamp.now();
    const expenseRef = doc(
      collection(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "expenses",
      ),
    );
    const batch = writeBatch(db);

    batch.set(expenseRef, {
      id: expenseRef.id,
      payerId: payer.id,
      payerName: payer.name,
      amount: values.amount,
      description: values.description,
      expenseDate: values.expenseDate,
      targetParticipantIds: targetParticipants.map(
        (participant) => participant.id,
      ),
      targetParticipantNames: targetParticipants.map(
        (participant) => participant.name,
      ),
      createdAt: now,
      updatedAt: now,
    });
    batch.update(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });

    await batch.commit();
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!window.confirm("이 결제 내역을 삭제할까요?")) {
      return;
    }

    const now = Timestamp.now();

    await deleteDoc(
      doc(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "expenses",
        expenseId,
      ),
    );
    await updateDoc(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });
  }

  async function handleUpdateExpense(
    expenseId: string,
    values: ExpenseEditValues,
  ) {
    const payer = participants.find(
      (participant) => participant.id === values.payerId,
    );
    const targetParticipants = participants.filter((participant) =>
      values.targetParticipantIds.includes(participant.id),
    );

    if (!payer || targetParticipants.length === 0) {
      throw new Error("결제자와 정산 대상자를 다시 확인해주세요.");
    }

    const now = Timestamp.now();
    const batch = writeBatch(db);

    batch.update(
      doc(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "expenses",
        expenseId,
      ),
      {
        payerId: payer.id,
        payerName: payer.name,
        amount: values.amount,
        description: values.description,
        expenseDate: values.expenseDate,
        targetParticipantIds: targetParticipants.map(
          (participant) => participant.id,
        ),
        targetParticipantNames: targetParticipants.map(
          (participant) => participant.name,
        ),
        updatedAt: now,
      },
    );
    batch.update(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });

    await batch.commit();
  }

  async function handleDeleteSettlement() {
    if (!canDeleteSettlement) {
      alert("정산에 참여한 사람만 삭제할 수 있어요.");
      return;
    }

    const confirmed = window.confirm(
      "이 정산을 서버에서 완전히 삭제할까요?\n참여자, 결제 내역, 정산 결과가 모두 삭제되고 되돌릴 수 없어요.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSettlement(true);

      const [expensesSnapshot, participantsSnapshot] = await Promise.all([
        getDocs(
          collection(
            db,
            "settlements",
            activeSettlement.settlementCode,
            "expenses",
          ),
        ),
        getDocs(
          collection(
            db,
            "settlements",
            activeSettlement.settlementCode,
            "participants",
          ),
        ),
      ]);

      await deleteDocumentsInBatches([
        ...expensesSnapshot.docs.map((expenseDoc) => expenseDoc.ref),
        ...participantsSnapshot.docs.map(
          (participantDoc) => participantDoc.ref,
        ),
        doc(db, "settlements", activeSettlement.settlementCode),
      ]);

      removeCurrentParticipantId(activeSettlement.settlementCode);
      removeSettlementHistoryItem(activeSettlement.settlementCode);
      navigate("/");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "정산을 삭제하지 못했어요.",
      );
    } finally {
      setDeletingSettlement(false);
    }
  }

  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-6">
        <SettlementHeader
          settlement={activeSettlement}
          canDelete={canDeleteSettlement}
          deleting={deletingSettlement}
          onDelete={handleDeleteSettlement}
        />

        {!hasFirebaseConfig ? (
          <div className="border border-receipt-danger bg-[#f5dfd8] px-3 py-3 text-sm leading-6 text-receipt-danger">
            Firebase 환경변수가 비어 있어요. `.env`를 설정해야 Firestore 저장이
            동작합니다.
          </div>
        ) : null}

        {collectionError ? (
          <div className="receipt-section text-sm leading-6 text-receipt-danger">
            {collectionError}
          </div>
        ) : null}

        {shouldShowJoinBox ? (
          <section className="receipt-section space-y-4">
            <h2 className="text-base font-black">이 정산에 참여하기</h2>
            <form className="space-y-3" onSubmit={handleJoinSubmit}>
              <div>
                <label className="label" htmlFor="direct-join-name">
                  내 이름
                </label>
                <input
                  className="input"
                  id="direct-join-name"
                  maxLength={5}
                  placeholder="예: 가요미 (최대 5자)"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                />
              </div>
              <button
                className="key-button key-button-primary w-full"
                type="submit"
                disabled={Boolean(joining)}
              >
                {joining === "check" ? "확인 중" : "참여하기"}
              </button>
            </form>

            {duplicateParticipant ? (
              <div className="space-y-3 border border-receipt-line bg-white/55 p-3">
                <p className="text-sm leading-6 text-receipt-muted">
                  이미 같은 이름의 참여자가 있어요. 기존 참여자로 다시
                  입장할까요?
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    className="key-button key-button-primary"
                    type="button"
                    onClick={joinAsExistingParticipant}
                  >
                    기존 참여자로 입장
                  </button>
                  <button
                    className="key-button"
                    type="button"
                    onClick={() => joinAsNewParticipant()}
                  >
                    새 참여자로 입장
                  </button>
                </div>
              </div>
            ) : null}

            {joinError ? (
              <p className="text-sm leading-6 text-receipt-danger">
                {joinError}
              </p>
            ) : null}
          </section>
        ) : null}

        {loadingCollections ? (
          <p className="receipt-section text-sm font-bold text-receipt-muted">
            실시간 내역을 불러오는 중...
          </p>
        ) : null}

        <ParticipantList
          participants={participants}
          currentParticipantId={currentParticipantId}
        />
        <ExpenseForm
          participants={participants}
          currentParticipantId={currentParticipantId}
          disabled={!currentParticipant}
          onSubmit={handleAddExpense}
        />
        <ExpenseList
          expenses={expenses}
          participants={participants}
          onUpdate={handleUpdateExpense}
          onDelete={handleDeleteExpense}
        />
        <SettlementResult
          balances={calculation.balances}
          transfers={calculation.transfers}
        />
      </section>
    </main>
  );
}

async function deleteDocumentsInBatches(documentRefs: DocumentReference[]) {
  const batchSize = 450;

  for (let index = 0; index < documentRefs.length; index += batchSize) {
    const batch = writeBatch(db);
    const refs = documentRefs.slice(index, index + batchSize);

    refs.forEach((documentRef) => batch.delete(documentRef));

    await batch.commit();
  }
}
