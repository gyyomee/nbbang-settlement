import { Check, Copy, Home, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Settlement } from "../types";
import KakaoInviteButton from "./KakaoInviteButton";

export default function SettlementHeader({
  settlement,
  canDelete = false,
  deleting = false,
  onDelete,
}: {
  settlement: Settlement;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(settlement.settlementCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link className="tiny-button" to="/" aria-label="홈으로 이동">
          <Home size={15} aria-hidden="true" />
          홈
        </Link>
        <span className="text-xs font-bold text-receipt-muted">NBBANG POS</span>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-receipt-muted">SETTLEMENT RECEIPT</p>
        <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">{settlement.settlementName}</h1>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-y border-dashed border-receipt-line py-4">
        <div>
          <p className="text-xs font-bold text-receipt-muted">정산 코드</p>
          <p className="mt-1 text-2xl font-black tracking-[0.18em]">{settlement.settlementCode}</p>
        </div>
        <button className="tiny-button" type="button" onClick={handleCopyCode}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>

      <KakaoInviteButton settlementName={settlement.settlementName} settlementCode={settlement.settlementCode} />

      {canDelete ? (
        <button className="key-button key-button-danger w-full" type="button" onClick={onDelete} disabled={deleting}>
          <Trash2 size={17} aria-hidden="true" />
          {deleting ? "정산 삭제 중" : "정산 삭제하기"}
        </button>
      ) : null}
    </header>
  );
}
