import { CheckSquare, Plus, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

export default function ExpenseForm({
  participants,
  currentParticipantId,
  onSubmit,
  disabled = false,
}: {
  participants: Participant[];
  currentParticipantId: string | null;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  disabled?: boolean;
}) {
  const [expenseDate, setExpenseDate] = useState(todayInputValue());
  const [payerId, setPayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetParticipantIds, setTargetParticipantIds] = useState<string[]>(
    [],
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!payerId) {
      setError("결제자를 선택해주세요.");
      return;
    }

    if (!parsedAmount) {
      setError("금액을 1원 이상 입력해주세요.");
      return;
    }

    if (targetParticipantIds.length === 0) {
      setError("정산 대상자를 1명 이상 선택해주세요.");
      return;
    }

    try {
      setError("");
      setSubmitting(true);
      await onSubmit({
        payerId,
        amount: parsedAmount,
        description: description.trim() || "상세내역 없음",
        expenseDate,
        targetParticipantIds,
      });
      setAmount("");
      setDescription("");
      setExpenseDate(todayInputValue());
      setTargetParticipantIds(
        getDefaultTargetParticipantIds(participants, currentParticipantId),
      );
      setIsExpanded(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "결제 내역을 추가하지 못했어요.",
      );
    } finally {
      setSubmitting(false);
    }
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

  if (!isExpanded) {
    return (
      <section className="receipt-section space-y-3">
        <button
          className="key-button w-full"
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
        >
          <Plus size={17} aria-hidden="true" />
          결제 내역 추가
        </button>
        {disabled ? (
          <p className="text-sm leading-6 text-receipt-danger">
            이름을 입력하고 참여하면 결제 내역을 추가할 수 있어요.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="receipt-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">결제 내역 입력</h2>
        {parsedAmount ? (
          <span className="amount text-sm font-black">
            {formatCurrency(parsedAmount)}
          </span>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="expense-date">
            결제 날짜
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
            결제자
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
            금액
          </label>
          <input
            className="input amount"
            id="amount"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            disabled={disabled || submitting}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            상세내역
          </label>
          <textarea
            className="input textarea"
            id="description"
            placeholder="예: 저녁 식사, 택시비"
            value={description}
            disabled={disabled || submitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="label mb-0">정산 대상자</span>
            <div className="flex shrink-0 gap-2">
              <button
                className="tiny-button"
                type="button"
                onClick={selectAllTargets}
                disabled={disabled || submitting || participants.length === 0}
              >
                <CheckSquare size={14} aria-hidden="true" />
                전체 선택
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
                전체 해제
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
            이름을 입력하고 참여하면 결제 내역을 추가할 수 있어요.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm leading-6 text-receipt-danger">{error}</p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="key-button key-button-primary"
            type="submit"
            disabled={disabled || submitting}
          >
            <Plus size={17} aria-hidden="true" />
            {submitting ? "추가 중" : "추가하기"}
          </button>
          <button
            className="key-button"
            type="button"
            onClick={() => setIsExpanded(false)}
            disabled={submitting}
          >
            취소
          </button>
        </div>
      </form>
    </section>
  );
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
