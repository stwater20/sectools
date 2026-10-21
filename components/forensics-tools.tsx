"use client";

import { useT } from "@/components/locale";
import { useEffect, useRef, useState } from "react";
import { CopyButton, ErrorNotice, FileDropField } from "@/components/tool-ui";
import { downloadBytes, errorMessage, maxFileSize, SampleButton } from "@/components/ctf-tools";
import {
  bruteforcePngSize,
  buildExifSegment,
  decodeDtmf,
  dominantFrequency,
  encodeWav,
  heightFromIdat,
  insertJpegSegment,
  parsePng,
  parseWav,
  readImageMetadata,
  repairPng,
  spectrogram,
  stripJpegMetadata,
  synthesizeDtmf,
  type AudioSamples,
  type ImageMetadata,
  type PngReport,
} from "@/lib/media-utils";

async function readFileBytes(file: File) {
  if (file.size > maxFileSize) throw new Error("檔案超過 10 MB 上限。 ");
  return new Uint8Array(await file.arrayBuffer());
}

async function canvasBytes(canvas: HTMLCanvasElement, type: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) throw new Error("瀏覽器無法產生範例圖片。 ");
  return new Uint8Array(await blob.arrayBuffer());
}

/* ---------- PNG CRC / size repair ---------- */

type PngState = { name: string; bytes: Uint8Array; report: PngReport; suggestion: { width: number; height: number } | null; idatHeight: number | null };

export function PngRepairTool() { const t = useT();
  const [state, setState] = useState<PngState | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [fixed, setFixed] = useState<Uint8Array | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  async function load(name: string, bytes: Uint8Array) {
    try {
      const report = parsePng(bytes);
      const ihdrBad = report.chunks[0].storedCrc !== report.chunks[0].actualCrc;
      const suggestion = ihdrBad ? bruteforcePngSize(bytes, report) : null;
      const idatHeight = await heightFromIdat(bytes, report);
      setState({ name, bytes, report, suggestion, idatHeight });
      const target = suggestion ?? (idatHeight && idatHeight > report.header.height ? { width: report.header.width, height: idatHeight } : report.header);
      setWidth(target.width); setHeight(target.height); setFixed(null); setError("");
    } catch (cause) { setState(null); setFixed(null); setError(errorMessage(cause, t("檔案讀取失敗。 "))); }
  }
  async function sample() {
    const canvas = document.createElement("canvas");
    canvas.width = 360; canvas.height = 160;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff8f1"; context.fillRect(0, 0, 360, 160);
    context.fillStyle = "#28566e"; context.font = "bold 22px sans-serif"; context.fillText("Nothing here…", 20, 50);
    context.fillStyle = "#e2702e"; context.fillText("flag{png_height_fixed}", 20, 130);
    const bytes = await canvasBytes(canvas, "image/png");
    // Shrink the height in IHDR without updating its CRC, like a typical CTF challenge.
    bytes[20] = 0; bytes[21] = 0; bytes[22] = 0; bytes[23] = 80;
    await load("challenge.png", bytes);
  }
  async function repair() {
    if (!state) return;
    try {
      const output = repairPng(state.bytes, state.report, { width, height });
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(output)], { type: "image/png" }));
      const canvas = canvasRef.current!;
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      bitmap.close();
      setFixed(output); setError("");
    } catch { setFixed(null); setError(t("無法以這個尺寸解碼圖片，請確認寬高是否正確。 ")); }
  }
  const ihdr = state?.report.chunks[0];
  return (
    <div className="single-workbench">
      <FileDropField onFile={async (file) => { try { await load(file.name, await readFileBytes(file)); } catch (cause) { setError(errorMessage(cause, t("檔案讀取失敗。 "))); } }} accept="image/png" />
      <div className="button-row"><SampleButton onClick={sample} /></div>
      <ErrorNotice message={error} />
      {state && ihdr && (
        <div className="hidden-report">
          <div className={`file-verdict ${ihdr.storedCrc !== ihdr.actualCrc ? "is-mismatch" : ""}`}>
            <span>{state.name} · {state.report.header.width} × {state.report.header.height} · {t("bit depth")} {state.report.header.bitDepth} · {t("color type")} {state.report.header.colorType}</span>
            <strong>{ihdr.storedCrc === ihdr.actualCrc ? t("IHDR CRC 正確") : t("IHDR CRC 錯誤：寬高可能被竄改")}</strong>
            {state.suggestion && <p>{t("暴力搜尋找到符合原始 CRC 的尺寸：{0} × {1}", state.suggestion.width, state.suggestion.height)}</p>}
          </div>
          <div className="check-list">
            {state.idatHeight !== null && state.idatHeight !== state.report.header.height && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("IDAT 資料量對應的高度是 {0}", state.idatHeight)}</strong><p>{t("影像資料比 IHDR 宣告的多或少，即使 CRC 正確也可能被改過高度。")}</p></div></div>}
            {state.report.truncated && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("PNG 沒有正常結束")}</strong><p>{t("找不到 IEND 或 chunk 被截斷。")}</p></div></div>}
            {state.report.trailingBytes > 0 && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("IEND 之後有 {0} bytes 額外資料", state.report.trailingBytes)}</strong><p>{t("可用隱藏資料掃描器擷取。")}</p></div></div>}
          </div>
          <div className="zip-table png-table">
            <div><span>CHUNK</span><span>OFFSET</span><span>{t("長度")}</span><span>CRC</span></div>
            {state.report.chunks.map((chunk) => (
              <div key={chunk.offset}>
                <strong>{chunk.type}</strong>
                <code>0x{chunk.offset.toString(16)}</code>
                <code>{chunk.length.toLocaleString()}</code>
                <span className={`zip-status zip-status--${chunk.storedCrc === chunk.actualCrc ? "plain" : "encrypted"}`}>{chunk.storedCrc === chunk.actualCrc ? t("正確") : t("錯誤")}</span>
              </div>
            ))}
          </div>
          <div className="cipher-options">
            <label className="field"><span>{t("寬度")}</span><input type="number" min="1" max="65535" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
            <label className="field"><span>{t("高度")}</span><input type="number" min="1" max="65535" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label>
          </div>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={repair}>{t("修復並預覽")}</button>
            {fixed && <button className="ghost-button" type="button" onClick={() => downloadBytes(fixed, state.name.replace(/\.png$/i, "") + "-fixed.png")}>{t("下載修復後的 PNG")}</button>}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="stego-canvas" hidden={!fixed} aria-label={t("修復後的圖片")} />
      <p className="tool-hint">{t("CTF 常把 PNG 的高度改小讓 flag 被裁掉，但 IHDR 的 CRC 仍是原始尺寸算出的。本工具會暴力找出符合 CRC 的寬高、比對 IDAT 資料量，並重新計算所有 chunk 的 CRC。")}</p>
    </div>
  );
}

