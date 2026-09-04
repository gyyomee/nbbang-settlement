import { MessageCircle } from "lucide-react";
import { useState } from "react";
import {
  kakaoSettlementShareTranslations,
  useCurrentLanguage,
} from "../i18n";
import type { SettlementTransfer } from "../types";
import { KAKAO_SHARE_RESULT_IMAGE_PATH, shareKakao } from "../utils/kakao";
import { buildSettlementShareDescription } from "../utils/settlement";
import ActionIconButton from "./ActionIconButton";

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
        imagePath: KAKAO_SHARE_RESULT_IMAGE_PATH,
        url: window.location.href,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : t.shareFailed);
    } finally {
      setSharing(false);
    }
  }

  return (
    <ActionIconButton
      ariaLabel="카카오톡 공유"
      tooltip="카카오톡 공유"
      onClick={handleShare}
      disabled={sharing}
    >
      <MessageCircle size={16} aria-hidden="true" />
    </ActionIconButton>
  );
}
