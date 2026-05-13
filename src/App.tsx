import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  appTranslations,
  getNextLanguage,
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
        <Route path="/settlements/:settlementCode" element={<SettlementPage />} />
        <Route path="*" element={<InvalidSettlementPage />} />
      </Routes>
    </BrowserRouter>
  );
}
