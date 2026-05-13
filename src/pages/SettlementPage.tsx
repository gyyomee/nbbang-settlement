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
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorView from "../components/ErrorView";
import ExpenseForm, { type ExpenseFormValues } from "../components/ExpenseForm";
import ExpenseList, { type ExpenseEditValues } from "../components/ExpenseList";
import KakaoInviteButton from "../components/KakaoInviteButton";
import LoadingView from "../components/LoadingView";
import ParticipantList from "../components/ParticipantList";
import SettlementHeader from "../components/SettlementHeader";
import SettlementResult from "../components/SettlementResult";
import { db, hasFirebaseConfig } from "../firebase";
import { useExpenses } from "../hooks/useExpenses";
import { useParticipants } from "../hooks/useParticipants";
import { useSettlement } from "../hooks/useSettlement";
import { settlementPageTranslations, useCurrentLanguage } from "../i18n";
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
import {
  PARTICIPANT_NAME_MAX_LENGTH,
  getNameKey,
  getParticipantNameValidationMessage,
  isValidParticipantName,
  normalizeName,
} from "../utils/validation";
import { createClientId } from "../utils/id";
import InvalidSettlementPage from "./InvalidSettlementPage";

const SELF_DELETE_BLOCKED_MESSAGE =
  "내 참여자 정보는 삭제할 수 없습니다. 이름 변경만 가능합니다.";

