"use client";

import { useMemo, useState } from "react";
import {
  analyzeEmailHeaders,
  analyzeIpAddress,
  analyzePathTraversal,
  analyzeSecurityHeaders,
  analyzeUrlRisk,
  asciiToNumbers,
  aggregateIpv4Cidrs,
  assertSafeInput,
  base64ToUtf8,
  bytesToBase64,
  bytesToHex,
  calculateCidr,
  calculateIpv6Cidr,
  calculateCvss,
  calculateEntropy,
  calculateChmod,
  bruteForceSingleByteXor,
  caesarBruteforce,
  convertNumberBase,
  decodeJwtPart,
  decodeDnsMessage,
  decodeEscapedText,
  decodeLayered,
  decodeTimestamp,
  defang,
  estimatePassword,
  encodeEscapedText,
  extractIocs,
  extractPrintableStrings,
  formatHexView,
  identifyHash,
  identifyFileSignature,
  refang,
  numbersToAscii,
  packInteger,
  parseHttpMessage,
  unpackInteger,
  xorTransform,
  gcdBigInt,
  generateHotp,
  generateTotp,
  modInverse,
  powMod,
  scanSecrets,
  utf8ToBase64,
  type CvssMetrics,
  type DnsRecord,
  type EscapeFormat,
  type OtpAlgorithm,
  type TimestampFormat,
} from "@/lib/tool-utils";

function CopyButton({ value, label = "複製結果" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <button className="secondary-button" type="button" onClick={copy} disabled={!value}>{copied ? "已複製 ✓" : label}</button>;
}

function ErrorNotice({ message }: { message: string }) {
  return message ? <p className="error-notice" role="alert">{message}</p> : null;
}

function TextArea({ label, value, onChange, placeholder, rows = 8 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} spellCheck={false} />
    </label>
  );
}

function HttpParameterList({ title, values }: { title: string; values: Array<{ name: string; value: string }> }) {
  if (!values.length) return null;
  return <section><div><strong>{title}</strong><span>{values.length}</span></div><ul>{values.map((item, index) => <li key={`${item.name}-${index}`}><code>{item.name}</code><span>=</span><code>{item.value}</code></li>)}</ul></section>;
}

function DnsRecordList({ title, records }: { title: string; records: DnsRecord[] }) {
  if (!records.length) return null;
  return <section className="dns-record-section"><div><strong>{title}</strong><span>{records.length} RECORDS</span></div><ol>{records.map((record, index) => <li key={`${record.name}-${record.type}-${index}`}><code>{record.name}</code><strong>{record.type}</strong><span>{record.className} · TTL {record.ttl}</span><code>{record.data || "(empty)"}</code></li>)}</ol></section>;
}

function CodecTool({ mode }: { mode: "base64" | "url" }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  function run(direction: "encode" | "decode") {
    try {
      setError("");
      assertSafeInput(input);
      const result = mode === "base64"
        ? direction === "encode" ? utf8ToBase64(input) : base64ToUtf8(input)
        : direction === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
      setOutput(result);
    } catch (cause) {
      setOutput("");
      setError(cause instanceof Error ? cause.message : "無法處理輸入內容。 ");
    }
  }
  return (
    <div className="workbench-grid">
      <div>
        <TextArea label="輸入" value={input} onChange={setInput} placeholder={mode === "base64" ? "貼上要編碼或解碼的 UTF-8 文字…" : "貼上 URL 或查詢字串…"} />
        <div className="button-row"><button className="primary-button" type="button" onClick={() => run("encode")}>編碼</button><button className="ghost-button" type="button" onClick={() => run("decode")}>解碼</button></div>
        <ErrorNotice message={error} />
      </div>
      <div>
        <TextArea label="結果" value={output} onChange={setOutput} placeholder="結果會顯示在這裡" />
        <CopyButton value={output} />
      </div>
    </div>
  );
}

function HashTool({ sri = false }: { sri?: boolean }) {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  async function run() {
    try {
      assertSafeInput(input);
      const selected = sri ? "SHA-384" : algorithm;
      const digest = await crypto.subtle.digest(selected, new TextEncoder().encode(input));
      setOutput(sri ? `sha384-${bytesToBase64(digest)}` : bytesToHex(digest));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "計算失敗。 "); }
  }
  return (
    <div className="single-workbench">
      <TextArea label={sri ? "資源內容" : "輸入文字"} value={input} onChange={setInput} placeholder={sri ? "貼上 JavaScript 或 CSS 資源內容…" : "輸入要計算雜湊的文字…"} rows={10} />
      {!sri && <label className="field field--short"><span>演算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option><option>SHA-1</option></select><small>SHA-1 僅供相容性比對，不適合安全用途。</small></label>}
      <div className="button-row"><button className="primary-button" type="button" onClick={run}>計算{ sri ? " SRI" : "雜湊"}</button><CopyButton value={output} /></div>
      <ErrorNotice message={error} />
      {output && <div className="result-block"><span>{sri ? "integrity 屬性值" : algorithm}</span><code>{output}</code></div>}
    </div>
  );
}

function HmacTool() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  async function run() {
    try {
      assertSafeInput(message); assertSafeInput(secret);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
      setOutput(bytesToHex(signature)); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "HMAC 計算失敗。 "); }
  }
  return <div className="single-workbench"><TextArea label="訊息" value={message} onChange={setMessage} placeholder="要簽署的訊息…" /><label className="field"><span>Secret key</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" placeholder="金鑰只在本機記憶體中使用" /></label><label className="field field--short"><span>演算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></label><div className="button-row"><button className="primary-button" type="button" onClick={run}>產生 HMAC</button><CopyButton value={output} /></div><ErrorNotice message={error} />{output && <div className="result-block"><span>Hex signature</span><code>{output}</code></div>}</div>;
}

function JwtTool() {
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<{ header: unknown; payload: Record<string, unknown>; expired: boolean } | null>(null);
  const [error, setError] = useState("");
  function run() {
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) throw new Error("JWT 必須包含三個以句點分隔的區段。 ");
      const header = decodeJwtPart(parts[0]);
      const payload = decodeJwtPart(parts[1]) as Record<string, unknown>;
      const expired = typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
      setDecoded({ header, payload, expired }); setError("");
    } catch (cause) { setDecoded(null); setError(cause instanceof Error ? cause.message : "JWT 格式錯誤。 "); }
  }
  const expiry = decoded && typeof decoded.payload.exp === "number" ? new Date(decoded.payload.exp * 1000) : null;
  return <div className="single-workbench"><div className="warning-banner"><strong>只解碼，不驗證簽章</strong><span>不要因為內容可讀就信任這個 Token；正式驗證必須檢查演算法、簽章、issuer 與 audience。</span></div><TextArea label="JWT Token" value={token} onChange={setToken} placeholder="eyJhbGciOi…" rows={6} /><button className="primary-button" type="button" onClick={run}>安全解碼</button><ErrorNotice message={error} />{decoded && <div className="jwt-results"><div><span>HEADER</span><pre>{JSON.stringify(decoded.header, null, 2)}</pre></div><div><span>PAYLOAD</span><pre>{JSON.stringify(decoded.payload, null, 2)}</pre></div>{expiry && <p className={`expiry ${decoded.expired ? "is-expired" : ""}`}>{decoded.expired ? "已過期" : "到期時間"}：{expiry.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p>}</div>}</div>;
}

