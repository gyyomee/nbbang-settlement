import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { kakaoInviteTranslations, useCurrentLanguage } from "../i18n";
import { shareKakao } from "../utils/kakao";

export default function KakaoInviteButton({
  settlementName,
  settlementCode,
}: {
  settlementName: string;
  settlementCode: string;
}) {
  const language = useCurrentLanguage();
  const t = kakaoInviteTranslations[language];
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    try {
      setSharing(true);
      await shareKakao({
        title: t.title,
        description: `${t.settlementNameLabel}: ${settlementName}\n${t.settlementCodeLabel}: ${settlementCode}`,
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
      <MessageCircle size={17} aria-hidden="true" />
      {sharing ? t.sharingButton : t.inviteButton}
    </button>
  );
}
