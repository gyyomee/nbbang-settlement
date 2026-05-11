export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
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
