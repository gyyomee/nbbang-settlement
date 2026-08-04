import { settlementResultTranslations, useCurrentLanguage } from "../i18n";
import type { SettlementBalance, SettlementTransfer } from "../types";
import { formatKRW } from "../utils/format";
import KakaoSettlementShareButton from "./KakaoSettlementShareButton";

export default function SettlementResult({
  balances,
  transfers,
}: {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
}) {
  const language = useCurrentLanguage();
  const t = settlementResultTranslations[language];

  return (
    <section className="receipt-section space-y-5">
      <div>
        <h2 className="text-base font-black">{t.title}</h2>
        <p className="mt-1 text-xs leading-5 text-receipt-muted">
          {t.remainderNote}
        </p>
      </div>

      <div className="space-y-2">
        {balances.map((balance) => (
          <div
            className="border border-receipt-line bg-white/55 p-3"
            key={balance.participantId}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black">
                {balance.participantName}
              </p>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold text-receipt-muted">
                  {getBalanceAmountLabel(balance.balance, t)}
                </p>
                <p
                  className={`amount text-sm font-black ${
                    balance.balance > 0
                      ? "text-receipt-success"
                      : balance.balance < 0
                        ? "text-receipt-danger"
                        : "text-receipt-muted"
                  }`}
                >
                  {formatBalanceAmount(balance.balance)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-receipt-muted">
              <span>
                {t.paidAmountLabel}{" "}
                {formatKRW(balance.paidAmount)}
              </span>
              <span className="amount">
                {t.owedAmountLabel}{" "}
                {formatKRW(balance.owedAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-receipt-line pt-4">
        <h3 className="mb-3 text-sm font-black">{t.transfersTitle}</h3>
        {transfers.length === 0 ? (
          <p className="text-sm leading-6 text-receipt-muted">
            {t.noTransfers}
          </p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((transfer) => (
              <li
                className="grid grid-cols-[1fr_auto] gap-3 border border-receipt-line bg-white/55 px-3 py-3 text-sm"
                key={`${transfer.fromParticipantId}-${transfer.toParticipantId}-${transfer.amount}`}
              >
                <span className="min-w-0 break-words">
                  <strong>{transfer.fromName}</strong> →{" "}
                  <strong>{transfer.toName}</strong>
                </span>
                <span className="amount font-black">
                  {formatKRW(transfer.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <KakaoSettlementShareButton transfers={transfers} />
    </section>
  );
}

function getBalanceAmountLabel(
  balance: number,
  translations: (typeof settlementResultTranslations)["ko"],
) {
  if (balance > 0) {
    return translations.receivableAmountLabel;
  }

  if (balance < 0) {
    return translations.payableAmountLabel;
  }

  return translations.settledAmountLabel;
}

function formatBalanceAmount(balance: number) {
  if (balance > 0) {
    return `+${formatKRW(balance)}`;
  }

  if (balance < 0) {
    return formatKRW(Math.abs(balance));
  }

  return formatKRW(0);
}
