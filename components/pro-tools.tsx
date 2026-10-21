"use client";

import { useT } from "@/components/locale";
import { useState } from "react";
import { CopyButton, ErrorNotice, FileDropField, TextArea } from "@/components/tool-ui";
import { downloadBytes, errorMessage, maxFileSize, SampleButton } from "@/components/ctf-tools";
import { blockCipherTransform, cyclicFind, cyclicPattern, formatBytes, parseBytes, rc4, type ByteFormat, type CipherMode } from "@/lib/crypto-utils";
import {
  buildStoredZip,
  clearEncryptionFlags,
  commonPasswords,
  compressBytes,
  crackZipPassword,
  decompressBytes,
  detectCompression,
  extractZipEntry,
  parseZip,
  type CompressionFormat,
  type ZipArchive,
} from "@/lib/archive-utils";

const byteFormats: Array<{ id: ByteFormat; label: string }> = [
  { id: "text", label: "文字（UTF-8）" },
  { id: "hex", label: "Hex" },
  { id: "base64", label: "Base64" },
];

function FormatSelect({ label, value, onChange }: { label: string; value: ByteFormat; onChange: (value: ByteFormat) => void }) { const t = useT();
  return (
    <label className="field"><span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ByteFormat)}>{byteFormats.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select>
    </label>
  );
}

/* ---------- Symmetric ciphers ---------- */

type SymmetricAlgorithm = "aes" | "des" | "3des" | "rc4";
const symmetricAlgorithms: Array<{ id: SymmetricAlgorithm; label: string }> = [
  { id: "aes", label: "AES" },
  { id: "des", label: "DES" },
  { id: "3des", label: "3DES" },
  { id: "rc4", label: "RC4" },
];

export function SymmetricCipherTool() { const t = useT();
  const [algorithm, setAlgorithm] = useState<SymmetricAlgorithm>("aes");
  const [mode, setMode] = useState<CipherMode>("cbc");
  const [key, setKey] = useState("");
  const [keyFormat, setKeyFormat] = useState<ByteFormat>("text");
  const [iv, setIv] = useState("");
  const [ivFormat, setIvFormat] = useState<ByteFormat>("hex");
  const [padding, setPadding] = useState(true);
  const [input, setInput] = useState("");
  const [inputFormat, setInputFormat] = useState<ByteFormat>("text");
  const [outputFormat, setOutputFormat] = useState<ByteFormat>("base64");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const usesIv = algorithm !== "rc4" && mode !== "ecb";
  const usesPadding = algorithm !== "rc4" && mode !== "ctr";
  function run(decrypt: boolean) {
    try {
      const data = parseBytes(input, inputFormat);
      const keyBytes = parseBytes(key, keyFormat);
      const result = algorithm === "rc4"
        ? rc4(data, keyBytes)
        : blockCipherTransform(data, { algorithm, mode, key: keyBytes, iv: usesIv ? parseBytes(iv, ivFormat) : undefined, padding: usesPadding && padding }, decrypt);
      setOutput(formatBytes(result, outputFormat));
      setError("");
    } catch (cause) { setOutput(""); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  function sample() {
    setAlgorithm("aes"); setMode("cbc"); setKey("YELLOW SUBMARINE"); setKeyFormat("text");
    setIv("000102030405060708090a0b0c0d0e0f"); setIvFormat("hex"); setPadding(true);
    setInput("UszyYayUz30UtM6z3Dx5BSufk6wI8lOz+BwkI7IHzxc="); setInputFormat("base64"); setOutputFormat("text"); setOutput("");
  }
  return (
    <div className="single-workbench">
      <div className="segmented" role="group" aria-label={t("演算法")}>
        {symmetricAlgorithms.map((item) => (
          <button key={item.id} type="button" className={algorithm === item.id ? "is-active" : ""} aria-pressed={algorithm === item.id} onClick={() => { setAlgorithm(item.id); setOutput(""); setError(""); }}>{item.label}</button>
        ))}
      </div>
      <div className="cipher-options">
        {algorithm !== "rc4" && (
          <label className="field"><span>{t("模式")}</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as CipherMode)}><option value="ecb">ECB</option><option value="cbc">CBC</option><option value="ctr">CTR</option></select>
          </label>
        )}
        <label className="field cipher-options__wide"><span>Key</span><input value={key} onChange={(event) => setKey(event.target.value)} placeholder={algorithm === "aes" ? t("16／24／32 bytes") : algorithm === "des" ? t("8 bytes") : algorithm === "3des" ? t("16 或 24 bytes") : t("任意長度")} spellCheck={false} /></label>
        <FormatSelect label={t("Key 格式")} value={keyFormat} onChange={setKeyFormat} />
        {usesIv && <>
          <label className="field cipher-options__wide"><span>{mode === "ctr" ? t("Nonce／初始計數器") : "IV"}</span><input value={iv} onChange={(event) => setIv(event.target.value)} placeholder={algorithm === "aes" ? t("16 bytes") : t("8 bytes")} spellCheck={false} /></label>
          <FormatSelect label={t("IV 格式")} value={ivFormat} onChange={setIvFormat} />
        </>}
      </div>
      {usesPadding && <div className="checkbox-grid"><label><input type="checkbox" checked={padding} onChange={(event) => setPadding(event.target.checked)} />{t("PKCS#7 padding")}</label></div>}
      <div className="workbench-grid">
        <div>
          <TextArea label={t("輸入資料")} value={input} onChange={setInput} rows={7} placeholder={t("加密貼明文，解密貼密文…")} />
          <FormatSelect label={t("輸入格式")} value={inputFormat} onChange={setInputFormat} />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => run(true)}>{t("解密")}</button>
            <button className="ghost-button" type="button" onClick={() => run(false)}>{t("加密")}</button>
            <SampleButton onClick={sample} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label={t("結果")} value={output} onChange={setOutput} rows={7} placeholder={t("結果會顯示在這裡")} />
          <FormatSelect label={t("輸出格式")} value={outputFormat} onChange={setOutputFormat} />
          <CopyButton value={output} />
        </div>
      </div>
      <p className="tool-hint">{t("全部以 JavaScript 在本機計算，支援 Web Crypto 沒有的 ECB、DES、3DES 與 RC4。CTR 使用 big-endian 計數器，與 PyCryptodome 的 counter 設定相同。ECB 與 DES 已不安全，請只用於 CTF 與相容性測試。")}</p>
    </div>
  );
}

