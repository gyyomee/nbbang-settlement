import { CheckSquare, Plus, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { expenseFormTranslations, useCurrentLanguage } from "../i18n";
import type { Participant } from "../types";
import { formatCurrency } from "../utils/format";
import { todayInputValue } from "../utils/format";
import { toPositiveInteger } from "../utils/validation";

export interface ExpenseFormValues {
  payerId: string;
  amount: number;
  description: string;
  expenseDate: string;
  targetParticipantIds: string[];
}

type ExpenseFormErrorKey =
  | "payerRequired"
  | "amountRequired"
  | "targetsRequired"
  | "addExpenseFailed";

type ExpenseFormError = { key: ExpenseFormErrorKey } | { message: string };

export default function ExpenseForm({
  participants,
  currentParticipantId,
  isOpen,
  onClose,
  onSubmit,
  disabled = false,
}: {
  participants: Participant[];
  currentParticipantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  disabled?: boolean;
}) {
  const language = useCurrentLanguage();
  const t = expenseFormTranslations[language];
  const [expenseDate, setExpenseDate] = useState(todayInputValue());
  const [payerId, setPayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetParticipantIds, setTargetParticipantIds] = useState<string[]>(
    [],
  );
  const [error, setError] = useState<ExpenseFormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const parsedAmount = useMemo(() => toPositiveInteger(amount), [amount]);

  useEffect(() => {
    if (participants.length === 0) {
      setPayerId("");
      setTargetParticipantIds([]);
      return;
    }

    setPayerId((currentPayerId) => {
      if (
        currentPayerId &&
        participants.some((participant) => participant.id === currentPayerId)
      ) {
        return currentPayerId;
      }

      return currentParticipantId &&
        participants.some(
          (participant) => participant.id === currentParticipantId,
        )
        ? currentParticipantId
        : participants[0].id;
    });
    setTargetParticipantIds((currentTargetIds) => {
      if (currentTargetIds.length > 0) {
        const validTargetIds = currentTargetIds.filter((id) =>
          participants.some((participant) => participant.id === id),
        );

        return validTargetIds.length > 0
          ? validTargetIds
          : getDefaultTargetParticipantIds(participants, currentParticipantId);
      }

      return getDefaultTargetParticipantIds(participants, currentParticipantId);
    });
  }, [currentParticipantId, participants]);

  async function saveExpense(keepExpanded: boolean) {
    if (!payerId) {
      setError({ key: "payerRequired" });
      return;
    }

    if (!parsedAmount) {
      setError({ key: "amountRequired" });
      return;
    }

    if (targetParticipantIds.length === 0) {
      setError({ key: "targetsRequired" });
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      await onSubmit({
        payerId,
        amount: parsedAmount,
        description: description.trim() || "상세내역 없음",
        expenseDate,
        targetParticipantIds,
      });
      resetForm(keepExpanded ? "all" : "default");

      if (!keepExpanded) {
        onClose();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? { message: submitError.message }
          : { key: "addExpenseFailed" },
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveExpense(false);
  }

  function resetForm(targetMode: "default" | "all") {
    setExpenseDate(todayInputValue());
    setPayerId(getDefaultPayerId(participants, currentParticipantId));
    setAmount("");
    setDescription("");
    setTargetParticipantIds(
      targetMode === "all"
        ? participants.map((participant) => participant.id)
        : getDefaultTargetParticipantIds(participants, currentParticipantId),
    );
  }

  function toggleTarget(participantId: string) {
    setTargetParticipantIds((currentTargetIds) => {
      if (currentTargetIds.includes(participantId)) {
        return currentTargetIds.filter((id) => id !== participantId);
      }

      return [...currentTargetIds, participantId];
    });
  }

  function selectAllTargets() {
    setTargetParticipantIds(participants.map((participant) => participant.id));
  }

  function clearAllTargets() {
    setTargetParticipantIds([]);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section className="receipt-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{t.title}</h2>
        {parsedAmount ? (
          <span className="amount text-sm font-black">
            {formatCurrency(parsedAmount, language)}
          </span>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="expense-date">
            {t.expenseDateLabel}
          </label>
          <input
            className="input"
            id="expense-date"
            type="date"
            value={expenseDate}
            disabled={disabled || submitting}
            onChange={(event) => setExpenseDate(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="payer">
            {t.payerLabel}
          </label>
          <select
            className="input"
            id="payer"
            value={payerId}
            disabled={disabled || submitting || participants.length === 0}
            onChange={(event) => setPayerId(event.target.value)}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="amount">
            {t.amountLabel}
          </label>
          <input
            className="input amount"
            id="amount"
            inputMode="numeric"
            placeholder={t.amountPlaceholder}
            value={amount}
            disabled={disabled || submitting}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            {t.descriptionLabel}
          </label>
          <textarea
            className="input textarea"
            id="description"
            placeholder={t.descriptionPlaceholder}
            value={description}
            disabled={disabled || submitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="label mb-0">{t.targetParticipantsLabel}</span>
            <div className="flex shrink-0 gap-2">
              <button
                className="tiny-button"
                type="button"
                onClick={selectAllTargets}
                disabled={disabled || submitting || participants.length === 0}
              >
                <CheckSquare size={14} aria-hidden="true" />
                {t.selectAllTargetsButton}
              </button>
              <button
                className="tiny-button"
                type="button"
                onClick={clearAllTargets}
                disabled={
                  disabled || submitting || targetParticipantIds.length === 0
                }
              >
                <Square size={14} aria-hidden="true" />
                {t.clearAllTargetsButton}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => (
              <label
                className="flex min-h-12 items-center gap-2 border border-receipt-line bg-white/55 px-3 py-2 text-sm font-bold"
                key={participant.id}
              >
                <input
                  className="h-4 w-4 accent-receipt-ink"
                  type="checkbox"
                  checked={targetParticipantIds.includes(participant.id)}
                  disabled={disabled || submitting}
                  onChange={() => toggleTarget(participant.id)}
                />
                <span className="min-w-0 truncate">{participant.name}</span>
              </label>
            ))}
          </div>
        </div>

        {disabled ? (
          <p className="text-sm leading-6 text-receipt-danger">
            {t.disabledMessage}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm leading-6 text-receipt-danger">
            {getExpenseFormErrorText(error, t)}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className="key-button key-button-primary"
            type="submit"
            disabled={disabled || submitting}
          >
            <Plus size={17} aria-hidden="true" />
            {submitting ? t.submittingButton : t.submitButton}
          </button>
          <button
            className="key-button"
            type="button"
            onClick={() => void saveExpense(true)}
            disabled={disabled || submitting}
          >
            <Plus size={17} aria-hidden="true" />
            {submitting ? t.submittingButton : t.continueSubmitButton}
          </button>
          <button
            className="key-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            {t.cancelButton}
          </button>
        </div>
      </form>
    </section>
  );
}

function getDefaultPayerId(
  participants: Participant[],
  currentParticipantId: string | null,
) {
  if (
    currentParticipantId &&
    participants.some((participant) => participant.id === currentParticipantId)
  ) {
    return currentParticipantId;
  }

  return participants[0]?.id ?? "";
}

function getDefaultTargetParticipantIds(
  participants: Participant[],
  currentParticipantId: string | null,
) {
  if (
    currentParticipantId &&
    participants.some((participant) => participant.id === currentParticipantId)
  ) {
    return [currentParticipantId];
  }

  return participants[0] ? [participants[0].id] : [];
}

function getExpenseFormErrorText(
  error: ExpenseFormError,
  translations: (typeof expenseFormTranslations)["ko"],
) {
  if ("message" in error) {
    return error.message;
  }

  return translations[error.key];
}
