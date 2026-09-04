import { Check, CircleHelp, Copy, Home, Pencil, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { settlementHeaderTranslations, useCurrentLanguage } from "../i18n";
import type { Settlement } from "../types";

const SETTLEMENT_TITLE_MAX_LENGTH = 30;
const TOP_NAV_ICON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-receipt-line bg-white/70 p-0 text-receipt-ink shadow-key transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-receipt-ink active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

export default function SettlementHeader({
  isManagingSettlement,
  onFinishManagement,
  onOpenHelp,
  onStartManagement,
  onUpdateSettlementName,
  settlement,
}: {
  isManagingSettlement: boolean;
  onFinishManagement: () => void;
  onOpenHelp: () => void;
  onStartManagement: () => void;
  onUpdateSettlementName: (settlementName: string) => Promise<void>;
  settlement: Settlement;
}) {
  const language = useCurrentLanguage();
  const t = settlementHeaderTranslations[language];
  const [copied, setCopied] = useState(false);
  const [draftTitle, setDraftTitle] = useState(settlement.settlementName);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    setDraftTitle(settlement.settlementName);
    setTitleError("");
  }, [isManagingSettlement, settlement.settlementName]);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(settlement.settlementCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleSaveTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingTitle) {
      return;
    }

    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setTitleError(t.titleRequired);
      return;
    }

    if (nextTitle.length > SETTLEMENT_TITLE_MAX_LENGTH) {
      setTitleError(t.titleMaxLength);
      return;
    }

    if (nextTitle === settlement.settlementName.trim()) {
      setDraftTitle(settlement.settlementName);
      setTitleError("");
      return;
    }

    try {
      setTitleError("");
      setSavingTitle(true);
      await onUpdateSettlementName(nextTitle);
      setDraftTitle(nextTitle);
    } catch (error) {
      setTitleError(error instanceof Error ? error.message : t.titleSaveFailed);
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Link
            className={TOP_NAV_ICON_CLASS}
            to="/"
            aria-label={t.homeAriaLabel}
            title={t.homeLabel}
          >
            <Home size={16} aria-hidden="true" />
          </Link>
          <button
            className={TOP_NAV_ICON_CLASS}
            type="button"
            aria-label={t.helpLabel}
            title={t.helpLabel}
            onClick={onOpenHelp}
          >
            <CircleHelp size={16} aria-hidden="true" />
          </button>
        </div>
        <button
          className={TOP_NAV_ICON_CLASS}
          type="button"
          aria-label={
            isManagingSettlement
              ? t.finishManagementButton
              : t.manageSettlementButton
          }
          title={
            isManagingSettlement
              ? t.finishManagementButton
              : t.manageSettlementButton
          }
          onClick={isManagingSettlement ? onFinishManagement : onStartManagement}
        >
          {isManagingSettlement ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Pencil size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-receipt-muted">
          SETTLEMENT RECEIPT
        </p>
        {isManagingSettlement ? (
          <form className="mt-2 space-y-2" onSubmit={handleSaveTitle}>
            <input
              className="input mx-auto max-w-full text-center text-xl font-black sm:text-2xl"
              maxLength={SETTLEMENT_TITLE_MAX_LENGTH}
              value={draftTitle}
              disabled={savingTitle}
              autoFocus
              onChange={(event) => {
                setDraftTitle(event.target.value);
                setTitleError("");
              }}
            />
            <div className="flex justify-center">
              <button
                className="tiny-button"
                type="submit"
                disabled={savingTitle}
              >
                <Save size={14} aria-hidden="true" />
                {t.saveTitleButton}
              </button>
            </div>
            {titleError ? (
              <p className="text-xs font-bold leading-5 text-receipt-danger">
                {titleError}
              </p>
            ) : null}
          </form>
        ) : (
          <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
            {settlement.settlementName}
          </h1>
        )}
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