function PasswordGenerator() {
  const [length, setLength] = useState(24);
  const [sets, setSets] = useState({ lower: true, upper: true, number: true, symbol: true });
  const [password, setPassword] = useState("");
  const generate = () => {
    const pools = [sets.lower && "abcdefghijkmnopqrstuvwxyz", sets.upper && "ABCDEFGHJKLMNPQRSTUVWXYZ", sets.number && "23456789", sets.symbol && "!@#$%^&*()-_=+[]{}"].filter(Boolean) as string[];
    if (!pools.length) return;
    const pool = pools.join("");
    const randomChar = (source: string) => {
      const limit = 256 - (256 % source.length);
      const bytes = new Uint8Array(1);
      do crypto.getRandomValues(bytes); while (bytes[0] >= limit);
      return source[bytes[0] % source.length];
    };
    const required = pools.map(randomChar);
    const chars = [...required, ...Array.from({ length: length - required.length }, () => randomChar(pool))];
    for (let index = chars.length - 1; index > 0; index -= 1) {
      const random = new Uint32Array(1); crypto.getRandomValues(random);
      const target = random[0] % (index + 1); [chars[index], chars[target]] = [chars[target], chars[index]];
    }
    setPassword(chars.join(""));
  };
  return <div className="single-workbench"><label className="field"><span>長度：{length}</span><input type="range" min="12" max="64" value={length} onChange={(event) => setLength(Number(event.target.value))} /></label><div className="checkbox-grid">{([['lower','小寫 a-z'],['upper','大寫 A-Z'],['number','數字 2-9'],['symbol','符號 !@#']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={sets[key]} onChange={(event) => setSets({ ...sets, [key]: event.target.checked })} />{label}</label>)}</div><div className="button-row"><button className="primary-button" type="button" onClick={generate}>產生安全密碼</button><CopyButton value={password} /></div>{password && <div className="password-result"><code>{password}</code><span>由 crypto.getRandomValues() 產生</span></div>}</div>;
}

function PasswordStrength() {
  const [password, setPassword] = useState("");
  const result = useMemo(() => estimatePassword(password), [password]);
  const index = ["弱", "普通", "強", "非常強"].indexOf(result.level);
  return <div className="single-workbench"><label className="field"><span>要檢查的密碼</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" placeholder="輸入內容不會被儲存或傳送" /></label>{password && <div className="strength-panel"><div className="strength-heading"><strong>{result.level}</strong><span>估算 {result.entropy.toFixed(1)} bits</span></div><div className="strength-meter">{[0,1,2,3].map((item) => <i key={item} className={item <= index ? "is-filled" : ""} />)}</div>{result.warnings.length ? <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p>目前沒有明顯的組成弱點；仍建議每個服務使用不同密碼。</p>}</div>}</div>;
}

function IocTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ReturnType<typeof extractIocs> | null>(null);
  const labels = { urls: "URL", ips: "IP 位址", domains: "網域", emails: "Email", hashes: "檔案雜湊" };
  const flattened = results ? Object.entries(results).flatMap(([key, values]) => values.map((value) => `${key.toUpperCase()}\t${value}`)).join("\n") : "";
  return <div className="single-workbench"><TextArea label="事件報告、郵件或 Log" value={input} onChange={setInput} placeholder="貼上要分析的純文字內容…" rows={10} /><div className="button-row"><button className="primary-button" type="button" onClick={() => setResults(extractIocs(input))}>擷取 IOC</button><CopyButton value={flattened} label="複製全部" /></div>{results && <div className="ioc-grid">{Object.entries(results).map(([key, values]) => <section key={key}><div><strong>{labels[key as keyof typeof labels]}</strong><span>{values.length}</span></div>{values.length ? <ul>{values.map((value) => <li key={value}><code>{value}</code></li>)}</ul> : <p>未找到</p>}</section>)}</div>}</div>;
}

function DefangTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState("");
  return <div className="workbench-grid"><div><TextArea label="輸入 URL、IP 或 Email" value={input} onChange={setInput} placeholder="https://suspicious.example/path" /><div className="button-row"><button className="primary-button" type="button" onClick={() => setOutput(defang(input))}>Defang</button><button className="ghost-button" type="button" onClick={() => setOutput(refang(input))}>Refang</button></div></div><div><TextArea label="安全結果" value={output} onChange={setOutput} /><CopyButton value={output} /></div></div>;
}

function CidrTool() {
  const [input, setInput] = useState("192.168.10.42/24"); const [result, setResult] = useState<ReturnType<typeof calculateCidr> | null>(null); const [error, setError] = useState("");
  const run = () => { try { setResult(calculateCidr(input)); setError(""); } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "CIDR 格式錯誤。 "); } };
  const labels = { network: "網路位址", broadcast: "廣播位址", subnetMask: "子網路遮罩", firstHost: "第一個主機", lastHost: "最後一個主機", totalAddresses: "總位址數", usableHosts: "可用主機數" };
  return <div className="single-workbench"><label className="field"><span>IPv4 / CIDR</span><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="192.168.10.42/24" /></label><button className="primary-button" type="button" onClick={run}>計算網段</button><ErrorNotice message={error} />{result && <div className="stat-grid">{Object.entries(result).map(([key,value]) => <div key={key}><span>{labels[key as keyof typeof labels]}</span><strong>{value}</strong></div>)}</div>}</div>;
}

const cvssOptions = {
  av: [["N","Network"],["A","Adjacent"],["L","Local"],["P","Physical"]], ac: [["L","Low"],["H","High"]], pr: [["N","None"],["L","Low"],["H","High"]], ui: [["N","None"],["R","Required"]], s: [["U","Unchanged"],["C","Changed"]], c: [["N","None"],["L","Low"],["H","High"]], i: [["N","None"],["L","Low"],["H","High"]], a: [["N","None"],["L","Low"],["H","High"]],
} as const;

