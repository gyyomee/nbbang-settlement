import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { shareKakao } from "../utils/kakao";

export default function KakaoInviteButton({
  settlementName,
  settlementCode,
}: {
  settlementName: string;
  settlementCode: string;
}) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    try {
      setSharing(true);
      await shareKakao({
        title: "N빵 정산에 참여해주세요.",
        description: `정산 이름: ${settlementName}\n정산 코드: ${settlementCode}`,
        buttonTitle: "정산 참여하기",
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
      <MessageCircle size={17} aria-hidden="true" />
      {sharing ? "공유 준비 중" : "카카오톡으로 초대하기"}
    </button>
  );
}
