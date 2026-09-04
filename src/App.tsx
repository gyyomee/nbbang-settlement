import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  appTranslations,
  getNextLanguage,
  helpDialogTranslations,
  type Language,
} from "./i18n";
import HomePage from "./pages/HomePage";
import InvalidSettlementPage from "./pages/InvalidSettlementPage";
import SettlementPage from "./pages/SettlementPage";
import { getStoredLanguage, setStoredLanguage } from "./utils/storage";

export default function App() {
  const [language, setLanguage] = useState<Language>(() =>
    getStoredLanguage(),
  );
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const translation = appTranslations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    setStoredLanguage(language);
  }, [language]);

  function toggleLanguage() {
    setLanguage((currentLanguage) => getNextLanguage(currentLanguage));
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <header className="mx-auto flex w-full max-w-[560px] justify-end px-4 pt-5 sm:pt-8">
        <button
          className="tiny-button bg-receipt-paper/95"
          type="button"
          aria-label={translation.languageSwitchLabel}
          onClick={toggleLanguage}
        >
          {translation.languageSwitchButton}
        </button>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/settlements/:settlementCode"
          element={<SettlementPage onOpenHelp={() => setIsHelpOpen(true)} />}
        />
        <Route path="*" element={<InvalidSettlementPage />} />
      </Routes>
      <HelpDialog
        isOpen={isHelpOpen}
        language={language}
        onClose={() => setIsHelpOpen(false)}
      />
    </BrowserRouter>
  );
}

function HelpDialog({
  isOpen,
  language,
  onClose,
}: {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}) {
  const t = helpDialogTranslations[language];
  const helpItems = [
    { title: t.joinTitle, body: t.joinBody },
    { title: t.expenseTitle, body: t.expenseBody },
    { title: t.editTitle, body: t.editBody },
    { title: t.shareTitle, body: t.shareBody },
  ];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-[440px] border border-receipt-line bg-receipt-paper p-4 text-receipt-ink shadow-receipt sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-receipt-line pb-3">
          <h2 id="help-dialog-title" className="text-base font-black">
            {t.title}
          </h2>
          <button
            className="tiny-button h-9 w-9 p-0"
            type="button"
            aria-label={t.closeLabel}
            title={t.closeLabel}
            onClick={onClose}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-xs leading-5 text-receipt-muted">
          {t.introBody}
        </p>

        <div className="mt-4 space-y-3">
          {helpItems.map((item) => (
            <div key={item.title}>
              <h3 className="text-xs font-black">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-receipt-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