function CvssTool() {
  const [metrics, setMetrics] = useState<CvssMetrics>({ av:"N", ac:"L", pr:"N", ui:"N", s:"U", c:"H", i:"H", a:"H" });
  const result = calculateCvss(metrics);
  const labels = { av:"攻擊向量 AV", ac:"攻擊複雜度 AC", pr:"所需權限 PR", ui:"使用者互動 UI", s:"影響範圍 S", c:"機密性 C", i:"完整性 I", a:"可用性 A" };
  return <div className="cvss-layout"><div className="cvss-controls">{(Object.keys(cvssOptions) as Array<keyof typeof cvssOptions>).map((key) => <fieldset key={key}><legend>{labels[key]}</legend><div>{cvssOptions[key].map(([value,label]) => <button type="button" key={value} className={metrics[key] === value ? "is-active" : ""} onClick={() => setMetrics({ ...metrics, [key]: value })}>{label}</button>)}</div></fieldset>)}</div><aside className={`cvss-score cvss-score--${result.severity}`}><span>CVSS v3.1 BASE SCORE</span><strong>{result.score.toFixed(1)}</strong><b>{result.severity}</b><code>{result.vector}</code><CopyButton value={result.vector} label="複製 Vector" /></aside></div>;
}

function EntropyTool() {
  const [input, setInput] = useState(""); const result = useMemo(() => calculateEntropy(input), [input]);
  const assessment = result.bitsPerSymbol > 7 ? "高度隨機／可能已加密或壓縮" : result.bitsPerSymbol > 5 ? "中高熵值" : "一般文字或結構化資料";
  return <div className="single-workbench"><TextArea label="要分析的文字或 Hex dump" value={input} onChange={setInput} placeholder="貼上內容以即時計算 Shannon entropy…" rows={12} />{input && <div className="entropy-result"><div><strong>{result.bitsPerSymbol.toFixed(4)}</strong><span>bits / symbol</span></div><div><strong>{result.totalBits.toFixed(1)}</strong><span>估算總資訊量</span></div><div><strong>{result.uniqueSymbols}</strong><span>不同符號數</span></div><p>{assessment}</p></div>}</div>;
}

function SecurityHeadersTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeSecurityHeaders> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(analyzeSecurityHeaders(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "標頭解析失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>貼上分析，不主動連線</strong><span>請從瀏覽器開發者工具、curl -I 或 Proxy 複製 response headers；本工具不會對目標網站發送請求。</span></div><TextArea label="HTTP Response Headers" value={input} onChange={setInput} placeholder={"HTTP/2 200\ncontent-security-policy: default-src 'self'\nstrict-transport-security: max-age=31536000"} rows={12} /><button className="primary-button" type="button" onClick={run}>分析安全標頭</button><ErrorNotice message={error} />{result && <div className="header-report"><div className="report-score"><strong>{result.score}</strong><span>/ 100</span><small>解析 {result.parsedCount} 個標頭</small></div><div className="check-list">{result.checks.map((check) => <div key={check.name} className={`check-item check-item--${check.status}`}><i>{check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "×"}</i><div><strong>{check.name}</strong><p>{check.detail}</p></div></div>)}</div></div>}</div>;
}

function EmailHeaderTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeEmailHeaders> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(analyzeEmailHeaders(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "郵件標頭解析失敗。 "); }
  }
  const labels = { from: "From", replyTo: "Reply-To", returnPath: "Return-Path", subject: "Subject", date: "Date", messageId: "Message-ID" };
  return <div className="single-workbench"><TextArea label="原始 Email Header" value={input} onChange={setInput} placeholder="貼上郵件的原始標頭（不需要郵件內文）…" rows={14} /><button className="primary-button" type="button" onClick={run}>分析郵件標頭</button><ErrorNotice message={error} />{result && <div className="email-report"><div className="auth-row">{Object.entries(result.authentication).map(([name,status]) => <div key={name} className={`auth-chip auth-chip--${status}`}><span>{name.toUpperCase()}</span><strong>{status}</strong></div>)}</div>{result.warnings.length > 0 && <div className="warning-list"><strong>需要注意</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}<div className="email-summary">{Object.entries(result.summary).map(([key,value]) => <div key={key}><span>{labels[key as keyof typeof labels]}</span><code>{value || "—"}</code></div>)}</div><details className="received-chain"><summary>傳遞節點 Received（{result.received.length}）</summary><ol>{result.received.map((hop,index) => <li key={`${hop}-${index}`}><code>{hop}</code></li>)}</ol></details></div>}</div>;
}

function FileDropField({ onFile, accept }: { onFile: (file: File) => void; accept?: string }) {
  return <label className="file-drop"><input type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} /><span className="file-drop__icon">＋</span><strong>選擇本機檔案</strong><small>只在瀏覽器讀取，不會上傳 · 上限 10 MB</small></label>;
}

function FileSignatureTool() {
  const [result, setResult] = useState<(ReturnType<typeof identifyFileSignature> & { name: string; size: number; browserType: string }) | null>(null);
  const [error, setError] = useState("");
  async function inspect(file: File) {
    try {
      if (file.size > 10_000_000) throw new Error("檔案超過 10 MB 上限。 ");
      const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer());
      setResult({ ...identifyFileSignature(bytes, file.name), name: file.name, size: file.size, browserType: file.type || "未知" }); setError("");
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "檔案讀取失敗。 "); }
  }
  return <div className="single-workbench"><FileDropField onFile={inspect} /><ErrorNotice message={error} />{result && <div className="file-report"><div className={`file-verdict ${result.extensionMatches === false ? "is-mismatch" : ""}`}><span>{result.match ? "辨識結果" : "未知格式"}</span><strong>{result.match?.label ?? "Magic Bytes 不在目前資料庫"}</strong>{result.extensionMatches === false && <p>警告：檔案內容與 .{result.extension} 副檔名不一致。</p>}</div><div className="stat-grid"><div><span>檔名</span><strong>{result.name}</strong></div><div><span>大小</span><strong>{result.size.toLocaleString()} bytes</strong></div><div><span>瀏覽器 MIME</span><strong>{result.browserType}</strong></div><div><span>Magic MIME</span><strong>{result.match?.mime ?? "Unknown"}</strong></div><div><span>常見副檔名</span><strong>{result.match?.extensions.join(", ") ?? "—"}</strong></div></div><div className="result-block"><span>前 32 bytes</span><code>{result.hexPreview}</code></div></div>}</div>;
}