/* ---------- Cyclic pattern ---------- */

export function CyclicPatternTool() { const t = useT();
  const [size, setSize] = useState(4);
  const [length, setLength] = useState(200);
  const [pattern, setPattern] = useState("");
  const [query, setQuery] = useState("");
  const [littleEndian, setLittleEndian] = useState(true);
  const [found, setFound] = useState<{ offset: number; needle: string } | null>(null);
  const [error, setError] = useState("");
  function generate() {
    try { setPattern(cyclicPattern(length, size)); setError(""); } catch (cause) { setPattern(""); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  function find(value = query) {
    try { setFound(cyclicFind(value, size, littleEndian)); setError(""); } catch (cause) { setFound(null); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  return (
    <div className="single-workbench">
      <div className="segmented" role="group" aria-label={t("架構")}>
        {[[4, t("32 位元（n = 4）")], [8, t("64 位元（n = 8）")]].map(([value, label]) => (
          <button key={value} type="button" className={size === value ? "is-active" : ""} aria-pressed={size === value} onClick={() => { setSize(Number(value)); setPattern(""); setFound(null); }}>{label}</button>
        ))}
      </div>
      <div className="workbench-grid">
        <div>
          <label className="field field--short"><span>{t("Pattern 長度")}</span><input type="number" min="1" max="100000" value={length} onChange={(event) => setLength(Number(event.target.value))} /></label>
          <div className="button-row"><button className="primary-button" type="button" onClick={generate}>{t("產生 Pattern")}</button><CopyButton value={pattern} /></div>
          <TextArea label={t("Cyclic pattern")} value={pattern} onChange={setPattern} rows={6} placeholder="aaaabaaacaaadaaaeaaa…" />
        </div>
        <div>
          <label className="field"><span>{t("崩潰時的 EIP／RIP 或記憶體內容")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="0x6161616c / laaa" spellCheck={false} /></label>
          <div className="checkbox-grid"><label><input type="checkbox" checked={littleEndian} onChange={(event) => setLittleEndian(event.target.checked)} />{t("0x 數值以 Little Endian 解讀（x86／x64）")}</label></div>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => find()}>{t("計算 Offset")}</button>
            <SampleButton onClick={() => { setSize(4); setQuery("0x6161616c"); find("0x6161616c"); }} />
          </div>
          {found && (found.offset >= 0
            ? <div className="file-verdict"><span>{t("OFFSET")} · {JSON.stringify(found.needle)}</span><strong>{found.offset}</strong></div>
            : <div className="file-verdict is-mismatch"><span>{JSON.stringify(found.needle)}</span><strong>{t("不在 cyclic pattern 中")}</strong><p>{t("確認 n 與 Endian 設定是否正確，或值是否被其他資料覆蓋。")}</p></div>)}
        </div>
      </div>
      <ErrorNotice message={error} />
      <p className="tool-hint">{t("與 pwntools 的 cyclic() 和 cyclic_find() 輸出相同。把 Pattern 送進程式讓它崩潰，再把 gdb 顯示的 EIP／RIP 或 RSP 指向的值貼到右側，就能得到覆寫返回位址需要的 padding 長度。")}</p>
    </div>
  );
}

/* ---------- Compression ---------- */

const compressionFormats: Array<{ id: CompressionFormat | "auto"; label: string }> = [
  { id: "auto", label: "自動偵測（解壓縮）" },
  { id: "gzip", label: "gzip（.gz）" },
  { id: "deflate", label: "zlib（Python zlib.compress）" },
  { id: "deflate-raw", label: "Raw Deflate（無標頭）" },
];

export function CompressionTool() { const t = useT();
  const [format, setFormat] = useState<CompressionFormat | "auto">("auto");
  const [input, setInput] = useState("");
  const [inputFormat, setInputFormat] = useState<ByteFormat>("base64");
  const [outputFormat, setOutputFormat] = useState<ByteFormat>("text");
  const [output, setOutput] = useState<{ bytes: Uint8Array; format: CompressionFormat; inputSize: number } | null>(null);
  const [error, setError] = useState("");
  async function run(decompress: boolean, value = input, valueFormat = inputFormat) {
    try {
      const data = parseBytes(value, valueFormat);
      const selected = format === "auto" ? (decompress ? detectCompression(data) : "gzip") : format;
      const bytes = decompress ? await decompressBytes(data, selected) : await compressBytes(data, selected);
      setOutput({ bytes, format: selected, inputSize: data.length });
      if (!decompress && outputFormat === "text") setOutputFormat("base64");
      setError("");
    } catch (cause) { setOutput(null); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  async function loadFile(file: File) {
    if (file.size > maxFileSize) { setError(t("檔案超過 10 MB 上限。 ")); return; }
    const value = formatBytes(new Uint8Array(await file.arrayBuffer()), "base64");
    setInput(value); setInputFormat("base64");
    await run(true, value, "base64");
  }
  const text = output ? formatBytes(output.bytes, outputFormat) : "";
  return (
    <div className="single-workbench">
      <FileDropField onFile={loadFile} />
      <div className="workbench-grid">
        <div>
          <label className="field"><span>{t("壓縮格式")}</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as CompressionFormat | "auto")}>{compressionFormats.map((item) => <option key={item.id} value={item.id}>{t(item.label)}</option>)}</select>
          </label>
          <TextArea label={t("輸入資料")} value={input} onChange={setInput} rows={7} placeholder={t("貼上 Base64／Hex 壓縮資料，或要壓縮的文字…")} />
          <FormatSelect label={t("輸入格式")} value={inputFormat} onChange={setInputFormat} />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => run(true)}>{t("解壓縮")}</button>
            <button className="ghost-button" type="button" onClick={() => run(false)}>{t("壓縮")}</button>
            <SampleButton onClick={() => { const value = "eJxLy0lMr67KyUyKz8xLy0ksSU2pVXjUMEUhOT+3oCi1uDg1RaE8syRDIaCyJCM/TwGkUg8mp6EJACAwGI8="; setFormat("auto"); setInput(value); setInputFormat("base64"); setOutputFormat("text"); setOutput(null); }} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label={t("結果")} value={text} onChange={() => undefined} rows={7} placeholder={t("結果會顯示在這裡")} />
          <FormatSelect label={t("輸出格式")} value={outputFormat} onChange={setOutputFormat} />
          {output && <p className="tool-hint">{output.format} · {output.inputSize.toLocaleString()} → {output.bytes.length.toLocaleString()} bytes</p>}
          <div className="button-row">
            <CopyButton value={text} />
            {output && <button className="ghost-button" type="button" onClick={() => downloadBytes(output.bytes, "output.bin")}>{t("下載 bytes")}</button>}
          </div>
        </div>
      </div>
      <p className="tool-hint">{t("使用瀏覽器內建的 Compression Streams API。zlib 開頭通常是 78 9c／78 da（Base64 為 eJ…），gzip 開頭是 1f 8b（Base64 為 H4sI…）。解壓縮上限 50 MB，避免壓縮炸彈。")}</p>
    </div>
  );
}

/* ---------- ZIP inspector ---------- */

type EntryStatus = { kind: "plain" | "pseudo" | "encrypted" | "unsupported"; text?: string };

function sampleZip() {
  const encoder = new TextEncoder();
  return buildStoredZip([
    { name: "readme.txt", data: encoder.encode("Nothing to see here. Try the other file.\n") },
    { name: "flag.txt", data: encoder.encode("flag{pseudo_encryption_is_not_encryption}\n"), encryptedFlag: true },
  ], "Hint: is it really encrypted?");
}

export function ZipInspectorTool() { const t = useT();
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; archive: ZipArchive } | null>(null);
  const [statuses, setStatuses] = useState<EntryStatus[]>([]);
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null);
  const [password, setPassword] = useState("");
  const [wordlist, setWordlist] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  async function load(name: string, bytes: Uint8Array) {
    try {
      const archive = parseZip(bytes);
      setFile({ name, bytes, archive }); setPreview(null); setProgress(""); setError("");
      const next: EntryStatus[] = [];
      for (const entry of archive.entries) {
        if (entry.isDirectory) { next.push({ kind: "plain" }); continue; }
        try {
          const result = await extractZipEntry(bytes, entry);
          next.push({ kind: result.note === "pseudo" ? "pseudo" : "plain" });
        } catch (cause) {
          next.push({ kind: entry.encrypted ? "encrypted" : "unsupported", text: errorMessage(cause, "") });
        }
      }
      setStatuses(next);
    } catch (cause) { setFile(null); setStatuses([]); setError(errorMessage(cause, t("檔案讀取失敗。 "))); }
  }
  async function loadFile(selected: File) {
    if (selected.size > maxFileSize) { setError(t("檔案超過 10 MB 上限。 ")); return; }
    await load(selected.name, new Uint8Array(await selected.arrayBuffer()));
  }
  async function open(index: number, download: boolean, secret = password) {
    if (!file) return;
    const entry = file.archive.entries[index];
    try {
      const result = await extractZipEntry(file.bytes, entry, secret);
      if (download) downloadBytes(result.data, entry.name.split("/").pop() || "entry.bin");
      else setPreview({ name: entry.name, text: new TextDecoder("utf-8", { fatal: false }).decode(result.data.slice(0, 4000)) });
      setError("");
    } catch (cause) { setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  async function crack() {
    if (!file) return;
    const index = statuses.findIndex((status) => status.kind === "encrypted");
    if (index < 0) { setError(t("沒有需要密碼的加密檔案。 ")); return; }
    try {
      const custom = wordlist.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      setProgress(t("嘗試中…"));
      const result = await crackZipPassword(file.bytes, file.archive.entries[index], [...custom, ...commonPasswords], (tried) => setProgress(t("已嘗試 {0} 組…", tried.toLocaleString())));
      if (result.password === null) { setProgress(t("字典中沒有正確密碼（已嘗試 {0} 組）。", result.tried.toLocaleString())); return; }
      setPassword(result.password);
      setProgress(t("找到密碼：{0}（嘗試 {1} 組）", result.password, result.tried.toLocaleString()));
      setPreview({ name: file.archive.entries[index].name, text: new TextDecoder("utf-8", { fatal: false }).decode(result.data!.slice(0, 4000)) });
      setError("");
    } catch (cause) { setProgress(""); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  const hasPseudo = statuses.some((status) => status.kind === "pseudo");
  const hasEncrypted = statuses.some((status) => status.kind === "encrypted");
  const statusLabel: Record<EntryStatus["kind"], string> = { plain: t("正常"), pseudo: t("偽加密"), encrypted: t("已加密"), unsupported: t("無法解壓") };
  return (
    <div className="single-workbench">
      <FileDropField onFile={loadFile} accept=".zip,application/zip,application/octet-stream" />
      <div className="button-row"><SampleButton onClick={() => load("pseudo-encrypted.zip", sampleZip())} /></div>
      <ErrorNotice message={error} />
      {file && (
        <div className="hidden-report">
          <div className="file-verdict"><span>{file.name} · {file.bytes.length.toLocaleString()} bytes</span><strong>{file.archive.entries.length} {t("個項目")}</strong></div>
          {(file.archive.comment || file.archive.prefixBytes > 0 || file.archive.trailingBytes > 0 || !file.archive.fromCentralDirectory || hasPseudo) && (
            <div className="check-list">
              {file.archive.comment && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("ZIP 註解")}</strong><p>{file.archive.comment}</p></div></div>}
              {file.archive.prefixBytes > 0 && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("ZIP 前方有 {0} bytes 其他資料", file.archive.prefixBytes)}</strong><p>{t("壓縮檔可能被接在圖片或其他檔案後面。")}</p></div></div>}
              {file.archive.trailingBytes > 0 && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("ZIP 結尾後有 {0} bytes 額外資料", file.archive.trailingBytes)}</strong><p>{t("可用 Hex Viewer 或隱藏資料掃描器檢查。")}</p></div></div>}
              {!file.archive.fromCentralDirectory && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("缺少 Central Directory")}</strong><p>{t("已改用 Local File Header 逐一掃描，檔案可能被截斷或刻意破壞。")}</p></div></div>}
              {hasPseudo && <div className="check-item check-item--fail"><i>!</i><div><strong>{t("偵測到 ZIP 偽加密")}</strong><p>{t("加密旗標被設定，但資料實際上沒有加密，可以直接解壓。下載修復版即可用一般解壓工具開啟。")}</p></div></div>}
            </div>
          )}
          <div className="zip-table">
            <div><span>{t("檔名")}</span><span>{t("方法")}</span><span>{t("大小")}</span><span>CRC32</span><span>{t("狀態")}</span><span /></div>
            {file.archive.entries.map((entry, index) => (
              <div key={`${entry.localOffset}-${entry.name}`}>
                <strong>{entry.name}</strong>
                <code>{entry.methodLabel}</code>
                <code>{entry.size.toLocaleString()} / {entry.compressedSize.toLocaleString()}</code>
                <code>{entry.crc.toString(16).padStart(8, "0")}</code>
                <span className={`zip-status zip-status--${statuses[index]?.kind ?? "plain"}`}>{statusLabel[statuses[index]?.kind ?? "plain"]}</span>
                {entry.isDirectory ? <span /> : (
                  <span className="zip-actions">
                    <button className="ghost-button" type="button" onClick={() => open(index, false)}>{t("預覽")}</button>
                    <button className="ghost-button" type="button" onClick={() => open(index, true)}>{t("下載")}</button>
                  </span>
                )}
              </div>
            ))}
          </div>
          {hasPseudo && <div className="button-row"><button className="primary-button" type="button" onClick={() => downloadBytes(clearEncryptionFlags(file.bytes, file.archive), file.name.replace(/\.zip$/i, "") + "-fixed.zip")}>{t("下載修復後的 ZIP")}</button></div>}
          {hasEncrypted && (
            <div className="workbench-grid">
              <div>
                <label className="field"><span>{t("ZIP 密碼")}</span><input value={password} onChange={(event) => setPassword(event.target.value)} spellCheck={false} /></label>
                <div className="button-row">
                  <button className="primary-button" type="button" onClick={crack}>{t("字典攻擊")}</button>
                </div>
                {progress && <p className="tool-hint" aria-live="polite">{progress}</p>}
              </div>
              <TextArea label={t("自訂字典（每行一個，會先於內建清單嘗試）")} value={wordlist} onChange={setWordlist} rows={4} placeholder={"secret2026\nP@ssw0rd!"} />
            </div>
          )}
          {preview && <div className="result-block"><span>{t("預覽")} · {preview.name}</span><code>{preview.text}</code><CopyButton value={preview.text} /></div>}
        </div>
      )}
      <p className="tool-hint">{t("列出 ZIP 內容、註解與 CRC，自動辨識偽加密並可修復；ZipCrypto 加密檔可用內建常見密碼或自訂字典嘗試。WinZip AES 加密目前不支援。")}</p>
    </div>
  );
}
