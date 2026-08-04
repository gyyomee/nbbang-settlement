import {
  type ChangeEvent,
  type InputHTMLAttributes,
  useLayoutEffect,
  useRef,
} from "react";
import {
  formatAmountInputValue,
  getAmountInputCaretPosition,
} from "../utils/amountInput";

type AmountInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export default function AmountInput({
  inputMode = "numeric",
  onValueChange,
  value,
  ...props
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionStart = useRef<number | null>(null);

  useLayoutEffect(() => {
    const selectionStart = pendingSelectionStart.current;

    if (selectionStart === null) {
      return;
    }

    pendingSelectionStart.current = null;
    setInputSelection(inputRef.current, selectionStart);
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const formattedValue = formatAmountInputValue(rawValue);

    if (formattedValue === null) {
      const selectionStart = Math.max(
        0,
        (event.currentTarget.selectionStart ?? value.length) - 1,
      );
      event.currentTarget.value = value;
      setInputSelection(event.currentTarget, selectionStart);
      return;
    }

    const selectionStart = getAmountInputCaretPosition(
      rawValue,
      event.currentTarget.selectionStart ?? rawValue.length,
      formattedValue,
    );

    if (formattedValue === value) {
      event.currentTarget.value = formattedValue;
      setInputSelection(event.currentTarget, selectionStart);
      return;
    }

    pendingSelectionStart.current = selectionStart;
    onValueChange(formattedValue);
  }

  return (
    <input
      {...props}
      ref={inputRef}
      inputMode={inputMode}
      value={value}
      onChange={handleChange}
    />
  );
}

function setInputSelection(input: HTMLInputElement | null, selectionStart: number) {
  if (!input) {
    return;
  }

  const safeSelectionStart = Math.min(selectionStart, input.value.length);
  input.setSelectionRange(safeSelectionStart, safeSelectionStart);
}