function StringExtractorTool() {
  const [minimum, setMinimum] = useState(5);
  const [filename, setFilename] = useState("");
  const [strings, setStrings] = useState<string[]>([]);
  const [error, setError] = useState("");
  async function inspect(file: File) {
    try {
      if (file.size > 10_000_000) throw new Error("檔案超過 10 MB 上限。 ");
      const result = extractPrintableStrings(new Uint8Array(await file.arrayBuffer()), minimum);
      setFilename(file.name); setStrings(result); setError("");
    } catch (cause) { setFilename(""); setStrings([]); setError(cause instanceof Error ? cause.message : "檔案讀取失敗。 "); }
  }
  return <div className="single-workbench"><label className="field field--short"><span>最短字串長度</span><select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}>{[4,5,6,8,10,12].map((value) => <option key={value} value={value}>{value} characters</option>)}</select></label><FileDropField onFile={inspect} /><ErrorNotice message={error} />{filename && <div className="strings-report"><div className="strings-report__head"><div><strong>{filename}</strong><span>{strings.length} 個字串{strings.length === 2000 ? "（已達顯示上限）" : ""}</span></div><CopyButton value={strings.join("\n")} label="複製全部" /></div>{strings.length ? <ol>{strings.map((value,index) => <li key={`${value}-${index}`}><span>{index + 1}</span><code>{value}</code></li>)}</ol> : <p>沒有找到符合長度的可列印 ASCII 字串。</p>}</div>}</div>;
}

function TimestampTool() {
  const [value, setValue] = useState("");
  const [format, setFormat] = useState<TimestampFormat>("unix-seconds");
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setDate(decodeTimestamp(value, format)); setError(""); }
    catch (cause) { setDate(null); setError(cause instanceof Error ? cause.message : "時間戳解析失敗。 "); }
  }
  const labels: Record<TimestampFormat, string> = { "unix-seconds": "Unix seconds", "unix-milliseconds": "Unix milliseconds", filetime: "Windows FILETIME (100ns since 1601)", webkit: "WebKit / Chrome (μs since 1601)" };
  return <div className="single-workbench"><div className="workbench-grid"><label className="field"><span>時間戳整數</span><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="例如 1723948800" inputMode="numeric" /></label><label className="field"><span>格式</span><select value={format} onChange={(event) => setFormat(event.target.value as TimestampFormat)}>{Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><button className="primary-button" type="button" onClick={run}>解碼時間</button><ErrorNotice message={error} />{date && <div className="timestamp-results"><div><span>ISO 8601 / UTC</span><code>{date.toISOString()}</code></div><div><span>台北時間 Asia/Taipei</span><code>{date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}</code></div><div><span>瀏覽器本地時間</span><code>{date.toString()}</code></div></div>}</div>;
}

function SecretScannerTool() {
  const [input, setInput] = useState("");
  const findings = useMemo(() => input ? scanSecrets(input) : [], [input]);
  return <div className="single-workbench"><div className="warning-banner"><strong>內容只在目前分頁掃描</strong><span>結果預設遮罩，不會把完整 Secret 寫入 DOM、剪貼簿或儲存空間。</span></div><TextArea label="程式碼、設定檔或 Log" value={input} onChange={setInput} placeholder="貼上要檢查的內容…" rows={14} />{input && <div className={`secret-report ${findings.length ? "has-findings" : ""}`}><div><strong>{findings.length ? `找到 ${findings.length} 個疑似敏感資訊` : "未發現已知 Secret 格式"}</strong><span>仍需搭配人工檢查，掃描器無法涵蓋自訂憑證格式。</span></div>{findings.length > 0 && <ol>{findings.map((finding,index) => <li key={`${finding.type}-${finding.line}-${index}`}><span>L{finding.line}</span><strong>{finding.type}</strong><code>{finding.preview}</code></li>)}</ol>}</div>}</div>;
}

function HashIdentifierTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => identifyHash(input), [input]);
  return <div className="single-workbench"><label className="field"><span>Hash 或 encoded hash</span><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="$2b$12$… 或 5d41402abc4b2a76b9719d911017c592" spellCheck={false} /></label>{input && <div className="hash-id-report"><div className="results-line"><strong>{result.length}</strong> 個字元 <span>· {result.characterSet}</span></div>{result.candidates.length ? <div className="candidate-list">{result.candidates.map((candidate) => <div key={candidate.name}><span className={`status status--${candidate.confidence === "high" ? "popular" : "new"}`}>{candidate.confidence === "high" ? "高信心" : "候選"}</span><strong>{candidate.name}</strong><p>{candidate.note}</p></div>)}</div> : <div className="empty-inline">沒有符合目前資料庫的常見 Hash 格式。</div>}</div>}</div>;
}

function HexViewerTool() {
  const [result, setResult] = useState<{ name: string; text: string; shownBytes: number; truncated: boolean } | null>(null);
  const [error, setError] = useState("");
  async function inspect(file: File) {
    try {
      if (file.size > 10_000_000) throw new Error("檔案超過 10 MB 上限。 ");
      const view = formatHexView(new Uint8Array(await file.arrayBuffer()));
      setResult({ name: file.name, ...view }); setError("");
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "檔案讀取失敗。 "); }
  }
  return <div className="single-workbench"><FileDropField onFile={inspect} /><ErrorNotice message={error} />{result && <div className="hex-report"><div><strong>{result.name}</strong><span>顯示 {result.shownBytes.toLocaleString()} bytes{result.truncated ? " · 已截取前 64 KB" : ""}</span><CopyButton value={result.text} label="複製 Hex dump" /></div><pre>{result.text}</pre></div>}</div>;
}

function UrlRiskTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeUrlRisk> | null>(null);
  const [error, setError] = useState("");
  function run() { try { setResult(analyzeUrlRisk(input)); setError(""); } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "URL 格式錯誤。 "); } }
  return <div className="single-workbench"><label className="field"><span>可疑 URL</span><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://account.example@evil.test/login" spellCheck={false} /></label><button className="primary-button" type="button" onClick={run}>拆解 URL</button><ErrorNotice message={error} />{result && <div className="url-report">{result.flags.length ? <div className="warning-list"><strong>{result.flags.length} 個注意事項</strong><ul>{result.flags.map((flag) => <li key={flag.label}>{flag.label}</li>)}</ul></div> : <div className="file-verdict"><span>初步結果</span><strong>未發現目前規則涵蓋的明顯混淆特徵</strong></div>}<div className="email-summary">{Object.entries({ normalized: result.normalized, protocol: result.protocol, hostname: result.hostname, port: result.port, pathname: result.pathname, queryCount: result.queryCount, fragment: result.fragment }).map(([key,value]) => <div key={key}><span>{key}</span><code>{String(value)}</code></div>)}</div></div>}</div>;
}

