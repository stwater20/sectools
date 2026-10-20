"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CopyButton, ErrorNotice, FileDropField, TextArea } from "@/components/tool-ui";
import {
  affine,
  affineBruteforce,
  affineMultipliers,
  analyzeFrequency,
  atbash,
  baconDecode,
  baconEncode,
  baseEncodings,
  bytesToDisplay,
  crackVigenere,
  decodeBase,
  detectBaseEncodings,
  encodeBase,
  extractLsb,
  forgeJwt,
  morseDecode,
  morseEncode,
  ookToBrainfuck,
  printablePrefix,
  railFence,
  railFenceBruteforce,
  rot47,
  runBrainfuck,
  scanEmbeddedFiles,
  solveRsa,
  splitJwt,
  vigenere,
  type BaseEncoding,
  type EmbeddedHit,
  type FileFinding,
  type JwtForgeAlgorithm,
  type RankedCandidate,
  type RsaResult,
  type StegoChannel,
  type VigenereCandidate,
} from "@/lib/ctf-utils";

const maxFileSize = 10_000_000;

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function SampleButton({ onClick }: { onClick: () => void }) {
  return <button className="ghost-button sample-button" type="button" onClick={onClick}>載入範例</button>;
}

function CandidateList({ items }: { items: RankedCandidate[] }) {
  if (!items.length) return null;
  return (
    <ol className="ranked-list">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className={index === 0 ? "is-best" : ""}>
          <span>{index === 0 ? "最可能" : `#${index + 1}`}</span>
          <strong>{item.label}</strong>
          <code>{item.text}</code>
        </li>
      ))}
    </ol>
  );
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Vigenère ---------- */

const vigenereSample = "Ax ytg hsw tium ct eaeiu, bh klk llg pcfdl gj vbasd, al acl hvp syi qy kwdvgq, km kod lzi czs cq xgsnbgvywkw, km kod lzi gicqs gx fgewsq. xdei{owupfwvg_vfoncwh}";

export function VigenereTool() {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const [candidates, setCandidates] = useState<VigenereCandidate[]>([]);
  const [error, setError] = useState("");
  function run(decrypt: boolean) {
    try { setOutput(vigenere(input, key, decrypt)); setCandidates([]); setError(""); }
    catch (cause) { setError(errorMessage(cause, "處理失敗。 ")); }
  }
  function crack() {
    try {
      const result = crackVigenere(input);
      setCandidates(result.slice(0, 5));
      setKey(result[0]?.key ?? "");
      setOutput(result[0]?.plaintext ?? "");
      setError("");
    } catch (cause) { setCandidates([]); setError(errorMessage(cause, "破解失敗。 ")); }
  }
  return (
    <div className="single-workbench">
      <div className="workbench-grid">
        <div>
          <TextArea label="密文或明文" value={input} onChange={setInput} placeholder="貼上 Vigenère 密文…" rows={9} />
          <label className="field"><span>Key（只取英文字母）</span><input value={key} onChange={(event) => setKey(event.target.value)} placeholder="LEMON" spellCheck={false} /></label>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={crack}>自動破解 Key</button>
            <button className="ghost-button" type="button" onClick={() => run(true)}>用 Key 解密</button>
            <button className="ghost-button" type="button" onClick={() => run(false)}>用 Key 加密</button>
            <SampleButton onClick={() => { setInput(vigenereSample); setKey(""); setOutput(""); setCandidates([]); }} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label="結果" value={output} onChange={setOutput} rows={9} placeholder="結果會顯示在這裡" />
          <CopyButton value={output} />
        </div>
      </div>
      {candidates.length > 0 && (
        <ol className="ranked-list">
          {candidates.map((item, index) => (
            <li key={item.key} className={index === 0 ? "is-best" : ""}>
              <span>{index === 0 ? "最可能" : `#${index + 1}`}</span>
              <strong>Key = {item.key}（長度 {item.keyLength}）</strong>
              <code>{item.plaintext.slice(0, 200)}</code>
            </li>
          ))}
        </ol>
      )}
      <p className="tool-hint">自動破解使用重合指數（IC）推測金鑰長度，再以英文字母頻率與常見字詞評分。密文越長越準；少於約 100 個字母時請參考多個候選。</p>
    </div>
  );
}

