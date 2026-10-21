"use client";

import { useT } from "@/components/locale";
import { useEffect, useState } from "react";
import { CopyButton, ErrorNotice, FileDropField, TextArea } from "@/components/tool-ui";
import { downloadBytes, errorMessage, maxFileSize, SampleButton } from "@/components/ctf-tools";
import { formatBytes, parseBytes, type ByteFormat } from "@/lib/crypto-utils";
import { createStep, decodeRecipe, encodeRecipe, findOperation, recipeOperations, runRecipe, type RecipeStep, type StepResult } from "@/lib/recipe-utils";
import { disassemblePickle, normalizePhpInput, parsePhpSerialized, phpClasses, phpFromJson, phpToJson, serializePhp, type PickleReport } from "@/lib/serialization-utils";

/* ---------- Recipe (CyberChef-style) ---------- */

const recipeGroups = [...new Set(recipeOperations.map((operation) => operation.group))];
const quickOps = ["from-base64", "from-hex", "url-decode", "rot13", "xor", "inflate"];
const recipeSample = { input: "654a784c79306c4d7279354b54633473534931507a6b6a4d7a4d764d533438767a792f4b4c713446414a74654330413d", ops: ["from-hex", "from-base64", "inflate"] };

function previewText(bytes: Uint8Array) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 300));
  const printable = [...text].filter((character) => /[\p{L}\p{N}\p{P}\p{S}\s]/u.test(character) && character !== "�").length;
  return printable / Math.max(1, [...text].length) > 0.85 ? text : formatBytes(bytes.subarray(0, 96), "hex").replace(/(..)/g, "$1 ").trim();
}