function ChmodTool() {
  const [mode, setMode] = useState("755");
  const [error, setError] = useState("");
  const result = useMemo(() => { try { return calculateChmod(mode); } catch { return null; } }, [mode]);
  function validate() { try { calculateChmod(mode); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "權限格式錯誤。 "); } }
  return <div className="single-workbench"><label className="field field--short"><span>八進位權限</span><input value={mode} onChange={(event) => setMode(event.target.value)} onBlur={validate} placeholder="755" inputMode="numeric" /></label><ErrorNotice message={error} />{result && <div className="chmod-report"><div className="chmod-symbol"><strong>{result.symbolic}</strong><span>chmod {result.normalized}</span></div><div className="permission-grid">{["OWNER", "GROUP", "OTHERS"].map((label,index) => <div key={label}><span>{label}</span><code>{result.symbolic.slice(index * 3, index * 3 + 3)}</code></div>)}</div>{result.warnings.length ? <div className="warning-list"><strong>安全提醒</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : <p className="safe-note">目前沒有 world-writable、SUID 或 SGID 警訊。</p>}</div>}</div>;
}

function XorTool() {
  const [input, setInput] = useState(""); const [key, setKey] = useState(""); const [inputHex, setInputHex] = useState(false); const [keyHex, setKeyHex] = useState(false); const [output, setOutput] = useState<{hex:string;text:string}|null>(null); const [candidates, setCandidates] = useState<ReturnType<typeof bruteForceSingleByteXor>>([]); const [error, setError] = useState("");
  function run() { try { setOutput(xorTransform(input,key,inputHex,keyHex)); setCandidates([]); setError(""); } catch(cause) { setError(cause instanceof Error ? cause.message : "XOR 失敗。 "); } }
  function brute() { try { setCandidates(bruteForceSingleByteXor(input)); setOutput(null); setError(""); } catch(cause) { setError(cause instanceof Error ? cause.message : "枚舉失敗。 "); } }
  return <div className="single-workbench"><div className="workbench-grid"><div><TextArea label="輸入" value={input} onChange={setInput} placeholder={inputHex ? "48656c6c6f" : "文字或密文"}/><label className="toggle-line"><input type="checkbox" checked={inputHex} onChange={e=>setInputHex(e.target.checked)}/>輸入為 Hex</label></div><div><label className="field"><span>Key</span><input value={key} onChange={e=>setKey(e.target.value)} placeholder={keyHex ? "ff" : "key"}/></label><label className="toggle-line"><input type="checkbox" checked={keyHex} onChange={e=>setKeyHex(e.target.checked)}/>Key 為 Hex</label></div></div><div className="button-row"><button className="primary-button" type="button" onClick={run}>執行重複 XOR</button><button className="ghost-button" type="button" onClick={brute}>Single-byte 暴力枚舉</button></div><ErrorNotice message={error}/>{output&&<div className="ctf-results"><div><span>HEX</span><code>{output.hex}</code></div><div><span>TEXT</span><code>{output.text}</code></div></div>}{candidates.length>0&&<div className="candidate-list">{candidates.map(item=><div key={item.key}><strong>0x{item.hexKey} ({item.key})</strong><p><code>{item.text}</code></p></div>)}</div>}</div>;
}

function CaesarTool(){const[input,setInput]=useState("");const rows=useMemo(()=>caesarBruteforce(input),[input]);return <div className="single-workbench"><TextArea label="Ciphertext" value={input} onChange={setInput} placeholder="Gur synt vf va gur synt…"/>{input&&<div className="caesar-list">{rows.map(row=><div key={row.shift}><span>ROT {row.shift}</span><code>{row.text}</code></div>)}</div>}</div>}

function BaseAsciiTool(){const[input,setInput]=useState("");const[from,setFrom]=useState(16);const[to,setTo]=useState(10);const[output,setOutput]=useState("");const[error,setError]=useState("");function run(mode:"number"|"to-ascii"|"from-ascii"){try{setOutput(mode==="number"?convertNumberBase(input,from,to):mode==="to-ascii"?numbersToAscii(input,from):asciiToNumbers(input,to));setError("")}catch(cause){setError(cause instanceof Error?cause.message:"轉換失敗。 ")}}return <div className="single-workbench"><TextArea label="輸入（多個值可用空白分隔）" value={input} onChange={setInput}/><div className="workbench-grid"><label className="field"><span>來源進位</span><select value={from} onChange={e=>setFrom(Number(e.target.value))}>{[2,8,10,16].map(v=><option key={v} value={v}>Base {v}</option>)}</select></label><label className="field"><span>目標進位</span><select value={to} onChange={e=>setTo(Number(e.target.value))}>{[2,8,10,16].map(v=><option key={v} value={v}>Base {v}</option>)}</select></label></div><div className="button-row"><button className="primary-button" type="button" onClick={()=>run("number")}>轉換進位</button><button className="ghost-button" type="button" onClick={()=>run("to-ascii")}>數值 → ASCII</button><button className="ghost-button" type="button" onClick={()=>run("from-ascii")}>ASCII → 數值</button></div><ErrorNotice message={error}/>{output&&<div className="result-block"><span>RESULT</span><code>{output}</code></div>}</div>}

function IntegerPackerTool(){const[value,setValue]=useState("");const[bits,setBits]=useState<16|32|64>(64);const[little,setLittle]=useState(true);const[output,setOutput]=useState("");const[error,setError]=useState("");function run(unpack=false){try{setOutput(unpack?unpackInteger(value,little):packInteger(value,bits,little));setError("")}catch(cause){setError(cause instanceof Error?cause.message:"轉換失敗。 ")}}return <div className="single-workbench"><label className="field"><span>整數或 Hex bytes</span><input value={value} onChange={e=>setValue(e.target.value)} placeholder="4198400 或 00 10 40 00 00 00 00 00"/></label><div className="button-row">{([16,32,64] as const).map(v=><button type="button" className={bits===v?"primary-button":"ghost-button"} onClick={()=>setBits(v)} key={v}>p{v}</button>)}<label className="toggle-line"><input type="checkbox" checked={little} onChange={e=>setLittle(e.target.checked)}/>Little Endian</label></div><div className="button-row"><button className="primary-button" type="button" onClick={()=>run(false)}>Pack</button><button className="ghost-button" type="button" onClick={()=>run(true)}>Unpack</button></div><ErrorNotice message={error}/>{output&&<div className="result-block"><span>RESULT</span><code>{output}</code></div>}</div>}

function RsaMathTool(){const[a,setA]=useState("");const[b,setB]=useState("");const[m,setM]=useState("");const[output,setOutput]=useState("");const[error,setError]=useState("");function run(type:"gcd"|"inverse"|"pow"){try{const aa=BigInt(a),bb=BigInt(b);setOutput(String(type==="gcd"?gcdBigInt(aa,bb):type==="inverse"?modInverse(aa,bb):powMod(aa,bb,BigInt(m))));setError("")}catch(cause){setError(cause instanceof Error?cause.message:"計算失敗。 ")}}return <div className="single-workbench"><div className="workbench-grid"><label className="field"><span>A / Base</span><input value={a} onChange={e=>setA(e.target.value)}/></label><label className="field"><span>B / Exponent</span><input value={b} onChange={e=>setB(e.target.value)}/></label></div><label className="field"><span>Modulus（僅快速模冪使用）</span><input value={m} onChange={e=>setM(e.target.value)}/></label><div className="button-row"><button className="primary-button" type="button" onClick={()=>run("gcd")}>GCD(A, B)</button><button className="ghost-button" type="button" onClick={()=>run("inverse")}>A⁻¹ mod B</button><button className="ghost-button" type="button" onClick={()=>run("pow")}>Aᴮ mod M</button></div><ErrorNotice message={error}/>{output&&<div className="result-block"><span>RESULT</span><code>{output}</code></div>}</div>}