/* ---------- Classical ciphers ---------- */

type ClassicMode = "atbash" | "rot47" | "affine" | "railfence" | "bacon";
const classicModes: Array<{ id: ClassicMode; label: string; sample: string }> = [
  { id: "atbash", label: "Atbash", sample: "uozt{zgyzhs_nriili}" },
  { id: "rot47", label: "ROT47", sample: "7=28LC@Ecf0D9:7ED0DJ>3@=DN" },
  { id: "affine", label: "Affine", sample: "hlim{ihhwvc_swfrcp} zrc gcy oiu ciuy za hwvx" },
  { id: "railfence", label: "Rail Fence", sample: "WECRLTEERDSOEEFEAOCAIVDEN" },
  { id: "bacon", label: "Bacon", sample: "AABAB ABABB AAAAA AABBA" },
];

export function ClassicCipherTool() {
  const [mode, setMode] = useState<ClassicMode>("atbash");
  const [input, setInput] = useState("");
  const [a, setA] = useState(5);
  const [b, setB] = useState(8);
  const [rails, setRails] = useState(3);
  const [output, setOutput] = useState("");
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [error, setError] = useState("");
  function run(action: "encode" | "decode" | "brute") {
    try {
      setError("");
      setCandidates([]);
      if (action === "brute") {
        const result = mode === "affine" ? affineBruteforce(input) : railFenceBruteforce(input);
        setCandidates(result);
        setOutput(result[0]?.text ?? "");
        return;
      }
      const decode = action === "decode";
      const result = mode === "atbash" ? atbash(input)
        : mode === "rot47" ? rot47(input)
        : mode === "affine" ? affine(input, a, b, decode)
        : mode === "railfence" ? railFence(input, rails, decode)
        : decode ? baconDecode(input) : baconEncode(input);
      setOutput(result);
    } catch (cause) { setOutput(""); setError(errorMessage(cause, "處理失敗。 ")); }
  }
  const canBrute = mode === "affine" || mode === "railfence";
  const symmetric = mode === "atbash" || mode === "rot47";
  return (
    <div className="single-workbench">
      <div className="segmented" role="group" aria-label="密碼類型">
        {classicModes.map((item) => (
          <button key={item.id} type="button" className={mode === item.id ? "is-active" : ""} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setOutput(""); setCandidates([]); setError(""); }}>{item.label}</button>
        ))}
      </div>
      <div className="workbench-grid">
        <div>
          <TextArea label="輸入" value={input} onChange={setInput} rows={8} placeholder="貼上密文或明文…" />
          {mode === "affine" && (
            <div className="workbench-grid">
              <label className="field"><span>a（與 26 互質）</span><select value={a} onChange={(event) => setA(Number(event.target.value))}>{affineMultipliers.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="field"><span>b（0–25）</span><input type="number" min="0" max="25" value={b} onChange={(event) => setB(Number(event.target.value))} /></label>
            </div>
          )}
          {mode === "railfence" && <label className="field field--short"><span>Rails</span><input type="number" min="2" max="50" value={rails} onChange={(event) => setRails(Number(event.target.value))} /></label>}
          <div className="button-row">
            {symmetric ? <button className="primary-button" type="button" onClick={() => run("decode")}>轉換（加解密相同）</button> : <>
              <button className="primary-button" type="button" onClick={() => run("decode")}>解密</button>
              <button className="ghost-button" type="button" onClick={() => run("encode")}>加密</button>
            </>}
            {canBrute && <button className="ghost-button" type="button" onClick={() => run("brute")}>暴力枚舉</button>}
            <SampleButton onClick={() => { setInput(classicModes.find((item) => item.id === mode)!.sample); setOutput(""); setCandidates([]); }} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label="結果" value={output} onChange={setOutput} rows={8} placeholder="結果會顯示在這裡" />
          <CopyButton value={output} />
        </div>
      </div>
      <CandidateList items={candidates} />
    </div>
  );
}

