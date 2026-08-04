import { formatNumber } from "./format";

const AMOUNT_INPUT_PATTERN = /^[\d,]*$/;

export function parseAmountInputDigits(value: string) {
  if (!AMOUNT_INPUT_PATTERN.test(value)) {
    return null;
  }

  return value.replace(/,/g, "");
}

export function formatAmountInputValue(value: string) {
  const digits = parseAmountInputDigits(value);

  if (digits === null) {
    return null;
  }

  return digits ? formatNumber(Number(digits)) : "";
}

export function getAmountInputCaretPosition(
  rawValue: string,
  selectionStart: number,
  formattedValue: string,
) {
  const digitsBeforeCaret = countDigits(rawValue.slice(0, selectionStart));

  if (digitsBeforeCaret === 0) {
    return 0;
  }

  let digitsSeen = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) {
      digitsSeen += 1;
    }

    if (digitsSeen === digitsBeforeCaret) {
      return index + 1;
    }
  }

  return formattedValue.length;
}

function countDigits(value: string) {
  return value.replace(/\D/g, "").length;
}
