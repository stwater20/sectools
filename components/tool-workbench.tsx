"use client";

import { useMemo, useState } from "react";
import {
  assertSafeInput,
  base64ToUtf8,
  bytesToBase64,
  bytesToHex,
  calculateCidr,
  calculateCvss,
  calculateEntropy,
  decodeJwtPart,
  defang,
  estimatePassword,
  extractIocs,
  refang,
  utf8ToBase64,
  type CvssMetrics,
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
    default: return null;
  }
}