/* ---------- Morse ---------- */

export function MorseTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  function run(decode: boolean) {
    try { setOutput(decode ? morseDecode(input) : morseEncode(input)); setError(""); }
    catch (cause) { setOutput(""); setError(errorMessage(cause, "處理失敗。 ")); }
  }
  return (
    <div className="workbench-grid">
      <div>
        <TextArea label="輸入（摩斯碼或文字）" value={input} onChange={setInput} rows={8} placeholder="..-. .-.. .- --. / .. ... / ..-. ..- -." />
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => run(true)}>解碼摩斯碼</button>
          <button className="ghost-button" type="button" onClick={() => run(false)}>文字轉摩斯碼</button>
          <SampleButton onClick={() => setInput("..-. .-.. .- --. / -- --- .-. ... . / .. ... / ..-. ..- -.")} />
        </div>
        <p className="tool-hint">字母之間以空白分隔，單字之間用「/」、「|」或換行。也接受 · 與 — 等符號。</p>
        <ErrorNotice message={error} />
      </div>
      <div>
        <TextArea label="結果" value={output} onChange={setOutput} rows={8} placeholder="結果會顯示在這裡" />
        <CopyButton value={output} />
      </div>
    </div>
  );
}

/* ---------- Base family ---------- */

export function BaseFamilyTool() {
  const [input, setInput] = useState("");
  const [encoding, setEncoding] = useState<BaseEncoding>("base58");
  const [output, setOutput] = useState("");
  const [hex, setHex] = useState("");
  const [detected, setDetected] = useState<ReturnType<typeof detectBaseEncodings> | null>(null);
  const [error, setError] = useState("");
  function run(decode: boolean) {
    try {
      setDetected(null);
      if (decode) {
        const display = bytesToDisplay(decodeBase(input, encoding));
        setOutput(display.text); setHex(display.hex);
      } else {
        setOutput(encodeBase(new TextEncoder().encode(input), encoding)); setHex("");
      }
      setError("");
    } catch (cause) { setOutput(""); setHex(""); setError(errorMessage(cause, "處理失敗。 ")); }
  }
  function detect() {
    const result = detectBaseEncodings(input);
    setDetected(result);
    setError(result.length ? "" : "沒有任何 Base 格式能解出可讀文字。試試多層編碼解碼器或 Base64 工具。");
  }
  return (
    <div className="single-workbench">
      <div className="segmented" role="group" aria-label="編碼格式">
        {baseEncodings.map((item) => <button key={item.id} type="button" className={encoding === item.id ? "is-active" : ""} aria-pressed={encoding === item.id} onClick={() => setEncoding(item.id)}>{item.label}</button>)}
      </div>
      <div className="workbench-grid">
        <div>
          <TextArea label="輸入" value={input} onChange={setInput} rows={8} placeholder="貼上要編碼或解碼的內容…" />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => run(true)}>解碼</button>
            <button className="ghost-button" type="button" onClick={() => run(false)}>編碼</button>
            <button className="ghost-button" type="button" onClick={detect}>自動辨識</button>
            <SampleButton onClick={() => { setInput("5FPzvDxd8k4wqTrLJpUMEshVe"); setEncoding("base58"); }} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label="結果" value={output} onChange={setOutput} rows={8} placeholder="結果會顯示在這裡" />
          <CopyButton value={output} />
        </div>
      </div>
      {hex && <div className="result-block"><span>原始 BYTES（HEX）</span><code>{hex}</code></div>}
      {detected && detected.length > 0 && (
        <ol className="ranked-list">
          {detected.map((item, index) => (
            <li key={item.encoding} className={index === 0 ? "is-best" : ""}>
              <span>{Math.round(item.printableRatio * 100)}% 可讀</span>
              <strong>{item.label}</strong>
              <code>{item.text}</code>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------- Frequency analysis ---------- */

export function FrequencyTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => { try { return input.trim() ? analyzeFrequency(input) : null; } catch { return null; } }, [input]);
  const max = result ? Math.max(...result.letters.map((item) => Math.max(item.percent, item.expected))) : 1;
  return (
    <div className="single-workbench">
      <TextArea label="密文" value={input} onChange={setInput} rows={8} placeholder="貼上密文，即時計算字母頻率與重合指數…" />
      <div className="button-row"><SampleButton onClick={() => setInput("Gur dhvpx oebja sbk whzcf bire gur ynml qbt. Serdhrapl nanylfvf vf gur onfvf bs pynffvpny pelcgnanylfvf. synt{serd_nanylfvf}")} /></div>
      {input.trim() && !result && <p className="empty-inline">沒有找到英文字母。</p>}
      {result && (
        <div className="frequency-report">
          <div className="stat-grid">
            <div><span>字母數</span><strong>{result.total}</strong></div>
            <div><span>重合指數 IC</span><strong>{result.ic.toFixed(4)}</strong></div>
            <div><span>最可能 Caesar 位移</span><strong>ROT {result.likelyCaesarShift}</strong></div>
          </div>
          <p className="tool-hint">{result.verdict}</p>
          <div className="frequency-bars" role="table" aria-label="字母頻率">
            {result.letters.filter((item) => item.count > 0).map((item) => (
              <div key={item.letter} role="row">
                <strong role="cell">{item.letter}</strong>
                <span role="cell" className="frequency-bars__track">
                  <i style={{ width: `${(item.percent / max) * 100}%` }} />
                  <b style={{ left: `${(item.expected / max) * 100}%` }} title={`英文平均 ${item.expected}%`} />
                </span>
                <small role="cell">{item.percent.toFixed(1)}% · {item.count}</small>
              </div>
            ))}
          </div>
          <p className="tool-hint">長條為密文頻率，細線為英文平均頻率（E、T、A、O 最高）。</p>
          {result.bigrams.length > 0 && <div className="result-block"><span>常見雙字母組合</span><code>{result.bigrams.map((item) => `${item.bigram}×${item.count}`).join("  ")}</code></div>}
        </div>
      )}
    </div>
  );
}

/* ---------- RSA solver ---------- */

const rsaSample = { n: "1000000016000000063", e: "65537", c: "52443180272735416", p: "", q: "", d: "" };

export function RsaSolverTool() {
  const [values, setValues] = useState({ n: "", e: "65537", c: "", p: "", q: "", d: "" });
  const [result, setResult] = useState<RsaResult | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  function update(key: keyof typeof values, value: string) { setValues((current) => ({ ...current, [key]: value })); }
  function run() {
    setWorking(true);
    setError("");
    // Let the "計算中" state paint before a potentially long factorisation.
    window.setTimeout(() => {
      try { setResult(solveRsa(values)); }
      catch (cause) { setResult(null); setError(errorMessage(cause, "RSA 求解失敗。 ")); }
      finally { setWorking(false); }
    }, 30);
  }
  const fields: Array<[keyof typeof values, string, string]> = [["n", "n（模數）", "十進位或 0x 十六進位"], ["e", "e（公開指數）", "65537"], ["c", "c（密文）", "要解密的密文整數"], ["p", "p（選填）", "已知質因數"], ["q", "q（選填）", "已知質因數"], ["d", "d（選填）", "已知私鑰指數"]];
  return (
    <div className="single-workbench">
      <div className="rsa-grid">
        {fields.map(([key, label, placeholder]) => (
          <label key={key} className={`field ${key === "n" || key === "c" ? "rsa-grid__wide" : ""}`}>
            <span>{label}</span>
            <textarea rows={key === "n" || key === "c" ? 3 : 1} value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} spellCheck={false} />
          </label>
        ))}
      </div>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={run} disabled={working}>{working ? "計算中…" : "自動求解"}</button>
        <SampleButton onClick={() => { setValues(rsaSample); setResult(null); }} />
      </div>
      <p className="tool-hint">依序嘗試：已知 p／q／d → 小 e 開根號 → 試除法 → Fermat（p、q 接近）→ Wiener（d 過小）→ Pollard&apos;s rho。大型安全金鑰無法在瀏覽器分解，可先到 factordb 查詢。</p>
      <ErrorNotice message={error} />
      {result && (
        <div className="rsa-report">
          <ol className="rsa-steps">{result.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          {result.text !== undefined && (
            <div className="file-verdict"><span>明文（long_to_bytes）</span><strong className="rsa-plaintext">{result.text}</strong></div>
          )}
          <div className="timestamp-results">
            {result.m !== undefined && <div><span>m（整數）</span><code>{result.m.toString()}</code></div>}
            {result.hex && <div><span>m（hex）</span><code>{result.hex}</code></div>}
            {result.p !== undefined && <div><span>p</span><code>{result.p.toString()}</code></div>}
            {result.q !== undefined && <div><span>q</span><code>{result.q.toString()}</code></div>}
            {result.d !== undefined && <div><span>d</span><code>{result.d.toString()}</code></div>}
          </div>
          {result.text !== undefined && <CopyButton value={result.text} label="複製明文" />}
        </div>
      )}
    </div>
  );
}

/* ---------- Brainfuck / Ook! ---------- */

const brainfuckSample = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.";

export function BrainfuckTool() {
  const [source, setSource] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  function run() {
    try {
      const code = /Ook[.!?]/.test(source) ? ookToBrainfuck(source) : source;
      const result = runBrainfuck(code, input);
      setOutput(result.output);
      setStatus(`${result.halted ? "執行完成" : "已達 500 萬步上限，已停止"} · ${result.steps.toLocaleString()} 步${code !== source ? " · 已將 Ook! 轉為 Brainfuck" : ""}`);
      setError("");
    } catch (cause) { setOutput(""); setStatus(""); setError(errorMessage(cause, "執行失敗。 ")); }
  }
  return (
    <div className="single-workbench">
      <div className="workbench-grid">
        <div>
          <TextArea label="Brainfuck 或 Ook! 程式碼" value={source} onChange={setSource} rows={9} placeholder="++++++++[>++++[>++>+++…" />
          <label className="field"><span>程式輸入（, 指令讀取）</span><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="選填" /></label>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={run}>執行</button>
            <SampleButton onClick={() => setSource(brainfuckSample)} />
          </div>
          <ErrorNotice message={error} />
        </div>
        <div>
          <TextArea label="輸出" value={output} onChange={setOutput} rows={9} placeholder="執行結果" />
          {status && <p className="tool-hint">{status}</p>}
          <CopyButton value={output} />
        </div>
      </div>
    </div>
  );
}

/* ---------- JWT forger ---------- */

export function JwtForgerTool() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState('{\n  "typ": "JWT"\n}');
  const [payload, setPayload] = useState('{\n  "sub": "guest",\n  "role": "user"\n}');
  const [algorithm, setAlgorithm] = useState<JwtForgeAlgorithm>("none");
  const [secret, setSecret] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  function load() {
    try { const parts = splitJwt(token); setHeader(parts.header); setPayload(parts.payload); setError(""); }
    catch (cause) { setError(errorMessage(cause, "JWT 解析失敗。 ")); }
  }
  async function forge() {
    try { setOutput(await forgeJwt(header, payload, algorithm, secret)); setError(""); }
    catch (cause) { setOutput(""); setError(errorMessage(cause, "產生失敗。 ")); }
  }
  return (
    <div className="single-workbench">
      <div className="warning-banner"><strong>僅限 CTF 與授權測試</strong><span>用來驗證伺服器是否錯誤接受 alg=none 或弱 HMAC 金鑰；請勿用於未經授權的系統。</span></div>
      <label className="field"><span>既有 JWT（選填，載入後可修改）</span><textarea rows={3} value={token} onChange={(event) => setToken(event.target.value)} placeholder="eyJhbGciOi…" spellCheck={false} /></label>
      <div className="button-row">
        <button className="ghost-button" type="button" onClick={load}>載入 Header／Payload</button>
        <SampleButton onClick={() => {
          // Example: a guest token whose payload is already edited to escalate privileges.
          setToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndWVzdCIsInJvbGUiOiJ1c2VyIn0.vTCI707RnuTuU6LjalJrmsKzRs95uWkL3Tv8O26Keyo");
          setHeader('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
          setPayload('{\n  "sub": "guest",\n  "role": "admin"\n}');
          setOutput("");
        }} />
      </div>
      <div className="workbench-grid">
        <TextArea label="Header（JSON）" value={header} onChange={setHeader} rows={6} />
        <TextArea label="Payload（JSON）" value={payload} onChange={setPayload} rows={6} />
      </div>
      <div className="workbench-grid">
        <label className="field"><span>簽章演算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as JwtForgeAlgorithm)}><option value="none">none（無簽章）</option><option value="HS256">HS256</option><option value="HS384">HS384</option><option value="HS512">HS512</option></select></label>
        {algorithm !== "none" && <label className="field"><span>HMAC Secret</span><input value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="例如破解出的弱金鑰" spellCheck={false} /></label>}
      </div>
      <button className="primary-button" type="button" onClick={forge}>產生 JWT</button>
      <ErrorNotice message={error} />
      {output && <div className="result-block"><span>偽造的 JWT</span><code>{output}</code><CopyButton value={output} label="複製 JWT" /></div>}
    </div>
  );
}

/* ---------- Image helpers ---------- */

async function loadImageData(file: File, maxSide = 4096) {
  if (file.size > maxFileSize) throw new Error("圖片超過 10 MB 上限。 ");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("瀏覽器不支援 Canvas。 ");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { data: context.getImageData(0, 0, width, height), scaled: scale < 1 };
}

function usePastedFile(onFile: (file: File) => void) {
  const callback = useRef(onFile);
  useEffect(() => { callback.current = onFile; });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
      if (file) { event.preventDefault(); callback.current(file); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
}

/* ---------- QR decoder ---------- */

export function QrDecoderTool() {
  const [result, setResult] = useState<{ text: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  async function inspect(file: File) {
    setWorking(true);
    try {
      const [{ data }, { default: jsQR }] = await Promise.all([loadImageData(file, 2048), import("jsqr")]);
      const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (!code) throw new Error("找不到 QR Code。請裁切到只剩 QR Code 或提高解析度後再試。 ");
      setResult({ text: code.data, name: file.name || "剪貼簿圖片" }); setError("");
    } catch (cause) { setResult(null); setError(errorMessage(cause, "QR Code 解析失敗。 ")); }
    finally { setWorking(false); }
  }
  usePastedFile(inspect);
  return (
    <div className="single-workbench">
      <FileDropField onFile={inspect} accept="image/*" />
      <p className="tool-hint">{working ? "解析中…" : "也可以直接按 Ctrl + V 貼上截圖。圖片只在瀏覽器解析，不會上傳。"}</p>
      <ErrorNotice message={error} />
      {result && (
        <div className="qr-report">
          <div className="file-verdict"><span>QR CODE 內容 · {result.name}</span><strong className="rsa-plaintext">{result.text}</strong></div>
          {/^https?:\/\//i.test(result.text) && <p className="tool-hint">內容是網址。開啟前請先用「可疑 URL 分析器」檢查，不要直接點擊未知連結。</p>}
          <CopyButton value={result.text} label="複製內容" />
        </div>
      )}
    </div>
  );
}

/* ---------- LSB steganography ---------- */

const channelLabels: Record<StegoChannel, string> = { r: "R", g: "G", b: "B", a: "A" };

export function LsbStegoTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<{ data: ImageData; name: string; scaled: boolean } | null>(null);
  const [planeChannel, setPlaneChannel] = useState<StegoChannel>("r");
  const [planeBit, setPlaneBit] = useState(0);
  const [channels, setChannels] = useState<StegoChannel[]>(["r", "g", "b"]);
  const [bit, setBit] = useState(0);
  const [msbFirst, setMsbFirst] = useState(true);
  const [error, setError] = useState("");

  async function inspect(file: File) {
    try {
      if (file.type === "image/jpeg") setError("JPEG 為失真壓縮，LSB 資料通常已被破壞；建議使用 PNG／BMP 原始檔。");
      else setError("");
      const { data, scaled } = await loadImageData(file);
      setImage({ data, name: file.name || "剪貼簿圖片", scaled });
    } catch (cause) { setImage(null); setError(errorMessage(cause, "圖片讀取失敗。 ")); }
  }
  usePastedFile(inspect);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const { width, height, data } = image.data;
    canvas.width = width;
    canvas.height = height;
    const plane = new ImageData(width, height);
    const offset = { r: 0, g: 1, b: 2, a: 3 }[planeChannel];
    for (let index = 0; index < data.length; index += 4) {
      const value = ((data[index + offset] >> planeBit) & 1) * 255;
      plane.data[index] = value; plane.data[index + 1] = value; plane.data[index + 2] = value; plane.data[index + 3] = 255;
    }
    canvas.getContext("2d")?.putImageData(plane, 0, 0);
  }, [image, planeChannel, planeBit]);

  const extracted = useMemo(() => {
    if (!image || !channels.length) return null;
    const bytes = extractLsb(image.data.data, channels, bit, msbFirst);
    const text = printablePrefix(bytes);
    return { bytes, text, hex: Array.from(bytes.slice(0, 256), (byte) => byte.toString(16).padStart(2, "0")).join(" ") };
  }, [image, channels, bit, msbFirst]);

  function toggleChannel(channel: StegoChannel) {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : (["r", "g", "b", "a"] as StegoChannel[]).filter((item) => item === channel || current.includes(item)));
  }

  return (
    <div className="single-workbench">
      <FileDropField onFile={inspect} accept="image/png,image/bmp,image/gif,image/webp,image/jpeg" />
      <p className="tool-hint">可拖放或按 Ctrl + V 貼上圖片。類似 Stegsolve：檢視各色彩通道的位元平面，並依 LSB 擷取隱藏資料。</p>
      <ErrorNotice message={error} />
      {image && (
        <div className="stego-report">
          <div className="stego-controls">
            <div>
              <span className="stego-label">位元平面預覽</span>
              <div className="segmented segmented--small" role="group" aria-label="通道">
                {(["r", "g", "b", "a"] as StegoChannel[]).map((channel) => <button key={channel} type="button" className={planeChannel === channel ? "is-active" : ""} aria-pressed={planeChannel === channel} onClick={() => setPlaneChannel(channel)}>{channelLabels[channel]}</button>)}
              </div>
              <div className="segmented segmented--small" role="group" aria-label="位元">
                {[7, 6, 5, 4, 3, 2, 1, 0].map((value) => <button key={value} type="button" className={planeBit === value ? "is-active" : ""} aria-pressed={planeBit === value} onClick={() => setPlaneBit(value)}>{value}</button>)}
              </div>
            </div>
            <canvas ref={canvasRef} className="stego-canvas" aria-label={`${channelLabels[planeChannel]} 通道第 ${planeBit} 位元平面`} />
            <small className="tool-hint">{image.name} · {image.data.width}×{image.data.height}{image.scaled ? "（已縮小預覽，擷取結果可能不完整）" : ""}</small>
          </div>
          <div className="stego-extract">
            <span className="stego-label">LSB 資料擷取</span>
            <div className="checkbox-grid">
              {(["r", "g", "b", "a"] as StegoChannel[]).map((channel) => <label key={channel}><input type="checkbox" checked={channels.includes(channel)} onChange={() => toggleChannel(channel)} />{channelLabels[channel]}</label>)}
              <label><input type="checkbox" checked={msbFirst} onChange={(event) => setMsbFirst(event.target.checked)} />MSB first</label>
            </div>
            <label className="field field--short"><span>位元</span><select value={bit} onChange={(event) => setBit(Number(event.target.value))}>{[0, 1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>bit {value}{value === 0 ? "（LSB）" : ""}</option>)}</select></label>
            {extracted && (
              <>
                <div className="result-block"><span>開頭的可列印文字</span><code>{extracted.text || "（開頭不是可列印文字，試試其他通道組合或位元）"}</code></div>
                <div className="result-block"><span>前 256 BYTES（HEX）</span><code>{extracted.hex}</code></div>
                <div className="button-row">
                  <CopyButton value={extracted.text} label="複製文字" />
                  <button className="ghost-button" type="button" onClick={() => downloadBytes(extracted.bytes, "lsb-extracted.bin")}>下載擷取資料</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Hidden data / embedded files ---------- */

export function HiddenDataTool() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [result, setResult] = useState<{ hits: EmbeddedHit[]; findings: FileFinding[] } | null>(null);
  const [error, setError] = useState("");
  async function inspect(selected: File) {
    try {
      if (selected.size > maxFileSize) throw new Error("檔案超過 10 MB 上限。 ");
      const bytes = new Uint8Array(await selected.arrayBuffer());
      setFile({ name: selected.name, bytes });
      setResult(scanEmbeddedFiles(bytes));
      setError("");
    } catch (cause) { setFile(null); setResult(null); setError(errorMessage(cause, "檔案讀取失敗。 ")); }
  }
  function extract(index: number) {
    if (!file || !result) return;
    const hit = result.hits[index];
    const next = result.hits.slice(index + 1).find((item) => item.offset > hit.offset);
    downloadBytes(file.bytes.slice(hit.offset, next?.offset ?? file.bytes.length), `${file.name}-0x${hit.offset.toString(16)}.${hit.extension}`);
  }
  return (
    <div className="single-workbench">
      <FileDropField onFile={inspect} />
      <p className="tool-hint">類似 binwalk：掃描檔案中每個位置的 Magic Bytes，找出藏在圖片或文件裡的 ZIP、PNG、PDF 等，並檢查 PNG 文字區塊、JPEG 註解與結尾後的多餘資料。</p>
      <ErrorNotice message={error} />
      {file && result && (
        <div className="hidden-report">
          <div className="file-verdict"><span>{file.name} · {file.bytes.length.toLocaleString()} bytes</span><strong>{result.hits.length} 個檔案簽章 · {result.findings.length} 個線索</strong></div>
          {result.hits.length > 0 && (
            <div className="hidden-table">
              <div><span>OFFSET</span><span>類型</span><span /></div>
              {result.hits.map((hit, index) => (
                <div key={`${hit.offset}-${hit.label}`}>
                  <code>0x{hit.offset.toString(16).padStart(6, "0")}（{hit.offset}）</code>
                  <strong>{hit.label}</strong>
                  <button className="ghost-button" type="button" onClick={() => extract(index)}>擷取下載</button>
                </div>
              ))}
            </div>
          )}
          {result.findings.length > 0 && (
            <div className="check-list">
              {result.findings.map((finding, index) => (
                <div key={`${finding.title}-${index}`} className={`check-item check-item--${/額外|Flag|文字|註解/.test(finding.title) ? "warn" : "pass"}`}>
                  <i>{/額外|Flag|文字|註解/.test(finding.title) ? "!" : "i"}</i>
                  <div><strong>{finding.title}{finding.offset !== undefined ? ` · 0x${finding.offset.toString(16)}` : ""}</strong><p>{finding.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
