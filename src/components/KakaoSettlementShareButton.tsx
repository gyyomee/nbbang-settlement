import { Send } from "lucide-react";
import { useState } from "react";
import type { SettlementTransfer } from "../types";
import { shareKakao } from "../utils/kakao";
import { buildSettlementShareDescription } from "../utils/settlement";

export default function KakaoSettlementShareButton({
  transfers,
}: {
  transfers: SettlementTransfer[];
}) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    try {
      setSharing(true);
      await shareKakao({
        title: "정산 결과가 나왔어요.",
        description: buildSettlementShareDescription(transfers),
        buttonTitle: "정산 보기",
        url: window.location.href,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "카카오톡 공유에 실패했어요.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <button className="key-button w-full" type="button" onClick={handleShare} disabled={sharing}>
      <Send size={17} aria-hidden="true" />
      {sharing ? "공유 준비 중" : "카카오톡으로 결과 공유하기"}
    </button>
  );
}
