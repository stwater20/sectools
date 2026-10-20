"use client";

import { useState } from "react";

export function CopyButton({ value, label = "複製結果" }: { value: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }
  return <button className="secondary-button" type="button" onClick={copy} disabled={!value} aria-live="polite">{status === "copied" ? "已複製 ✓" : status === "failed" ? "無法複製，請手動選取" : label}</button>;
}

export function ErrorNotice({ message }: { message: string }) {
  return message ? <p className="error-notice" role="alert">{message}</p> : null;
}

export function TextArea({ label, value, onChange, placeholder, rows = 8 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} spellCheck={false} />
    </label>
  );
}

export function FileDropField({ onFile, accept }: { onFile: (file: File) => void; accept?: string }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      className={`file-drop ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) onFile(file); }}
    >
      <input type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} />
      <span className="file-drop__icon">＋</span>
      <strong>{dragging ? "放開以讀取檔案" : "選擇或拖放本機檔案"}</strong>
      <small>只在瀏覽器讀取，不會上傳 · 上限 10 MB</small>
    </label>
  );
}
