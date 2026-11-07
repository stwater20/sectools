"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { detectFile, detectInput, noPrefill, type Suggestion } from "@/lib/detect";
import { setHandoff } from "@/lib/handoff";
import { localePath, type Locale } from "@/lib/i18n";
import { markRecent } from "@/lib/local-prefs";
import type { ToolSummary } from "@/lib/search";

const maxFileSize = 10_000_000;

const strings = {
  zh: {
    label: "貼上任何東西，自動判斷該用哪個工具",
    placeholder: "貼上 JWT、雜湊、Base64、IP、網址、郵件標頭、密文⋯⋯\n或把圖片、ZIP、音檔、PCAP 拖進來",
    examples: "試試看：",
    file: "選擇檔案",
    best: "最適合",
    open: "開啟",
    empty: "內容只在這個分頁裡判斷，不會送出。",
    tooBig: "檔案超過 10 MB 上限。",
    fileLabel: "檔案：{0}",
    clear: "清除",
  },
  en: {
    label: "Paste anything — we'll pick the right tool",
    placeholder: "Paste a JWT, hash, Base64, IP, URL, email headers, ciphertext…\nor drop an image, ZIP, audio file or PCAP",
    examples: "Try:",
    file: "Choose a file",
    best: "Best match",
    open: "Open",
    empty: "Detection happens in this tab only; nothing is sent.",
    tooBig: "The file exceeds the 10 MB limit.",
    fileLabel: "File: {0}",
    clear: "Clear",
  },
};

const examples: Array<{ label: string; value: string }> = [
  { label: "JWT", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzAwMDAwMDAwfQ.qZb0vpvFHgjmQSQcTOWH4u9TefSIIlnBIBzjajBBx0Q" },
  { label: "MD5", value: "5d41402abc4b2a76b9719d911017c592" },
  { label: "Base64", value: "ZmxhZ3tiYXNlNjRfaXNfbm90X2VuY3J5cHRpb259" },
  { label: "URL", value: "https://account.example@evil.test/login" },
  { label: "CIDR", value: "192.168.10.0/24" },
  { label: "ROT13", value: "synt{ebg13_vf_abg_rapelcgvba}" },
];

export function SmartPaste({ tools, locale }: { tools: ToolSummary[]; locale: Locale }) {
  const text = strings[locale];
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [file, setFile] = useState<{ file: File; suggestions: Suggestion[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const suggestions = useMemo(() => (file ? file.suggestions : detectInput(value.slice(0, 200_000), 4)), [file, value]);
  const toolOf = (slug: string) => tools.find((tool) => tool.slug === slug);

  async function loadFile(selected: File) {
    if (selected.size > maxFileSize) { setError(text.tooBig); return; }
    const head = new Uint8Array(await selected.slice(0, 64).arrayBuffer());
    setFile({ file: selected, suggestions: detectFile(head, selected.name, 4) });
    setValue("");
    setError("");
  }

  function open(suggestion: Suggestion) {
    if (file) setHandoff({ slug: suggestion.slug, file: file.file });
    else if (!noPrefill.has(suggestion.slug)) setHandoff({ slug: suggestion.slug, text: value.trim(), action: suggestion.action });
    markRecent(suggestion.slug);
    router.push(localePath(locale, `/${suggestion.slug}/`));
  }

  return (
    <div
      className={`smart-paste ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); const dropped = event.dataTransfer.files?.[0]; if (dropped) loadFile(dropped); }}
    >
      <label className="smart-paste__label" htmlFor="smart-paste-input">{text.label}</label>
      {file ? (
        <div className="smart-paste__file">
          <span>{text.fileLabel.replace("{0}", file.file.name)} · {file.file.size.toLocaleString()} bytes</span>
          <button type="button" onClick={() => setFile(null)}>{text.clear}</button>
        </div>
      ) : (
        <textarea
          id="smart-paste-input"
          rows={3}
          value={value}
          placeholder={text.placeholder}
          spellCheck={false}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && suggestions[0]) { event.preventDefault(); open(suggestions[0]); } }}
        />
      )}
      <div className="smart-paste__bar">
        {!value && !file ? (
          <span className="smart-paste__examples">
            {text.examples}
            {examples.map((example) => <button key={example.label} type="button" onClick={() => setValue(example.value)}>{example.label}</button>)}
          </span>
        ) : <span className="smart-paste__note">{text.empty}</span>}
        <button type="button" className="smart-paste__file-button" onClick={() => fileInput.current?.click()}>{text.file}</button>
        <input ref={fileInput} type="file" hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) loadFile(selected); event.target.value = ""; }} />
      </div>
      {error && <p className="smart-paste__error" role="alert">{error}</p>}
      {suggestions.length > 0 && (
        <ol className="smart-paste__results" aria-live="polite">
          {suggestions.map((suggestion, index) => {
            const tool = toolOf(suggestion.slug);
            if (!tool) return null;
            return (
              <li key={suggestion.slug}>
                <button type="button" className={index === 0 ? "is-best" : ""} onClick={() => open(suggestion)}>
                  <span className="smart-paste__icon" aria-hidden="true">{tool.icon}</span>
                  <span className="smart-paste__text"><strong>{tool.name}</strong><small>{suggestion.reason[locale]}</small></span>
                  {index === 0 ? <em>{text.best} →</em> : <b aria-hidden="true">→</b>}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