export function RecipeTool() { const t = useT();
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [results, setResults] = useState<StepResult[]>([]);
  const [picker, setPicker] = useState(recipeOperations[0].id);
  const [view, setView] = useState<ByteFormat>("text");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const loadFromHash = () => {
      const match = window.location.hash.match(/recipe=([A-Za-z0-9_-]+)/);
      if (!match) return;
      try { setSteps(decodeRecipe(match[1])); setError(""); } catch (cause) { setError(errorMessage(cause, "處理失敗。 ")); }
    };
    const timer = window.setTimeout(loadFromHash, 0);
    window.addEventListener("hashchange", loadFromHash);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", loadFromHash); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    runRecipe(new TextEncoder().encode(input), steps).then((next) => {
      if (cancelled) return;
      setResults(next);
      setShareUrl(steps.length ? `${window.location.origin}${window.location.pathname}#recipe=${encodeRecipe(steps)}` : "");
    });
    return () => { cancelled = true; };
  }, [input, steps]);
  const update = (index: number, change: Partial<RecipeStep>) => setSteps((current) => current.map((step, position) => (position === index ? { ...step, ...change } : step)));
  const move = (index: number, delta: number) => setSteps((current) => {
    const next = current.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const add = (id: string) => setSteps((current) => [...current, createStep(id)]);
  const last = results.length ? results[results.length - 1] : null;
  const finalBytes = steps.length ? last?.output ?? null : new TextEncoder().encode(input);
  const finalText = finalBytes ? formatBytes(finalBytes, view) : "";
  const failed = results.findIndex((result) => result.error);
  return (
    <div className="single-workbench">
      <TextArea label={t("輸入")} value={input} onChange={setInput} rows={5} placeholder={t("貼上要處理的資料…")} />
      <div className="recipe-add">
        <label className="field"><span>{t("加入操作")}</span>
          <select value={picker} onChange={(event) => setPicker(event.target.value)}>
            {recipeGroups.map((group) => <optgroup key={group} label={t(group)}>{recipeOperations.filter((operation) => operation.group === group).map((operation) => <option key={operation.id} value={operation.id}>{t(operation.label)}</option>)}</optgroup>)}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={() => add(picker)}>{t("加入")}</button>
        <SampleButton onClick={() => { setInput(recipeSample.input); setSteps(recipeSample.ops.map(createStep)); setView("text"); }} />
      </div>
      <div className="recipe-quick" role="group" aria-label={t("常用操作")}>
        {quickOps.map((id) => <button key={id} type="button" className="ghost-button" onClick={() => add(id)}>+ {t(findOperation(id)!.label)}</button>)}
      </div>
      <ErrorNotice message={error} />
      {steps.length > 0 && (
        <ol className="recipe-steps">
          {steps.map((step, index) => {
            const operation = findOperation(step.op)!;
            const result = results[index];
            return (
              <li key={index} className={`${step.disabled ? "is-disabled" : ""} ${result?.error ? "is-error" : ""}`}>
                <div className="recipe-step__head">
                  <span className="recipe-step__index">{index + 1}</span>
                  <strong>{t(operation.label)}</strong>
                  <span className="recipe-step__actions">
                    <button type="button" className="ghost-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t("上移")}>↑</button>
                    <button type="button" className="ghost-button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={t("下移")}>↓</button>
                    <button type="button" className="ghost-button" onClick={() => update(index, { disabled: !step.disabled })}>{step.disabled ? t("啟用") : t("停用")}</button>
                    <button type="button" className="ghost-button" onClick={() => setSteps((current) => current.filter((_, position) => position !== index))} aria-label={t("移除")}>✕</button>
                  </span>
                </div>
                {operation.args.length > 0 && (
                  <div className="recipe-step__args">
                    {operation.args.map((arg) => (
                      <label key={arg.name} className="field"><span>{t(arg.label)}</span>
                        {arg.type === "select"
                          ? <select value={step.args[arg.name]} onChange={(event) => update(index, { args: { ...step.args, [arg.name]: event.target.value } })}>{arg.options!.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select>
                          : <input type={arg.type === "number" ? "number" : "text"} value={step.args[arg.name]} onChange={(event) => update(index, { args: { ...step.args, [arg.name]: event.target.value } })} spellCheck={false} />}
                      </label>
                    ))}
                  </div>
                )}
                {result && (result.error
                  ? <p className="recipe-step__error">{t(result.error)}</p>
                  : result.output && <code className="recipe-step__preview">{result.output.length.toLocaleString()} bytes · {previewText(result.output)}</code>)}
              </li>
            );
          })}
        </ol>
      )}
      {failed >= 0 && <p className="tool-hint">{t("第 {0} 步失敗，後續步驟沒有執行。", failed + 1)}</p>}
      <TextArea label={t("最終輸出")} value={finalText} onChange={() => undefined} rows={5} placeholder={t("結果會顯示在這裡")} />
      <div className="recipe-add">
        <label className="field"><span>{t("輸出格式")}</span>
          <select value={view} onChange={(event) => setView(event.target.value as ByteFormat)}><option value="text">{t("文字（UTF-8）")}</option><option value="hex">Hex</option><option value="base64">Base64</option></select>
        </label>
        <CopyButton value={finalText} />
        {finalBytes && <button className="ghost-button" type="button" onClick={() => downloadBytes(finalBytes, "recipe-output.bin")}>{t("下載 bytes")}</button>}
        <CopyButton value={shareUrl} label={t("複製分享連結")} />
      </div>
      <p className="tool-hint">{t("像 CyberChef 一樣把操作串成 Recipe，每一步都會即時顯示中間結果。分享連結只包含 Recipe 步驟與參數，不包含你的輸入資料。")}</p>
    </div>
  );
}

/* ---------- PHP serialize ---------- */

const phpSample = "O%3A4%3A%22User%22%3A3%3A%7Bs%3A4%3A%22name%22%3Bs%3A5%3A%22guest%22%3Bs%3A7%3A%22isAdmin%22%3Bb%3A0%3Bs%3A4%3A%22tags%22%3Ba%3A2%3A%7Bi%3A0%3Bs%3A6%3A%22reader%22%3Bi%3A1%3Bs%3A5%3A%22caf%C3%A9%22%3B%7D%7D";

export function PhpSerializeTool() { const t = useT();
  const [input, setInput] = useState("");
  const [json, setJson] = useState("");
  const [info, setInfo] = useState<{ classes: string[]; decoded: string } | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  function parse(value = input) {
    try {
      const normalized = normalizePhpInput(value);
      const parsed = parsePhpSerialized(normalized.text);
      setJson(phpToJson(parsed));
      setInfo({ classes: phpClasses(parsed), decoded: normalized.decoded });
      setOutput(""); setError("");
    } catch (cause) { setJson(""); setInfo(null); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  function rebuild() {
    try { setOutput(serializePhp(phpFromJson(json))); setError(""); } catch (cause) { setOutput(""); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  const base64 = output ? formatBytes(new TextEncoder().encode(output), "base64") : "";
  return (
    <div className="single-workbench">
      <div className="workbench-grid">
        <div>
          <TextArea label={t("serialize() 資料")} value={input} onChange={setInput} rows={8} placeholder={'O:4:"User":1:{s:4:"name";s:5:"guest";}'} />
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => parse()}>{t("解析資料")}</button>
            <SampleButton onClick={() => { setInput(phpSample); parse(phpSample); }} />
          </div>
          {info && (
            <p className="tool-hint">
              {info.decoded && <>{t("已自動 {0}。", info.decoded)} </>}
              {info.classes.length ? t("包含類別：{0}。檢查這些類別的 __wakeup、__destruct、__toString 是否有危險行為。", info.classes.join(", ")) : t("沒有物件，只有純資料。")}
            </p>
          )}
        </div>
        <div>
          <TextArea label={t("JSON（可編輯）")} value={json} onChange={setJson} rows={12} placeholder={t("解析後的結構會顯示在這裡")} />
          <div className="button-row"><button className="primary-button" type="button" onClick={rebuild} disabled={!json}>{t("重新序列化")}</button></div>
        </div>
      </div>
      <ErrorNotice message={error} />
      {output && <>
        <div className="result-block"><span>SERIALIZED</span><code>{output}</code><CopyButton value={output} /></div>
        <div className="result-block"><span>URL ENCODED</span><code>{encodeURIComponent(output)}</code><CopyButton value={encodeURIComponent(output)} /></div>
        <div className="result-block"><span>BASE64</span><code>{base64}</code><CopyButton value={base64} /></div>
      </>}
      <p className="tool-hint">{t("物件以 \"__class__\" 表示類別名稱；protected 屬性名稱是 \\u0000*\\u0000name，private 是 \\u0000類別\\u0000name。重新序列化時會以 UTF-8 bytes 重新計算每個字串長度，避免手動修改 s:長度 出錯。請只用於授權測試與 CTF。")}</p>
    </div>
  );
}

/* ---------- Python pickle ---------- */

const pickleSample = "gASVHQAAAAAAAACMBXBvc2l4lIwGc3lzdGVtlJOUjAJpZJSFlFKULg==";

export function PickleTool() { const t = useT();
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<ByteFormat>("base64");
  const [report, setReport] = useState<PickleReport | null>(null);
  const [error, setError] = useState("");
  function run(bytes: Uint8Array) {
    try { setReport(disassemblePickle(bytes)); setError(""); } catch (cause) { setReport(null); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  function analyze(value = input, valueFormat = format) {
    try { run(parseBytes(value, valueFormat)); } catch (cause) { setReport(null); setError(errorMessage(cause, t("處理失敗。 "))); }
  }
  async function loadFile(file: File) {
    if (file.size > maxFileSize) { setError(t("檔案超過 10 MB 上限。 ")); return; }
    run(new Uint8Array(await file.arrayBuffer()));
  }
  const high = report?.imports.filter((item) => item.risk === "high") ?? [];
  const listing = report ? report.ops.map((op) => `${op.offset.toString().padStart(6)}: ${op.name.padEnd(16)} ${op.arg}`).join("\n") : "";
  const riskLabel = { high: t("高風險"), medium: t("需檢查"), low: t("常見") };
  return (
    <div className="single-workbench">
      <FileDropField onFile={loadFile} accept=".pkl,.pickle,.pt,.bin,application/octet-stream" />
      <div className="workbench-grid">
        <div>
          <TextArea label={t("Pickle 資料")} value={input} onChange={setInput} rows={5} placeholder="gASV…" />
        </div>
        <div>
          <label className="field"><span>{t("輸入格式")}</span><select value={format} onChange={(event) => setFormat(event.target.value as ByteFormat)}><option value="base64">Base64</option><option value="hex">Hex</option></select></label>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={() => analyze()}>{t("靜態分析")}</button>
            <SampleButton onClick={() => { setInput(pickleSample); setFormat("base64"); analyze(pickleSample, "base64"); }} />
          </div>
        </div>
      </div>
      <ErrorNotice message={error} />
      {report && (
        <div className="hidden-report">
          <div className={`file-verdict ${high.length ? "is-mismatch" : ""}`}>
            <span>{t("Protocol {0} · {1} 個 opcode · {2} 次呼叫", report.protocol, report.ops.length.toLocaleString(), report.calls)}</span>
            <strong>{high.length ? t("危險：載入時會呼叫 {0}", high.map((item) => `${item.module}.${item.name}`).join(", ")) : report.imports.length ? t("沒有發現已知危險的匯入") : t("沒有任何匯入，只有純資料")}</strong>
            {!report.complete && <p>{t("找不到 STOP opcode，資料可能被截斷。")}</p>}
          </div>
          {report.imports.length > 0 && (
            <div className="zip-table pickle-table">
              <div><span>OFFSET</span><span>{t("匯入")}</span><span>{t("風險")}</span></div>
              {report.imports.map((item, index) => (
                <div key={`${item.offset}-${index}`}>
                  <code>{item.offset}</code>
                  <strong>{item.module}.{item.name}</strong>
                  <span className={`zip-status zip-status--${item.risk === "high" ? "encrypted" : item.risk === "medium" ? "pseudo" : "plain"}`}>{riskLabel[item.risk]}</span>
                </div>
              ))}
            </div>
          )}
          <div className="result-block"><span>{t("反組譯（類似 pickletools.dis）")}</span><pre className="pickle-listing">{listing}</pre><CopyButton value={listing} /></div>
        </div>
      )}
      <p className="tool-hint">{t("只逐一解析 opcode，不會執行任何程式碼。pickle.load 會呼叫 GLOBAL／STACK_GLOBAL 匯入的函式（REDUCE），所以不可信任的 pickle、PyTorch .pt 或模型檔載入前請先檢查這裡列出的匯入。")}</p>
    </div>
  );
}