/* ---------- EXIF / metadata viewer ---------- */

export function ExifViewerTool() { const t = useT();
  const [state, setState] = useState<{ name: string; bytes: Uint8Array; meta: ImageMetadata } | null>(null);
  const [error, setError] = useState("");
  async function load(name: string, bytes: Uint8Array) {
    try { setState({ name, bytes, meta: await readImageMetadata(bytes) }); setError(""); }
    catch (cause) { setState(null); setError(errorMessage(cause, t("檔案讀取失敗。 "))); }
  }
  async function sample() {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#e2702e"; context.fillRect(0, 0, 64, 64);
    const jpeg = await canvasBytes(canvas, "image/jpeg");
    const segment = buildExifSegment({ make: "Apple", model: "iPhone 15 Pro", description: "flag{exif_metadata_leaks_location}", dateTimeOriginal: "2026:03:14 15:09:26", latitude: 25.033964, longitude: 121.564468 });
    await load("IMG_0420.jpg", insertJpegSegment(jpeg, segment));
  }
  const meta = state?.meta;
  const flagged = meta ? [...meta.entries.map((entry) => entry.value), ...meta.comments, meta.xmp].filter((value) => /flag\{|ctf\{|[a-z]{2,10}\{[^}]{3,}\}/i.test(value)) : [];
  return (
    <div className="single-workbench">
      <FileDropField onFile={async (file) => { try { await load(file.name, await readFileBytes(file)); } catch (cause) { setError(errorMessage(cause, t("檔案讀取失敗。 "))); } }} accept="image/jpeg,image/png,image/tiff,image/webp" />
      <div className="button-row"><SampleButton onClick={sample} /></div>
      <ErrorNotice message={error} />
      {state && meta && (
        <div className="hidden-report">
          <div className="file-verdict"><span>{state.name} · {meta.format}</span><strong>{meta.entries.length} {t("個 EXIF 欄位")}{meta.gps ? t(" · 含 GPS 位置") : ""}</strong></div>
          {meta.gps && (
            <div className="check-item check-item--fail"><i>!</i><div>
              <strong>{t("GPS 座標")}：{meta.gps.latitude}, {meta.gps.longitude}</strong>
              <p>{t("照片會洩漏拍攝地點。分享前請移除中繼資料。")}{" "}
                <a href={`https://www.openstreetmap.org/?mlat=${meta.gps.latitude}&mlon=${meta.gps.longitude}#map=17/${meta.gps.latitude}/${meta.gps.longitude}`} target="_blank" rel="noopener noreferrer">OpenStreetMap ↗</a>{" · "}
                <a href={`https://www.google.com/maps?q=${meta.gps.latitude},${meta.gps.longitude}`} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
              </p>
            </div></div>
          )}
          {flagged.length > 0 && <div className="check-item check-item--warn"><i>!</i><div><strong>{t("中繼資料裡有疑似 flag 的字串")}</strong><p>{flagged.map((value) => value.slice(0, 200)).join(" · ")}</p></div></div>}
          {meta.entries.length > 0 && (
            <div className="zip-table exif-table">
              <div><span>IFD</span><span>TAG</span><span>{t("值")}</span></div>
              {meta.entries.map((entry, index) => <div key={`${entry.group}-${entry.tag}-${index}`}><code>{entry.group}</code><strong>{entry.tag}</strong><code>{entry.value}</code></div>)}
            </div>
          )}
          {meta.comments.map((comment, index) => <div key={index} className="result-block"><span>{meta.format === "PNG" ? t("PNG 文字區塊") : t("JPEG 註解（COM）")}</span><code>{comment}</code></div>)}
          {meta.xmp && <div className="result-block"><span>XMP</span><code>{meta.xmp.slice(0, 4000)}</code><CopyButton value={meta.xmp} /></div>}
          {!meta.entries.length && !meta.comments.length && !meta.xmp && <p className="tool-hint">{t("沒有找到 EXIF、XMP 或註解。")}</p>}
          {meta.format === "JPEG" && <div className="button-row"><button className="ghost-button" type="button" onClick={() => downloadBytes(stripJpegMetadata(state.bytes), state.name.replace(/\.jpe?g$/i, "") + "-clean.jpg")}>{t("下載移除中繼資料的 JPEG")}</button></div>}
        </div>
      )}
      <p className="tool-hint">{t("支援 JPEG、PNG（eXIf／tEXt／iTXt）、TIFF 與 WebP，讀取相機型號、拍攝時間、GPS、軟體、作者、UserComment 與 XMP。圖片只在瀏覽器解析，OSINT 與 CTF 都適用。")}</p>
    </div>
  );
}

/* ---------- Audio spectrogram & DTMF ---------- */

const heat = [[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]];

function colorAt(value: number) {
  const scaled = Math.max(0, Math.min(1, value)) * (heat.length - 1);
  const index = Math.min(heat.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  return heat[index].map((channel, offset) => channel + (heat[index + 1][offset] - channel) * fraction);
}

async function decodeAudio(bytes: Uint8Array): Promise<AudioSamples> {
  try { return parseWav(bytes); } catch { /* not a plain WAV, let the browser decode it */ }
  const context = new OfflineAudioContext(1, 1, 44100);
  let buffer: AudioBuffer;
  try { buffer = await context.decodeAudioData(bytes.slice().buffer); } catch { throw new Error("無法解碼這個音訊檔，請改用 WAV、MP3、OGG 或 FLAC。 "); }
  const samples = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) samples[index] += data[index] / buffer.numberOfChannels;
  }
  return { sampleRate: buffer.sampleRate, samples, channels: buffer.numberOfChannels, duration: buffer.duration };
}