function OtpTool() {
  const [mode, setMode] = useState<"totp" | "hotp">("totp");
  const [secret, setSecret] = useState("");
  const [counter, setCounter] = useState("0");
  const [period, setPeriod] = useState(30);
  const [digits, setDigits] = useState<6 | 7 | 8>(6);
  const [algorithm, setAlgorithm] = useState<OtpAlgorithm>("SHA-1");
  const [result, setResult] = useState<{ code: string; counter: string; note: string } | null>(null);
  const [error, setError] = useState("");
  async function run() {
    try {
      if (mode === "totp") {
        const now = Math.floor(Date.now() / 1000);
        const generated = await generateTotp(secret, now, period, digits, algorithm);
        setResult({ code: generated.code, counter: generated.counter.toString(), note: `以目前裝置時間產生，約 ${generated.remainingSeconds} 秒後更新` });
      } else {
        const parsedCounter = BigInt(counter.trim());
        setResult({ code: await generateHotp(secret, parsedCounter, digits, algorithm), counter: parsedCounter.toString(), note: "HOTP 使用後應由驗證端遞增 Counter" });
      }
      setError("");
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "OTP 計算失敗。 ");
    }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>Secret 只保留在目前分頁記憶體</strong><span>請勿在共享裝置輸入正式帳號的 MFA Secret；本工具不會保存或傳送內容。</span></div><div className="button-row"><button type="button" className={mode === "totp" ? "primary-button" : "ghost-button"} onClick={() => { setMode("totp"); setResult(null); }}>TOTP（時間型）</button><button type="button" className={mode === "hotp" ? "primary-button" : "ghost-button"} onClick={() => { setMode("hotp"); setResult(null); }}>HOTP（Counter 型）</button></div><label className="field"><span>Base32 Secret</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" placeholder="JBSWY3DPEHPK3PXP" spellCheck={false} /></label><div className="workbench-grid"><label className="field"><span>{mode === "totp" ? "週期（秒）" : "Counter"}</span>{mode === "totp" ? <input type="number" min="1" max="300" value={period} onChange={(event) => setPeriod(Number(event.target.value))} /> : <input value={counter} onChange={(event) => setCounter(event.target.value)} inputMode="numeric" />}</label><label className="field"><span>位數</span><select value={digits} onChange={(event) => setDigits(Number(event.target.value) as 6 | 7 | 8)}><option value={6}>6 digits</option><option value={7}>7 digits</option><option value={8}>8 digits</option></select></label></div><label className="field field--short"><span>HMAC 演算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as OtpAlgorithm)}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select><small>多數 Authenticator 預設使用 SHA-1；請依服務端設定選擇。</small></label><button className="primary-button" type="button" onClick={run}>產生 {mode.toUpperCase()}</button><ErrorNotice message={error} />{result && <div className="otp-report"><span>ONE-TIME PASSWORD</span><strong>{result.code}</strong><small>Counter {result.counter} · {result.note}</small><CopyButton value={result.code} label="複製驗證碼" /></div>}</div>;
}

function IpAddressTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof analyzeIpAddress> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(analyzeIpAddress(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "IP 位址解析失敗。 "); }
  }
  const labels = { normalized: "正規化", expanded: "完整展開", decimal: "整數（Decimal）", hexadecimal: "Hexadecimal", binary: "Binary", reverseDns: "Reverse DNS" };
  return <div className="single-workbench"><label className="field"><span>IPv4 或 IPv6 位址</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") run(); }} placeholder="2001:db8::ff00:42:8329" spellCheck={false} /></label><button className="primary-button" type="button" onClick={run}>解析與轉換</button><ErrorNotice message={error} />{result && <div className="ip-report"><div className="file-verdict"><span>辨識結果</span><strong>IPv{result.version}</strong></div><div className="timestamp-results">{Object.entries(labels).map(([key, label]) => <div key={key}><span>{label}</span><code>{String(result[key as keyof typeof labels])}</code></div>)}</div><CopyButton value={result.normalized} label="複製正規化位址" /></div>}</div>;
}

function UnicodeEscapeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [format, setFormat] = useState<EscapeFormat>("javascript");
  const [error, setError] = useState("");
  function run(direction: "encode" | "decode") {
    try { setOutput(direction === "encode" ? encodeEscapedText(input, format) : decodeEscapedText(input, format)); setError(""); }
    catch (cause) { setOutput(""); setError(cause instanceof Error ? cause.message : "跳脫序列處理失敗。 "); }
  }
  const placeholders: Record<EscapeFormat, string> = { javascript: "\\u0066\\u006c\\u0061\\u0067 或文字", codepoints: "U+0066 U+006C U+0061 U+0067", "html-numeric": "&#x66;&#x6C;&#x61;&#x67;" };
  return <div className="single-workbench"><div className="warning-banner"><strong>只做字串轉換，不執行程式碼</strong><span>未知的跳脫片段會保留原樣；HTML 模式只處理 numeric entity，不解析 named entity 或標籤。</span></div><label className="field field--short"><span>格式</span><select value={format} onChange={(event) => { setFormat(event.target.value as EscapeFormat); setOutput(""); }}><option value="javascript">JavaScript \\u／\\x escape</option><option value="codepoints">Unicode code points</option><option value="html-numeric">HTML numeric entities</option></select></label><div className="workbench-grid"><div><TextArea label="輸入" value={input} onChange={setInput} placeholder={placeholders[format]} rows={10} /><div className="button-row"><button className="primary-button" type="button" onClick={() => run("decode")}>解碼</button><button className="ghost-button" type="button" onClick={() => run("encode")}>編碼</button></div><ErrorNotice message={error} /></div><div><TextArea label="結果" value={output} onChange={setOutput} placeholder="結果會以純文字顯示" rows={10} /><CopyButton value={output} /></div></div></div>;
}

