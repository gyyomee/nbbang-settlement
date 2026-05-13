import { Check, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { participantListTranslations, useCurrentLanguage } from "../i18n";
import type { Participant } from "../types";
import {
  PARTICIPANT_NAME_MAX_LENGTH,
  isValidParticipantName,
  normalizeName,
} from "../utils/validation";

const DUPLICATE_PARTICIPANT_MESSAGE =
  "이미 같은 이름의 참여자가 있어요. 구분되는 이름으로 입력해주세요.";
const DELETE_BLOCKED_MESSAGE =
  "이 참여자는 이미 결제 내역에 포함되어 있어 삭제할 수 없습니다. 관련 결제 내역을 먼저 삭제해주세요.";
const DELETE_WAIT_FOR_EXPENSES_MESSAGE =
  "결제 내역을 불러오는 중이에요. 잠시 후 다시 시도해주세요.";
const SELF_DELETE_BLOCKED_MESSAGE =
  "내 참여자 정보는 삭제할 수 없습니다. 이름 변경만 가능합니다.";

type ParticipantErrorKey =
  | "addFailed"
  | "deleteBlocked"
  | "deleteFailed"
  | "deleteWaitForExpenses"
  | "duplicate"
  | "nameMaxLength"
  | "nameRequired"
  | "selfDeleteBlocked";

const PARTICIPANT_EDIT_LABELS = {
  ko: {
    editButton: "참여자 수정",
    doneButton: "완료",
    currentUserLabel: "내 이름",
    deleteUnavailableLabel: "삭제 불가",
  },
  en: {
    editButton: "Edit Participants",
    doneButton: "Done",
    currentUserLabel: "My Name",
    deleteUnavailableLabel: "Cannot Delete",
  },
};

export default function ParticipantList({
  participants,
  currentParticipantId,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
}: {
  participants: Participant[];
  currentParticipantId: string | null;
  onAddParticipant?: (participantName: string) => Promise<void>;
  onUpdateParticipant?: (id: string, name: string) => Promise<void>;
  onDeleteParticipant?: (participant: Participant) => Promise<void>;
}) {
  const language = useCurrentLanguage();
  const t = participantListTranslations[language];
  const editLabels = PARTICIPANT_EDIT_LABELS[language];
  const canEditParticipants = Boolean(
    onAddParticipant || onDeleteParticipant || onUpdateParticipant,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState("");
  const [formError, setFormError] = useState<ParticipantErrorKey | null>(null);
  const [deleteError, setDeleteError] = useState<ParticipantErrorKey | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deletingParticipantId, setDeletingParticipantId] = useState<
    string | null
  >(null);
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentParticipantId) return -1;
    if (b.id === currentParticipantId) return 1;
    return 0;
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onAddParticipant) {
      return;
    }

    const normalizedName = normalizeName(participantName);

    if (!normalizedName) {
      setFormError("nameRequired");
      return;
    }

    if (!isValidParticipantName(normalizedName)) {
      setFormError("nameMaxLength");
      return;
    }

    try {
      setFormError(null);
      setDeleteError(null);
      setSaving(true);
      await onAddParticipant(normalizedName);
      setParticipantName("");
      setIsAdding(false);
    } catch (addError) {
      setFormError(getParticipantErrorKey(addError, "add"));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setParticipantName("");
    setFormError(null);
    setIsAdding(false);
  }

  function startEditing() {
    setIsEditing(true);
    setDeleteError(null);
  }

  function finishEditing() {
    setIsEditing(false);
    setDeleteError(null);
    setEditingParticipantId(null);
    handleCancel();
  }

  async function handleUpdateSubmit(participant: Participant) {
    const name = normalizeName(editingName);
    if (!name || name === participant.name) {
      setEditingParticipantId(null);
      return;
    }
    try {
      if (onUpdateParticipant) await onUpdateParticipant(participant.id, name);
      setEditingParticipantId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : t.updateParticipantFailed);
      setEditingName(participant.name);
    }
  }

  async function handleDeleteParticipant(participant: Participant) {
    if (!onDeleteParticipant) {
      return;
    }

    if (participant.id === currentParticipantId) {
      setDeleteError("selfDeleteBlocked");
      return;
    }

    const confirmed = window.confirm(t.deleteConfirm);

    if (!confirmed) {
      return;
    }

    try {
      setDeleteError(null);
      setDeletingParticipantId(participant.id);
      await onDeleteParticipant(participant);
    } catch (deleteParticipantError) {
      setDeleteError(getParticipantErrorKey(deleteParticipantError, "delete"));
    } finally {
      setDeletingParticipantId(null);
    }
  }

  return (
    <section className="receipt-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{t.title}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold text-receipt-muted">
            {t.participantCount(participants.length)}
          </span>
          {canEditParticipants && !isEditing ? (
            <button
              className="tiny-button"
              type="button"
              onClick={startEditing}
            >
              <Pencil size={14} aria-hidden="true" />
              {editLabels.editButton}
            </button>
          ) : null}
          {isEditing ? (
            <button
              className="tiny-button"
              type="button"
              onClick={finishEditing}
              disabled={saving || Boolean(deletingParticipantId)}
            >
              <Check size={14} aria-hidden="true" />
              {editLabels.doneButton}
            </button>
          ) : null}
        </div>
      </div>

      {isEditing && deleteError ? (
        <p className="text-sm leading-6 text-receipt-danger">
          {getParticipantErrorText(deleteError, t)}
        </p>
      ) : null}

      {isEditing && formError ? (
        <p className="text-sm leading-6 text-receipt-danger">
          {getParticipantErrorText(formError, t)}
        </p>
      ) : null}

      {participants.length === 0 ? (
        <p className="text-sm text-receipt-muted">{t.noParticipants}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sortedParticipants.map((participant) => {
            const isMe = participant.id === currentParticipantId;
            return (
              <li
                className={`min-h-10 border px-2 py-1.5 ${
                  isMe
                    ? "border-receipt-ink bg-receipt-ink text-white"
                    : "border-receipt-line bg-white/50"
                }`}
                key={participant.id}
              >
                {isEditing ? (
                  <div className="grid min-h-7 grid-cols-[1fr_auto] items-center gap-2">
                    <span className="flex min-w-0 items-center justify-center gap-1.5">
                      <UserRound size={15} aria-hidden="true" />
                      {editingParticipantId === participant.id ? (
                        <input
                          autoFocus
                          className="min-w-0 w-20 bg-transparent outline-none border-b border-receipt-text font-bold"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleUpdateSubmit(participant)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateSubmit(participant)
                          }
                          maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                        />
                      ) : (
                        <span
                          className="min-w-0 truncate text-sm font-bold cursor-pointer border-b border-dashed border-current"
                          onClick={() => {
                            setEditingParticipantId(participant.id);
                            setEditingName(participant.name);
                          }}
                        >
                          {participant.name}
                        </span>
                      )}
                    </span>
                    {isMe ? (
                      <span className="text-xs font-black">
                        {editLabels.currentUserLabel}
                      </span>
                    ) : onDeleteParticipant ? (
                      <button
                        className="flex h-7 w-7 items-center justify-center border border-receipt-line text-xs font-black text-receipt-danger"
                        type="button"
                        aria-label={t.deleteParticipantLabel(participant.name)}
                        onClick={() =>
                          void handleDeleteParticipant(participant)
                        }
                        disabled={Boolean(deletingParticipantId)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="text-xs font-black text-receipt-muted">
                        {editLabels.deleteUnavailableLabel}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex min-h-7 min-w-0 items-center justify-center text-center">
                    <span className="min-w-0 truncate text-sm font-bold">
                      {participant.name}
                    </span>
                  </span>
                )}
              </li>
            );
          })}

          {isEditing && onAddParticipant ? (
            <li className="min-h-10 border border-receipt-line border-dashed bg-white/30 px-2 py-1.5 flex items-center justify-center">
              {isAdding ? (
                <form
                  className="flex items-center gap-1"
                  onSubmit={handleSubmit}
                >
                  <input
                    autoFocus
                    className="w-20 bg-transparent outline-none border-b border-receipt-text text-sm font-bold text-center"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder={t.editNamePlaceholder}
                    maxLength={PARTICIPANT_NAME_MAX_LENGTH}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  className="flex h-full w-full items-center justify-center text-receipt-text"
                  onClick={() => setIsAdding(true)}
                  disabled={saving}
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function getParticipantErrorKey(
  error: unknown,
  action: "add" | "delete",
): ParticipantErrorKey {
  const message = error instanceof Error ? error.message : "";

  if (
    message === DUPLICATE_PARTICIPANT_MESSAGE ||
    message === participantListTranslations.en.duplicateParticipant
  ) {
    return "duplicate";
  }

  if (
    message === DELETE_BLOCKED_MESSAGE ||
    message === participantListTranslations.en.deleteBlocked
  ) {
    return "deleteBlocked";
  }

  if (
    message === DELETE_WAIT_FOR_EXPENSES_MESSAGE ||
    message === participantListTranslations.en.deleteWaitForExpenses
  ) {
    return "deleteWaitForExpenses";
  }

  if (message === SELF_DELETE_BLOCKED_MESSAGE) {
    return "selfDeleteBlocked";
  }

  return action === "add" ? "addFailed" : "deleteFailed";
}

function getParticipantErrorText(
  errorKey: ParticipantErrorKey,
  translations: (typeof participantListTranslations)["ko"],
) {
  switch (errorKey) {
    case "addFailed":
      return translations.addParticipantFailed;
    case "deleteBlocked":
      return translations.deleteBlocked;
    case "deleteFailed":
      return translations.deleteParticipantFailed;
    case "deleteWaitForExpenses":
      return translations.deleteWaitForExpenses;
    case "duplicate":
      return translations.duplicateParticipant;
    case "nameMaxLength":
      return translations.participantNameMaxLength(PARTICIPANT_NAME_MAX_LENGTH);
    case "nameRequired":
      return translations.participantNameRequired;
    case "selfDeleteBlocked":
      return translations.selfDeleteBlocked;
  }
}
