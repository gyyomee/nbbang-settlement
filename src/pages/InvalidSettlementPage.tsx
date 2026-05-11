import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function InvalidSettlementPage() {
  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-5">
        <div className="text-center">
          <p className="text-xs font-bold text-receipt-muted">INVALID CODE</p>
          <h1 className="mt-2 text-2xl font-black">정산을 찾을 수 없어요.</h1>
        </div>

        <div className="receipt-section">
          <p className="text-sm leading-6 text-receipt-muted">
            정산 코드가 잘못되었거나 삭제된 정산일 수 있어요. 코드를 다시 확인한 뒤 참여해주세요.
          </p>
        </div>

        <Link className="key-button key-button-primary w-full" to="/">
          <Home size={17} aria-hidden="true" />
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
