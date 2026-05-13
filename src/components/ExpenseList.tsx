import {
  CheckSquare,
  Pencil,
  Plus,
  Save,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import {
  expenseListTranslations,
  type Language,
  useCurrentLanguage,
} from "../i18n";
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

type ExpenseListErrorKey =
  | "payerRequired"
  | "amountRequired"
  | "targetsRequired"
  | "updateExpenseFailed";

type ExpenseListError = { key: ExpenseListErrorKey } | { message: string };

export default function ExpenseList({
  expenses,
  participants,
  onAddExpense,
  addExpenseDisabled = false,
  onUpdate,
  onDelete,
}: {
  expenses: Expense[];
  participants: Participant[];
  onAddExpense?: () => void;
  addExpenseDisabled?: boolean;
  onUpdate: (expenseId: string, values: ExpenseEditValues) => Promise<void>;
  onDelete: (expenseId: string) => Promise<void>;
}) {
  const language = useCurrentLanguage();
  const t = expenseListTranslations[language];
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editPayerId, setEditPayerId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetParticipantIds, setEditTargetParticipantIds] = useState<
    string[]
  >([]);
  const [editError, setEditError] = useState<ExpenseListError | null>(null);
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
    setEditError(null);
  }

  function cancelEditing() {
    setEditingExpenseId(null);
    setEditError(null);
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
      setEditError({ key: "payerRequired" });
      return;
    }

    if (!parsedAmount) {
      setEditError({ key: "amountRequired" });
      return;
    }

    if (editTargetParticipantIds.length === 0) {
      setEditError({ key: "targetsRequired" });
      return;
    }

    try {
      setEditError(null);
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
          ? { message: error.message }
          : { key: "updateExpenseFailed" },
      );
    } finally {
      setSavingExpenseId(null);
    }
  }

  return (
    <section className="receipt-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{t.title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-receipt-muted">
            {t.expenseCount(expenses.length)}
          </span>
          {onAddExpense ? (
            <button
              className="tiny-button h-11 w-11 shrink-0 p-0 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              aria-label={t.addExpenseButton}
              title={t.addExpenseButton}
              onClick={onAddExpense}
              disabled={addExpenseDisabled}
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm leading-6 text-receipt-muted">
          {t.emptyMessage}
        </p>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => (
            <div className="space-y-2" key={date}>
              <h3 className="border-b border-dashed border-receipt-line pb-2 text-xs font-black text-receipt-muted">
                {formatExpenseListDateLabel(date, language)}
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
                              {t.expenseDateLabel}
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
                              {t.payerLabel}
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
                              {t.amountLabel}
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
                              {t.descriptionLabel}
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
                              <span className="label mb-0">
                                {t.targetParticipantsLabel}
                              </span>
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
                                  {t.selectAllTargetsButton}
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
                              {getExpenseListErrorText(editError, t)}
                            </p>
                          ) : null}

                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              className="key-button key-button-primary"
                              type="submit"
                              disabled={saving}
                            >
                              <Save size={16} aria-hidden="true" />
                              {saving ? t.savingButton : t.saveEditButton}
                            </button>
                            <button
                              className="key-button"
                              type="button"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              <X size={16} aria-hidden="true" />
                              {t.cancelButton}
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
                                {t.paidByLine(expense.payerName)}
                              </p>
                            </div>
                            <p className="amount text-sm font-black">
                              {formatCurrency(expense.amount, language)}
                            </p>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <p className="min-w-0 text-xs leading-5 text-receipt-muted">
                              {t.targetLine(
                                expense.targetParticipantNames.join(", "),
                              )}
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <button
                                className="tiny-button"
                                type="button"
                                onClick={() => startEditing(expense)}
                              >
                                <Pencil size={14} aria-hidden="true" />
                                {t.editButton}
                              </button>
                              <button
                                className="tiny-button"
                                type="button"
                                onClick={() => onDelete(expense.id)}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                                {t.deleteButton}
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

function getExpenseListErrorText(
  error: ExpenseListError,
  translations: (typeof expenseListTranslations)["ko"],
) {
  if ("message" in error) {
    return error.message;
  }

  return translations[error.key];
}

function formatExpenseListDateLabel(dateValue: string, language: Language) {
  if (language === "ko") {
    return formatDateLabel(dateValue);
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}