export default function SettlementPage() {
  const navigate = useNavigate();
  const language = useCurrentLanguage();
  const t = settlementPageTranslations[language];
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
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
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
    if (
      !settlement ||
      !currentParticipant ||
      isSettlementExpired(settlement)
    ) {
      return;
    }

    upsertSettlementHistory({
      settlementCode: settlement.settlementCode,
      settlementName: settlement.settlementName,
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      joinedAt: new Date().toISOString(),
      lastVisitedAt: new Date().toISOString(),
      expiresAt: settlement.expiresAt.toDate().toISOString(),
    });
  }, [currentParticipant, settlement]);

  if (!isCodeValid) {
    return <InvalidSettlementPage />;
  }

  if (settlementLoading) {
    return <LoadingView message={t.loadingReceipt} />;
  }

  if (settlementError) {
    return <ErrorView message={settlementError} />;
  }

  if (!settlement) {
    return <InvalidSettlementPage />;
  }

  const activeSettlement = settlement;

  if (isSettlementExpired(activeSettlement)) {
    return (
      <ErrorView
        title={t.expiredTitle}
        message={t.expiredMessage}
      />
    );
  }

  const loadingCollections = participantsLoading || expensesLoading;
  const collectionError = participantsError || expensesError;
  const canDeleteSettlement = Boolean(currentParticipant);
  const currentParticipantIdFromStorage = getCurrentParticipantId(
    activeSettlement.settlementCode,
  );

  async function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settlement) {
      return;
    }

    const participantName = normalizeName(joinName);

    if (!participantName) {
      setJoinError(t.joinNameRequired);
      return;
    }

    if (!isValidParticipantName(participantName)) {
      setJoinError(t.myNameMaxLength(PARTICIPANT_NAME_MAX_LENGTH));
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
        error instanceof Error ? error.message : t.joinFailed,
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

  async function handleAddParticipant(participantNameValue: string) {
    const participantName = normalizeName(participantNameValue);
    const validationMessage =
      getParticipantNameValidationMessage(participantName);

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    const nameKey = getNameKey(participantName);
    const sameNameSnapshot = await getDocs(
      query(
        collection(
          db,
          "settlements",
          activeSettlement.settlementCode,
          "participants",
        ),
        where("nameKey", "==", nameKey),
        limit(1),
      ),
    );

    if (!sameNameSnapshot.empty) {
      throw new Error(t.duplicateParticipant);
    }

    const participantId = createClientId();
    const now = Timestamp.now();
    const batch = writeBatch(db);

    batch.set(
      doc(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "participants",
        participantId,
      ),
      {
        id: participantId,
        name: participantName,
        nameKey,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      } satisfies Participant,
    );
    batch.update(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });

    await batch.commit();
  }

  async function handleUpdateParticipant(
    participantId: string,
    newNameValue: string,
  ) {
    const participantName = normalizeName(newNameValue);
    const validationMessage =
      getParticipantNameValidationMessage(participantName);

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    const nameKey = getNameKey(participantName);
    const sameNameSnapshot = await getDocs(
      query(
        collection(
          db,
          "settlements",
          activeSettlement.settlementCode,
          "participants",
        ),
        where("nameKey", "==", nameKey),
        limit(1),
      ),
    );

    if (
      !sameNameSnapshot.empty &&
      sameNameSnapshot.docs[0].id !== participantId
    ) {
      throw new Error(t.duplicateParticipant);
    }

    const now = Timestamp.now();
    const batch = writeBatch(db);

    batch.update(
      doc(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "participants",
        participantId,
      ),
      {
        name: participantName,
        nameKey,
        updatedAt: now,
      },
    );
    batch.update(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });

    await batch.commit();
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
      throw new Error(t.expenseParticipantError);
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
    if (!window.confirm(t.deleteExpenseConfirm)) {
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
      throw new Error(t.expenseParticipantError);
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

  async function handleDeleteParticipant(participant: Participant) {
    if (participant.id === currentParticipantIdFromStorage) {
      throw new Error(SELF_DELETE_BLOCKED_MESSAGE);
    }

    if (expensesLoading) {
      throw new Error(
        t.deleteWaitForExpenses,
      );
    }

    const isUsedInExpense = expenses.some(
      (expense) =>
        expense.payerId === participant.id ||
        expense.targetParticipantIds.includes(participant.id),
    );

    if (isUsedInExpense) {
      throw new Error(
        t.deleteBlocked,
      );
    }

    const now = Timestamp.now();
    const batch = writeBatch(db);

    batch.delete(
      doc(
        db,
        "settlements",
        activeSettlement.settlementCode,
        "participants",
        participant.id,
      ),
    );
    batch.update(doc(db, "settlements", activeSettlement.settlementCode), {
      updatedAt: now,
    });

    await batch.commit();

    if (participant.id === currentParticipantId) {
      removeCurrentParticipantId(activeSettlement.settlementCode);
      removeSettlementHistoryItem(activeSettlement.settlementCode);
      setCurrentParticipantIdState(null);
    }
  }

  async function handleDeleteSettlement() {
    if (!canDeleteSettlement) {
      alert(t.deleteOnlyParticipant);
      return;
    }

    const confirmed = window.confirm(t.deleteSettlementConfirm);

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
        error instanceof Error ? error.message : t.deleteSettlementFailed,
      );
    } finally {
      setDeletingSettlement(false);
    }
  }

  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-6">
        <SettlementHeader settlement={activeSettlement} />

        {!hasFirebaseConfig ? (
          <div className="border border-receipt-danger bg-[#f5dfd8] px-3 py-3 text-sm leading-6 text-receipt-danger">
            {t.firebaseConfigError}
          </div>
        ) : null}

        {collectionError ? (
          <div className="receipt-section text-sm leading-6 text-receipt-danger">
            {collectionError}
          </div>
        ) : null}

        {shouldShowJoinBox ? (
          <section className="receipt-section space-y-4">
            <h2 className="text-base font-black">{t.joinTitle}</h2>
            <form className="space-y-3" onSubmit={handleJoinSubmit}>
              <div>
                <label className="label" htmlFor="direct-join-name">
                  {t.myNameLabel}
                </label>
                <input
                  className="input"
                  id="direct-join-name"
                  maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                  placeholder={t.myNamePlaceholder(
                    PARTICIPANT_NAME_MAX_LENGTH,
                  )}
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  disabled={Boolean(joining)}
                />
              </div>

              {joinError ? (
                <p className="text-sm leading-6 text-receipt-danger">
                  {joinError}
                </p>
              ) : null}

              <button
                className="key-button key-button-primary w-full"
                type="submit"
                disabled={Boolean(joining)}
              >
                {t.joinButton}
              </button>
            </form>

            {duplicateParticipant ? (
              <div className="space-y-3 border-t border-dashed border-receipt-line pt-4">
                <h3 className="text-sm font-black">
                  {t.duplicateNameTitle}
                </h3>
                <p className="text-sm leading-6 text-receipt-muted">
                  {t.duplicateNameMessage}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    className="key-button key-button-primary"
                    type="button"
                    onClick={joinAsExistingParticipant}
                    disabled={Boolean(joining)}
                  >
                    {t.joinExistingButton}
                  </button>
                  <button
                    className="key-button"
                    type="button"
                    onClick={() => joinAsNewParticipant()}
                    disabled={Boolean(joining)}
                  >
                    {t.joinNewButton}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <ParticipantList
          participants={participants}
          currentParticipantId={currentParticipantIdFromStorage}
          onAddParticipant={handleAddParticipant}
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteParticipant={handleDeleteParticipant}
        />

        <KakaoInviteButton
          settlementName={activeSettlement.settlementName}
          settlementCode={activeSettlement.settlementCode}
        />

        <ExpenseForm
          participants={participants}
          currentParticipantId={currentParticipantId}
          isOpen={isExpenseFormOpen}
          onClose={() => setIsExpenseFormOpen(false)}
          onSubmit={handleAddExpense}
        />

        <ExpenseList
          expenses={expenses}
          participants={participants}
          onAddExpense={() => setIsExpenseFormOpen(true)}
          addExpenseDisabled={isExpenseFormOpen || loadingCollections}
          onUpdate={handleUpdateExpense}
          onDelete={handleDeleteExpense}
        />

        <SettlementResult
          balances={calculation.balances}
          transfers={calculation.transfers}
        />

        {canDeleteSettlement ? (
          <button
            className="key-button key-button-danger w-full"
            type="button"
            onClick={handleDeleteSettlement}
            disabled={deletingSettlement}
          >
            <Trash2 size={17} aria-hidden="true" />
            {deletingSettlement
              ? t.deletingSettlementButton
              : t.deleteSettlementButton}
          </button>
        ) : null}
      </section>
    </main>
  );
}

async function deleteDocumentsInBatches(refs: DocumentReference[]) {
  const MAX_BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = refs.slice(i, i + MAX_BATCH_SIZE);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

function isSettlementExpired(settlement: { expiresAt: Timestamp }) {
  return settlement.expiresAt.toDate().getTime() <= Date.now();
}