function Ipv6CidrTool() {
  const [input, setInput] = useState("2001:db8:1234:5678::1/64");
  const [result, setResult] = useState<ReturnType<typeof calculateIpv6Cidr> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(calculateIpv6Cidr(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "IPv6 prefix 解析失敗。 "); }
  }
  const labels = { network: "正規化網段", expandedNetwork: "完整展開網段", firstAddress: "第一個位址", lastAddress: "最後一個位址", addressCount: "總位址數" };
  return <div className="single-workbench"><label className="field"><span>IPv6 / Prefix</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") run(); }} placeholder="2001:db8:1234:5678::1/64" spellCheck={false} /></label><button className="primary-button" type="button" onClick={run}>計算 IPv6 網段</button><ErrorNotice message={error} />{result && <div className="ipv6-cidr-report"><div className="timestamp-results">{Object.entries(labels).map(([key, label]) => <div key={key}><span>{label}</span><code>{String(result[key as keyof typeof labels])}</code></div>)}</div>{result.reverseZone ? <div className="result-block"><span>REVERSE DNS ZONE</span><code>{result.reverseZone}</code><CopyButton value={result.reverseZone} label="複製 Zone" /></div> : <div className="warning-list"><strong>Reverse DNS 提醒</strong><ul><li>Prefix /{result.prefix} 不是 nibble boundary（4 的倍數），無法直接產生單一 ip6.arpa delegation zone。</li></ul></div>}</div>}</div>;
}

function HttpMessageTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof parseHttpMessage> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(parseHttpMessage(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "HTTP 訊息解析失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>只解析，不會重送 HTTP 訊息</strong><span>可貼入 Burp Suite、Proxy、封包或 Log 內容；Authorization 與 Cookie 請先確認是否需要遮罩。</span></div><TextArea label="原始 HTTP Request 或 Response" value={input} onChange={setInput} placeholder={"POST /login?next=%2Fadmin HTTP/1.1\nHost: example.test\nContent-Type: application/x-www-form-urlencoded\nContent-Length: 23\n\nuser=admin&pass=test"} rows={14} /><button className="primary-button" type="button" onClick={run}>解析 HTTP 訊息</button><ErrorNotice message={error} />{result && <div className="http-message-report"><div className="file-verdict"><span>{result.type === "request" ? "HTTP REQUEST" : "HTTP RESPONSE"}</span><strong>{result.startLine}</strong></div>{result.warnings.length > 0 && <div className="warning-list"><strong>{result.warnings.length} 個注意事項</strong><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}<div className="stat-grid"><div><span>{result.type === "request" ? "METHOD" : "STATUS"}</span><strong>{result.type === "request" ? result.method : result.status}</strong></div><div><span>VERSION</span><strong>{result.version}</strong></div><div><span>HEADERS</span><strong>{result.headers.length}</strong></div><div><span>BODY BYTES</span><strong>{result.bodyBytes}</strong></div></div><div className="http-parameter-grid"><HttpParameterList title="QUERY" values={result.query} /><HttpParameterList title="COOKIES" values={result.cookies} /><HttpParameterList title="FORM BODY" values={result.bodyParameters} /></div>{result.jsonValid && <div className="result-block"><span>JSON BODY</span><code>{JSON.stringify(result.json, null, 2)}</code></div>}<details className="received-chain"><summary>Headers（{result.headers.length}）</summary><ol>{result.headers.map((header, index) => <li key={`${header.name}-${index}`}><code>{header.name}: {header.value}</code></li>)}</ol></details>{result.body && <details className="received-chain"><summary>Raw Body（{result.bodyBytes} bytes）</summary><pre>{result.body}</pre></details>}</div>}</div>;
}

function LayeredDecoderTool() {
  const [input, setInput] = useState("");
  const [maxLayers, setMaxLayers] = useState(8);
  const [result, setResult] = useState<ReturnType<typeof decodeLayered> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(decodeLayered(input, maxLayers)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "多層解碼失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>最多 12 層，單層輸出上限 2 MB</strong><span>只執行已知的字串 decoder，不會 eval、執行腳本或開啟解出的網址。</span></div><TextArea label="多層編碼字串" value={input} onChange={setInput} placeholder="%5A%6D%78%68%5A%77%3D%3D" rows={9} /><label className="field field--short"><span>最多解碼層數</span><select value={maxLayers} onChange={(event) => setMaxLayers(Number(event.target.value))}>{[3,5,8,10,12].map((value) => <option key={value} value={value}>{value} layers</option>)}</select></label><button className="primary-button" type="button" onClick={run}>自動逐層解碼</button><ErrorNotice message={error} />{result && <div className="layered-report"><div className="layered-report__summary"><strong>{result.steps.length} 層</strong><span>{result.reachedLimit ? "已達設定上限，請人工確認是否繼續。" : result.steps.length ? "已停止於無法安全辨識的格式。" : "未辨識到可安全自動解碼的格式。"}</span></div>{result.steps.length > 0 && <ol>{result.steps.map((step, index) => <li key={`${step.format}-${index}`}><span>{index + 1}</span><div><strong>{step.format}</strong><small>{step.beforeLength} → {step.afterLength} characters</small><code>{step.preview}</code></div></li>)}</ol>}<TextArea label="最終結果" value={result.final} onChange={(final) => setResult({ ...result, final })} rows={8} /><CopyButton value={result.final} /></div>}</div>;
}

function Ipv4CidrAggregatorTool() {
  const [input, setInput] = useState("10.0.0.0/25\n10.0.0.128/25\n192.0.2.10\n192.0.2.10 # duplicate");
  const [result, setResult] = useState<ReturnType<typeof aggregateIpv4Cidrs> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(aggregateIpv4Cidrs(input)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "IPv4 CIDR 合併失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>只合併完全相同的位址集合</strong><span>不會為了縮短清單而納入原始輸入以外的 IP；單一位址會視為 /32。</span></div><TextArea label="IPv4／CIDR 清單" value={input} onChange={setInput} placeholder={"10.0.0.0/25\n10.0.0.128/25\n192.0.2.10"} rows={12} /><button className="primary-button" type="button" onClick={run}>合併 CIDR 清單</button><ErrorNotice message={error} />{result && <div className="cidr-aggregate-report"><div className="stat-grid"><div><span>INPUT</span><strong>{result.inputCount}</strong></div><div><span>OUTPUT</span><strong>{result.outputCount}</strong></div><div><span>REDUCED</span><strong>{result.removedCount}</strong></div><div><span>ADDRESSES</span><strong>{result.totalAddresses}</strong></div></div><div className="result-block"><span>MINIMAL CIDR SET</span><code>{result.cidrs.join("\n")}</code></div><CopyButton value={result.cidrs.join("\n")} label="複製 CIDR 清單" /></div>}</div>;
}

function DnsMessageDecoderTool() {
  const [encoding, setEncoding] = useState<"hex" | "base64">("hex");
  const [input, setInput] = useState("12348180000100010000000003777777076578616d706c6503636f6d0000010001c00c000100010000012c00045db8d822");
  const [result, setResult] = useState<ReturnType<typeof decodeDnsMessage> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(decodeDnsMessage(input, encoding)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "DNS message 解析失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>離線解析，不會送出 DNS Query</strong><span>最多解析 65,535 bytes、500 個 Section entries，並限制 compression pointer 跳轉次數。</span></div><label className="field field--short"><span>輸入格式</span><select value={encoding} onChange={(event) => { setEncoding(event.target.value as "hex" | "base64"); setResult(null); }}><option value="hex">Hex bytes</option><option value="base64">Base64</option></select></label><TextArea label="DNS Wire Message" value={input} onChange={setInput} placeholder="12 34 81 80 00 01 ..." rows={11} /><button className="primary-button" type="button" onClick={run}>解碼 DNS 封包</button><ErrorNotice message={error} />{result && <div className="dns-report"><div className="stat-grid"><div><span>TRANSACTION ID</span><strong>{result.id}</strong></div><div><span>TYPE</span><strong>{result.kind}</strong></div><div><span>RCODE</span><strong>{result.rcode}</strong></div><div><span>BYTES</span><strong>{result.byteLength}</strong></div></div><div className="dns-flags"><span>FLAGS</span><code>{result.flags.join(" ") || "none"}</code><small>Opcode {result.opcode}{result.trailingBytes ? ` · ${result.trailingBytes} trailing bytes` : ""}</small></div>{result.questions.length > 0 && <section className="dns-record-section"><div><strong>QUESTION</strong><span>{result.questions.length} RECORDS</span></div><ol>{result.questions.map((question, index) => <li key={`${question.name}-${index}`}><code>{question.name}</code><strong>{question.type}</strong><span>{question.className}</span></li>)}</ol></section>}<DnsRecordList title="ANSWER" records={result.answers} /><DnsRecordList title="AUTHORITY" records={result.authority} /><DnsRecordList title="ADDITIONAL" records={result.additional} /></div>}</div>;
}

function PathTraversalAnalyzerTool() {
  const [input, setInput] = useState("..%252f..%252fetc%252fpasswd%00.jpg");
  const [layers, setLayers] = useState(3);
  const [result, setResult] = useState<ReturnType<typeof analyzePathTraversal> | null>(null);
  const [error, setError] = useState("");
  function run() {
    try { setResult(analyzePathTraversal(input, layers)); setError(""); }
    catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "路徑分析失敗。 "); }
  }
  return <div className="single-workbench"><div className="warning-banner"><strong>只做詞法正規化，不讀取任何檔案</strong><span>結果用於辨識 canonicalization 差異；實際是否可利用仍取決於應用程式、作業系統與檔案權限。</span></div><TextArea label="URL／檔案路徑" value={input} onChange={setInput} placeholder="..%252f..%252fetc%252fpasswd" rows={8} /><label className="field field--short"><span>最多 URL 解碼層數</span><select value={layers} onChange={(event) => setLayers(Number(event.target.value))}>{[0,1,2,3,4,5].map((value) => <option key={value} value={value}>{value} layers</option>)}</select></label><button className="primary-button" type="button" onClick={run}>分析 Path Traversal</button><ErrorNotice message={error} />{result && <div className="path-report"><div className={`file-verdict ${result.risk === "高" ? "is-mismatch" : ""}`}><span>RISK LEVEL</span><strong>{result.risk}風險</strong></div><div className="stat-grid"><div><span>DECODE LAYERS</span><strong>{result.decodeSteps.length}</strong></div><div><span>TRAVERSAL</span><strong>{result.traversalSegments}</strong></div><div><span>ESCAPES ROOT</span><strong>{result.escapesRoot}</strong></div><div><span>FINDINGS</span><strong>{result.findings.length}</strong></div></div>{result.findings.length > 0 ? <div className="warning-list"><strong>分析結果</strong><ul>{result.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul></div> : <p className="safe-note">未發現明顯的 traversal 或路徑解析風險訊號。</p>}{result.decodeSteps.length > 0 && <div className="path-decode-steps"><strong>PERCENT DECODING</strong><ol>{result.decodeSteps.map((step) => <li key={step.layer}><span>LAYER {step.layer}</span><code>{step.value}</code></li>)}</ol></div>}<div className="result-block"><span>LEXICALLY NORMALIZED PATH</span><code>{result.normalizedDisplay}</code></div><CopyButton value={result.normalized} label="複製正規化路徑" /></div>}</div>;
}

export function ToolWorkbench({ slug }: { slug: string }) {
  switch (slug) {
    case "base64-codec": return <CodecTool mode="base64" />;
    case "url-codec": return <CodecTool mode="url" />;
    case "hash-generator": return <HashTool />;
    case "sri-generator": return <HashTool sri />;
    case "hmac-generator": return <HmacTool />;
    case "jwt-decoder": return <JwtTool />;
    case "password-generator": return <PasswordGenerator />;
    case "password-strength": return <PasswordStrength />;
    case "ioc-extractor": return <IocTool />;
    case "url-defanger": return <DefangTool />;
    case "cidr-calculator": return <CidrTool />;
    case "cvss-calculator": return <CvssTool />;
    case "entropy-calculator": return <EntropyTool />;
    case "security-headers-analyzer": return <SecurityHeadersTool />;
    case "email-header-analyzer": return <EmailHeaderTool />;
    case "file-signature-checker": return <FileSignatureTool />;
    case "string-extractor": return <StringExtractorTool />;
    case "timestamp-decoder": return <TimestampTool />;
    case "secret-scanner": return <SecretScannerTool />;
    case "hash-identifier": return <HashIdentifierTool />;
    case "hex-viewer": return <HexViewerTool />;
    case "url-risk-analyzer": return <UrlRiskTool />;
    case "chmod-calculator": return <ChmodTool />;
    case "xor-tool": return <XorTool />;
    case "caesar-bruteforce": return <CaesarTool />;
    case "base-ascii-converter": return <BaseAsciiTool />;
    case "integer-packer": return <IntegerPackerTool />;
    case "rsa-math-helper": return <RsaMathTool />;
    case "otp-generator": return <OtpTool />;
    case "ip-address-converter": return <IpAddressTool />;
    case "unicode-escape-codec": return <UnicodeEscapeTool />;
    case "ipv6-cidr-calculator": return <Ipv6CidrTool />;
    case "http-message-parser": return <HttpMessageTool />;
    case "layered-decoder": return <LayeredDecoderTool />;
    case "ipv4-cidr-aggregator": return <Ipv4CidrAggregatorTool />;
    case "dns-message-decoder": return <DnsMessageDecoderTool />;
    case "path-traversal-analyzer": return <PathTraversalAnalyzerTool />;
    default: return null;
  }
}
