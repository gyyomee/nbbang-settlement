export default function LoadingView({ message = "불러오는 중..." }: { message?: string }) {
  return (
    <main className="receipt-shell">
      <section className="receipt-card">
        <p className="text-center text-sm font-bold text-receipt-muted">{message}</p>
      </section>
    </main>
  );
}
