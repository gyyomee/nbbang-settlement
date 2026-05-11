const SETTLEMENT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SETTLEMENT_CODE_LENGTH = 8;

export function generateSettlementCode() {
  const values = new Uint32Array(SETTLEMENT_CODE_LENGTH);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => SETTLEMENT_CODE_ALPHABET[value % SETTLEMENT_CODE_ALPHABET.length]).join("");
}

export function normalizeSettlementCode(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

export function isValidSettlementCode(value: string) {
  return new RegExp(`^[${SETTLEMENT_CODE_ALPHABET}]{${SETTLEMENT_CODE_LENGTH}}$`).test(normalizeSettlementCode(value));
}
