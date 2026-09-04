import {
  CheckSquare,
  Copy,
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
import {
  buildClipboardHtmlTable,
  sanitizeTableCell,
  writeTableToClipboard,
} from "../utils/clipboardTable";
import { formatDateLabel, formatKRW, formatNumber } from "../utils/format";
import { toPositiveInteger } from "../utils/validation";
import ActionIconButton from "./ActionIconButton";
import AmountInput from "./AmountInput";

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
  settlementName,
  onAddExpense,
  addExpenseDisabled = false,
  onUpdate,
  onDelete,
}: {
  expenses: Expense[];
  participants: Participant[];
  settlementName: string;
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
  const [copyMessage, setCopyMessage] = useState("");
  const [isManagingExpenses, setIsManagingExpenses] = useState(false);
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
  const expensesForCopy = dates.flatMap((date) => groupedExpenses[date]);

  function startEditing(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditExpenseDate(expense.expenseDate);
    setEditPayerId(expense.payerId);
    setEditAmount(formatNumber(expense.amount));
    setEditDescription(expense.description);
    setEditTargetParticipantIds(expense.targetParticipantIds);
    setEditError(null);
  }

  function cancelEditing() {
    setEditingExpenseId(null);
    setEditError(null);
  }

  function toggleExpenseManagement() {
    if (isManagingExpenses) {
      cancelEditing();
    }

    setIsManagingExpenses(!isManagingExpenses);
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

  async function handleCopyTable() {
    try {
      await writeTableToClipboard(
        buildExpenseClipboardContent(settlementName, expensesForCopy),
      );
      showCopyMessage("표를 복사했어요.");
    } catch {
      showCopyMessage("표 복사에 실패했어요.");
    }
  }

  function showCopyMessage(message: string) {
    setCopyMessage(message);
    window.setTimeout(() => setCopyMessage(""), 1800);
  }

  return (
    <section className="receipt-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{t.title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {onAddExpense ? (
            <ActionIconButton
              ariaLabel="결제 추가"
              tooltip="결제 추가"
              onClick={onAddExpense}
              disabled={addExpenseDisabled}
            >
              <Plus size={17} aria-hidden="true" />
            </ActionIconButton>
          ) : null}
          <ActionIconButton
            ariaLabel="복사"
            tooltip="복사"
            onClick={handleCopyTable}
            disabled={expenses.length === 0}
          >
            <Copy size={16} aria-hidden="true" />
          </ActionIconButton>
          <ActionIconButton
            ariaLabel={t.editButton}
            tooltip={t.editButton}
            onClick={toggleExpenseManagement}
            disabled={expenses.length === 0 || Boolean(savingExpenseId)}
          >
            <Pencil size={16} aria-hidden="true" />
          </ActionIconButton>
        </div>
      </div>

      {copyMessage ? (
        <p className="text-xs font-bold leading-5 text-receipt-muted">
          {copyMessage}
        </p>
      ) : null}

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
                  const isEditing =
                    isManagingExpenses && editingExpenseId === expense.id;
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
                            <AmountInput
                              className="input amount"
                              id={`edit-amount-${expense.id}`}
                              value={editAmount}
                              disabled={saving}
                              onValueChange={setEditAmount}
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
                              <p className="mt-1 min-w-0 break-words text-xs leading-5 text-receipt-muted">
                                {t.payerMetadataLabel} {expense.payerName} ·{" "}
                                {t.targetMetadataLabel}{" "}
                                {expense.targetParticipantNames.join(", ")}
                              </p>
                            </div>
                            <p className="amount text-sm font-black">
                              {formatKRW(expense.amount)}
                            </p>
                          </div>
                          {isManagingExpenses ? (
                            <div className="mt-3 flex justify-end">
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
                          ) : null}
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

function buildExpenseClipboardContent(settlementName: string, expenses: Expense[]) {
  const headers = ["날짜", "내역", "결제자", "총 금액", "정산 대상"];
  const rows = expenses.map((expense) => [
    expense.expenseDate,
    sanitizeTableCell(expense.description),
    sanitizeTableCell(expense.payerName),
    formatKRW(expense.amount),
    sanitizeTableCell(expense.targetParticipantNames.join(", ")),
  ]);
  const plainText = [
    settlementName,
    "",
    "[결제 내역]",
    "",
    headers.join("\t"),
    ...rows.map((row) => row.join("\t")),
  ].join("\n");

  return {
    html: buildClipboardHtmlTable({
      headers,
      rows,
      sectionTitle: "[결제 내역]",
      title: settlementName,
    }),
    plainText,
  };
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
