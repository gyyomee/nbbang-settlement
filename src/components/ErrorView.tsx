import { AlertTriangle } from "lucide-react";

export default function ErrorView({
  title = "문제가 생겼어요.",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <main className="receipt-shell">
      <section className="receipt-card space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} aria-hidden="true" />
          <h1 className="text-lg font-black">{title}</h1>
        </div>
        <p className="text-sm leading-6 text-receipt-muted">{message}</p>
      </section>
    </main>
  );
}