export function AudioSpectrogramTool() { const t = useT();
  const [audio, setAudio] = useState<(AudioSamples & { name: string; dtmf: string; peak: number }) | null>(null);
  const [fftSize, setFftSize] = useState(1024);
  const [maxFrequency, setMaxFrequency] = useState(0);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  async function load(name: string, bytes: Uint8Array) {
    try {
      const decoded = await decodeAudio(bytes);
      if (decoded.duration > 600) throw new Error("音訊超過 10 分鐘，請先剪成較短的片段。 ");
      setAudio({ ...decoded, name, dtmf: decodeDtmf(decoded.samples, decoded.sampleRate), peak: dominantFrequency(decoded.samples, decoded.sampleRate) });
      setError("");
    } catch (cause) { setAudio(null); setError(errorMessage(cause, t("檔案讀取失敗。 "))); }
  }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;
    const { data, columns, bins } = spectrogram(audio.samples, fftSize);
    const nyquist = audio.sampleRate / 2;
    const shown = maxFrequency && maxFrequency < nyquist ? Math.max(8, Math.round((bins * maxFrequency) / nyquist)) : bins;
    let max = -Infinity;
    for (const value of data) if (value > max) max = value;
    const floor = max - 90;
    canvas.width = columns; canvas.height = shown;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(columns, shown);
    for (let column = 0; column < columns; column += 1) {
      for (let bin = 0; bin < shown; bin += 1) {
        const [r, g, b] = colorAt((data[column * bins + bin] - floor) / (max - floor));
        const at = ((shown - 1 - bin) * columns + column) * 4;
        image.data[at] = r; image.data[at + 1] = g; image.data[at + 2] = b; image.data[at + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [audio, fftSize, maxFrequency]);
  const nyquist = audio ? audio.sampleRate / 2 : 0;
  return (
    <div className="single-workbench">
      <FileDropField onFile={async (file) => { try { await load(file.name, await readFileBytes(file)); } catch (cause) { setError(errorMessage(cause, t("檔案讀取失敗。 "))); } }} accept="audio/*,.wav,.mp3,.ogg,.flac" />
      <div className="button-row"><SampleButton onClick={() => load("dtmf-sample.wav", encodeWav(synthesizeDtmf("8675309#", 8000), 8000))} /></div>
      <ErrorNotice message={error} />
      {audio && (
        <div className="hidden-report">
          <div className="file-verdict"><span>{audio.name} · {audio.sampleRate.toLocaleString()} Hz · {audio.channels} {t("聲道")} · {audio.duration.toFixed(2)} s</span><strong>{t("主要頻率約 {0} Hz", Math.round(audio.peak).toLocaleString())}</strong></div>
          {audio.dtmf && <div className="result-block"><span>{t("DTMF 撥號音解碼")}</span><code>{audio.dtmf}</code><CopyButton value={audio.dtmf} /></div>}
          <div className="cipher-options">
            <label className="field"><span>{t("FFT 大小（頻率解析度）")}</span><select value={fftSize} onChange={(event) => setFftSize(Number(event.target.value))}>{[256, 512, 1024, 2048, 4096].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <label className="field"><span>{t("顯示頻率上限")}</span><select value={maxFrequency} onChange={(event) => setMaxFrequency(Number(event.target.value))}><option value={0}>{t("全部（{0} Hz）", nyquist.toLocaleString())}</option>{[20000, 16000, 8000, 4000, 2000].filter((value) => value < nyquist).map((value) => <option key={value} value={value}>{value.toLocaleString()} Hz</option>)}</select></label>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="stego-canvas spectrogram-canvas" hidden={!audio} aria-label={t("頻譜圖")} />
      {audio && <p className="tool-hint">{t("橫軸是時間，縱軸是頻率（下方為 0 Hz），越亮代表能量越強。")}</p>}
      <p className="tool-hint">{t("CTF 常把文字或 flag 畫在音訊的頻譜圖裡，用聽的聽不出來。本工具在瀏覽器計算頻譜圖並自動解碼 DTMF 電話撥號音；WAV 直接解析，MP3／OGG 等交給瀏覽器解碼。")}</p>
    </div>
  );
}
