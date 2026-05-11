import type { SettlementBalance, SettlementTransfer } from "../types";
import { formatCurrency } from "../utils/format";
import KakaoSettlementShareButton from "./KakaoSettlementShareButton";

export default function SettlementResult({
  balances,
  transfers,
}: {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
}) {
  return (
    <section className="receipt-section space-y-5">
      <div>
        <h2 className="text-base font-black">최종 정산 결과</h2>
        <p className="mt-1 text-xs leading-5 text-receipt-muted">
          나머지 금액은 결제자가 부담하도록 계산했어요.
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
              <p
                className={`amount text-sm font-black ${
                  balance.balance > 0
                    ? "text-receipt-success"
                    : balance.balance < 0
                      ? "text-receipt-danger"
                      : "text-receipt-muted"
                }`}
              >
                {balance.balance > 0 ? "+" : ""}
                {formatCurrency(balance.balance)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-receipt-muted">
              <span>결제 {formatCurrency(balance.paidAmount)}</span>
              <span className="amount">
                각자 {formatCurrency(balance.owedAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-receipt-line pt-4">
        <h3 className="mb-3 text-sm font-black">송금할 내역</h3>
        {transfers.length === 0 ? (
          <p className="text-sm leading-6 text-receipt-muted">
            정산할 금액이 없습니다.
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
                  {formatCurrency(transfer.amount)}
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
