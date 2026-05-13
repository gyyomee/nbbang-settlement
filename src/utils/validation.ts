export const PARTICIPANT_NAME_MAX_LENGTH = 5;

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidParticipantName(value: string) {
  return normalizeName(value).length <= PARTICIPANT_NAME_MAX_LENGTH;
}

export function getParticipantNameValidationMessage(value: string) {
  const normalizedName = normalizeName(value);

  if (!normalizedName) {
    return "참여자 이름을 입력해주세요.";
  }

  if (!isValidParticipantName(normalizedName)) {
    return `참여자 이름은 ${PARTICIPANT_NAME_MAX_LENGTH}자 이하로 입력해주세요.`;
  }

  return "";
}

export function getNameKey(value: string) {
  return normalizeName(value).toLocaleLowerCase("ko-KR");
}

export function toPositiveInteger(value: string) {
  const normalized = value.replace(/[^\d]/g, "");
  const amount = Number(normalized);

  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function getRequiredMessage(value: string, label: string) {
  return value.trim() ? "" : `${label}을 입력해주세요.`;
}
