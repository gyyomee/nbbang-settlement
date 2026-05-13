import { Check, Copy, Home } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { settlementHeaderTranslations, useCurrentLanguage } from "../i18n";
import type { Settlement } from "../types";

export default function SettlementHeader({
  settlement,
}: {
  settlement: Settlement;
}) {
  const language = useCurrentLanguage();
  const t = settlementHeaderTranslations[language];
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(settlement.settlementCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link className="tiny-button" to="/" aria-label={t.homeAriaLabel}>
          <Home size={15} aria-hidden="true" />
          {t.homeLabel}
        </Link>
        <span className="text-xs font-bold text-receipt-muted">NBBANG POS</span>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-receipt-muted">
          SETTLEMENT RECEIPT
        </p>
        <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
          {settlement.settlementName}
        </h1>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-dashed border-receipt-line pt-4">
        <div>
          <p className="text-xs font-bold text-receipt-muted">
            {t.settlementCodeLabel}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[0.18em]">
            {settlement.settlementCode}
          </p>
        </div>
        <button className="tiny-button" type="button" onClick={handleCopyCode}>
          {copied ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {copied ? t.copiedButton : t.copyButton}
        </button>
      </div>
    </header>
  );
}
