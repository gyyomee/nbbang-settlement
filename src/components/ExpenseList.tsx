import { CheckSquare, Pencil, Save, Square, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Expense, Participant } from "../types";
import { formatCurrency, formatDateLabel } from "../utils/format";
import { toPositiveInteger } from "../utils/validation";

export interface ExpenseEditValues {
  payerId: string;
  amount: number;
  description: string;
  expenseDate: string;
  targetParticipantIds: string[];
}

export default function ExpenseList({
  expenses,
  participants,
  onUpdate,
  onDelete,
}: {
  expenses: Expense[];
  participants: Participant[];
  onUpdate: (expenseId: string, values: ExpenseEditValues) => Promise<void>;
  onDelete: (expenseId: string) => Promise<void>;
}) {
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editPayerId, setEditPayerId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetParticipantIds, setEditTargetParticipantIds] = useState<
    string[]
  >([]);
  const [editError, setEditError] = useState("");
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const groupedExpenses = expenses.reduce<Record<string, Expense[]>>(
    (groups, expense) => {
      groups[expense.expenseDate] = [
        ...(groups[expense.expenseDate] ?? []),
        expense,
      ];
      return groups;
    },
    {},
  );
  const dates = Object.keys(groupedExpenses).sort((a, b) => a.localeCompare(b));

  function startEditing(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditExpenseDate(expense.expenseDate);
    setEditPayerId(expense.payerId);
    setEditAmount(String(expense.amount));
    setEditDescription(expense.description);
    setEditTargetParticipantIds(expense.targetParticipantIds);
    setEditError("");
  }

  function cancelEditing() {
    setEditingExpenseId(null);
    setEditError("");
  }

  function toggleEditTarget(participantId: string) {
    setEditTargetParticipantIds((currentIds) => {
      if (currentIds.includes(participantId)) {
        return currentIds.filter((id) => id !== participantId);
      }

      return [...currentIds, participantId];
    });
  }

  async function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
    expenseId: string,
  ) {
    event.preventDefault();

    const parsedAmount = toPositiveInteger(editAmount);

    if (!editPayerId) {
      setEditError("결제자를 선택해주세요.");
      return;
    }

    if (!parsedAmount) {
      setEditError("금액을 1원 이상 입력해주세요.");
      return;
    }

    if (editTargetParticipantIds.length === 0) {
      setEditError("정산 대상자를 1명 이상 선택해주세요.");
      return;
    }

    try {
      setEditError("");
      setSavingExpenseId(expenseId);
      await onUpdate(expenseId, {
        payerId: editPayerId,
        amount: parsedAmount,
        description: editDescription.trim() || "상세내역 없음",
        expenseDate: editExpenseDate,
        targetParticipantIds: editTargetParticipantIds,
      });
      cancelEditing();
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "결제 내역을 수정하지 못했어요.",
      );
    } finally {
      setSavingExpenseId(null);
    }
  }

  return (
    <section className="receipt-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">결제 내역</h2>
        <span className="text-sm font-bold text-receipt-muted">
          {expenses.length}건
        </span>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm leading-6 text-receipt-muted">
          아직 추가된 결제 내역이 없어요.
        </p>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => (
            <div className="space-y-2" key={date}>
              <h3 className="border-b border-dashed border-receipt-line pb-2 text-xs font-black text-receipt-muted">
                {formatDateLabel(date)}
              </h3>
              <ul className="space-y-2">
                {groupedExpenses[date].map((expense) => {
                  const isEditing = editingExpenseId === expense.id;
                  const saving = savingExpenseId === expense.id;

                  return (
                    <li
                      className="border border-receipt-line bg-white/55 p-3"
                      key={expense.id}
                    >
                      {isEditing ? (
                        <form
                          className="space-y-3"
                          onSubmit={(event) =>
                            handleEditSubmit(event, expense.id)
                          }
                        >
                          <div>
                            <label
                              className="label"
                              htmlFor={`edit-date-${expense.id}`}
                            >
                              결제 날짜
                            </label>
                            <input
                              className="input"
                              id={`edit-date-${expense.id}`}
                              type="date"
                              value={editExpenseDate}
                              disabled={saving}
                              onChange={(event) =>
                                setEditExpenseDate(event.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label
                              className="label"
                              htmlFor={`edit-payer-${expense.id}`}
                            >
                              결제자
                            </label>
                            <select
                              className="input"
                              id={`edit-payer-${expense.id}`}
                              value={editPayerId}
                              disabled={saving}
                              onChange={(event) =>
                                setEditPayerId(event.target.value)
                              }
                            >
                              {participants.map((participant) => (
                                <option
                                  key={participant.id}
                                  value={participant.id}
                                >
                                  {participant.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              className="label"
                              htmlFor={`edit-amount-${expense.id}`}
                            >
                              금액
                            </label>
                            <input
                              className="input amount"
                              id={`edit-amount-${expense.id}`}
                              inputMode="numeric"
                              value={editAmount}
                              disabled={saving}
                              onChange={(event) =>
                                setEditAmount(event.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label
                              className="label"
                              htmlFor={`edit-description-${expense.id}`}
                            >
                              상세내역
                            </label>
                            <textarea
                              className="input textarea"
                              id={`edit-description-${expense.id}`}
                              value={editDescription}
                              disabled={saving}
                              onChange={(event) =>
                                setEditDescription(event.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="label mb-0">정산 대상자</span>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  className="tiny-button"
                                  type="button"
                                  onClick={() =>
                                    setEditTargetParticipantIds(
                                      participants.map(
                                        (participant) => participant.id,
                                      ),
                                    )
                                  }
                                  disabled={saving || participants.length === 0}
                                >
                                  <CheckSquare size={14} aria-hidden="true" />
                                  전체 선택
                                </button>
                                <button
                                  className="tiny-button"
                                  type="button"
                                  onClick={() =>
                                    setEditTargetParticipantIds([])
                                  }
                                  disabled={
                                    saving ||
                                    editTargetParticipantIds.length === 0
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
                                    checked={editTargetParticipantIds.includes(
                                      participant.id,
                                    )}
                                    disabled={saving}
                                    onChange={() =>
                                      toggleEditTarget(participant.id)
                                    }
                                  />
                                  <span className="min-w-0 truncate">
                                    {participant.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {editError ? (
                            <p className="text-sm leading-6 text-receipt-danger">
                              {editError}
                            </p>
                          ) : null}

                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              className="key-button key-button-primary"
                              type="submit"
                              disabled={saving}
                            >
                              <Save size={16} aria-hidden="true" />
                              {saving ? "저장 중" : "수정 저장"}
                            </button>
                            <button
                              className="key-button"
                              type="button"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              <X size={16} aria-hidden="true" />
                              취소
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="grid grid-cols-[1fr_auto] gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-black">
                                {expense.description}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-receipt-muted">
                                결제: {expense.payerName}
                              </p>
                            </div>
                            <p className="amount text-sm font-black">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <p className="min-w-0 text-xs leading-5 text-receipt-muted">
                              대상: {expense.targetParticipantNames.join(", ")}
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <button
                                className="tiny-button"
                                type="button"
                                onClick={() => startEditing(expense)}
                              >
                                <Pencil size={14} aria-hidden="true" />
                                수정
                              </button>
                              <button
                                className="tiny-button"
                                type="button"
                                onClick={() => onDelete(expense.id)}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                                삭제
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
