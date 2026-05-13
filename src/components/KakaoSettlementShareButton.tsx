import { Send } from "lucide-react";
import { useState } from "react";
import {
  kakaoSettlementShareTranslations,
  useCurrentLanguage,
} from "../i18n";
import type { SettlementTransfer } from "../types";
import { shareKakao } from "../utils/kakao";
import { buildSettlementShareDescription } from "../utils/settlement";

export default function KakaoSettlementShareButton({
  transfers,
}: {
  transfers: SettlementTransfer[];
}) {
  const language = useCurrentLanguage();
  const t = kakaoSettlementShareTranslations[language];
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    try {
      setSharing(true);
      await shareKakao({
        title: t.title,
        description: buildSettlementShareDescription(transfers, language),
        buttonTitle: t.buttonTitle,
        url: window.location.href,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : t.shareFailed);
    } finally {
      setSharing(false);
    }
  }

  return (
    <button className="key-button w-full" type="button" onClick={handleShare} disabled={sharing}>
      <Send size={17} aria-hidden="true" />
      {sharing ? t.sharingButton : t.shareButton}
    </button>
  );
}
