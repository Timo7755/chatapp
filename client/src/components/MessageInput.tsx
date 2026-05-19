import { useState } from "react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div
      style={{
        padding: "16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px",
      }}
    >
      <input
        className="retro-input"
        placeholder="&gt; type message..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{ flex: 1 }}
      />
      <button
        className="retro-btn"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{ width: "auto", padding: "10px 20px", letterSpacing: "2px" }}
      >
        [ send ]
      </button>
    </div>
  );
}
