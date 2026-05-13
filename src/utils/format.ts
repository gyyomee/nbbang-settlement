const currencyFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(amount: number, language: "ko" | "en" = "ko") {
  const roundedAmount = Math.round(amount);

  if (language === "en") {
    const formattedAmount = currencyFormatter.format(Math.abs(roundedAmount));
    return roundedAmount < 0
      ? `-KRW ${formattedAmount}`
      : `KRW ${formattedAmount}`;
  }

  return `${currencyFormatter.format(roundedAmount)}원`;
}

export function formatDateLabel(date: string) {
  if (!date) {
    return "날짜 없음";
  }

  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function todayInputValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}
