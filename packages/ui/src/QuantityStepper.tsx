import { useState, useEffect, useId } from "react";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  productName: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  onChange,
  productName,
  min = 0,
  max = 9999,
  disabled = false,
}: QuantityStepperProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorId = useId();

  // Đồng bộ giá trị khi prop value đổi từ ngoài
  useEffect(() => {
    setInputValue(String(value));
    setErrorMessage(null);
  }, [value]);

  const commitValue = (valStr: string) => {
    const trimmed = valStr.trim();
    const num = Number(trimmed);
    if (trimmed === "" || isNaN(num) || !Number.isInteger(num) || num < min) {
      setErrorMessage("Số lượng phải là số nguyên không âm.");
      setInputValue(String(value));
      return;
    }
    if (num > max) {
      setErrorMessage("Số lượng quá lớn.");
      setInputValue(String(value));
      return;
    }

    setErrorMessage(null);
    setInputValue(String(num));
    if (num !== value) {
      onChange(num);
    }
  };

  const handleDecrease = () => {
    if (disabled) return;
    const target = value - 1;
    if (target < min) return;
    commitValue(String(target));
  };

  const handleIncrease = () => {
    if (disabled) return;
    const target = value + 1;
    if (target > max) return;
    commitValue(String(target));
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column" }}>
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        <button
          type="button"
          aria-label={`Giảm số lượng ${productName}`}
          onClick={handleDecrease}
          disabled={disabled || value <= min}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: disabled || value <= min ? "not-allowed" : "pointer",
            border: "1px solid #D1D5DB",
            borderRight: "none",
            borderTopLeftRadius: "6px",
            borderBottomLeftRadius: "6px",
            backgroundColor: "#F9FAFB",
            color: "#374151",
          }}
        >
          −
        </button>

        <input
          type="number"
          value={inputValue}
          aria-label={`Số lượng ${productName}`}
          aria-describedby={errorMessage ? errorId : undefined}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => commitValue(inputValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitValue(inputValue);
            }
          }}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            width: "56px",
            textAlign: "center",
            fontSize: "16px",
            border: "1px solid #D1D5DB",
            padding: "4px",
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          aria-label={`Tăng số lượng ${productName}`}
          onClick={handleIncrease}
          disabled={disabled || value >= max}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: disabled || value >= max ? "not-allowed" : "pointer",
            border: "1px solid #D1D5DB",
            borderLeft: "none",
            borderTopRightRadius: "6px",
            borderBottomRightRadius: "6px",
            backgroundColor: "#F9FAFB",
            color: "#374151",
          }}
        >
          +
        </button>
      </div>

      {errorMessage && (
        <span
          id={errorId}
          role="alert"
          style={{
            color: "#DC2626",
            fontSize: "12px",
            marginTop: "4px",
          }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
