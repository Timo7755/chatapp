import { useState, useRef } from "react";
import { api } from "../lib/api";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url;
      onSend(`[image]:${url}`);
    } catch {
      console.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />
      <button
        className="retro-btn-secondary"
        style={{
          padding: "10px 12px",
          fontSize: "14px",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Send image"
      >
        {uploading ? "..." : "⌖"}
      </button>
      <input
        className="retro-input"
        placeholder="&gt; type message..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || uploading}
        style={{ flex: 1 }}
      />
      <button
        className="retro-btn"
        onClick={handleSend}
        disabled={disabled || uploading || !value.trim()}
        style={{ width: "auto", padding: "10px 20px", letterSpacing: "2px" }}
      >
        [ send ]
      </button>
    </div>
  );
}
