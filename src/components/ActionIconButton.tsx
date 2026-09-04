import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "title"
> & {
  ariaLabel: string;
  tooltip: string;
  children: ReactNode;
};

export default function ActionIconButton({
  ariaLabel,
  children,
  tooltip,
  type = "button",
  ...props
}: ActionIconButtonProps) {
  return (
    <button
      {...props}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-receipt-line bg-white/70 p-0 text-receipt-ink shadow-key transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-receipt-ink active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white/70"
      type={type}
      aria-label={ariaLabel}
      title={tooltip}
    >
      {children}
    </button>
  );
}
