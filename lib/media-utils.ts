// PNG chunk/CRC repair, EXIF/XMP metadata parsing and audio analysis (WAV parsing, FFT spectrograms, DTMF).
import { crc32, decompressBytes } from "./archive-utils.ts";

function u32be(bytes: Uint8Array, offset: number) { return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0; }
function writeU32be(bytes: Uint8Array, offset: number, value: number) { bytes[offset] = value >>> 24; bytes[offset + 1] = (value >>> 16) & 0xff; bytes[offset + 2] = (value >>> 8) & 0xff; bytes[offset + 3] = value & 0xff; }

/* ---------- PNG ---------- */

export type PngChunk = { type: string; offset: number; length: number; storedCrc: number; actualCrc: number };
export type PngHeader = { width: number; height: number; bitDepth: number; colorType: number; interlace: number };
export type PngReport = { chunks: PngChunk[]; header: PngHeader; truncated: boolean; trailingBytes: number };

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const channelsByColorType: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function parsePng(bytes: Uint8Array): PngReport {
  if (bytes.length < 33 || pngSignature.some((byte, index) => bytes[index] !== byte)) throw new Error("不是 PNG 檔案（缺少 89 50 4E 47 簽章）。 ");
  const chunks: PngChunk[] = [];
  let offset = 8;
  let truncated = false;
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type)) { truncated = true; break; }
    if (offset + 12 + length > bytes.length) { truncated = true; break; }
    chunks.push({ type, offset, length, storedCrc: u32be(bytes, offset + 8 + length), actualCrc: crc32(bytes, offset + 4, offset + 8 + length) });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  if (chunks[0]?.type !== "IHDR") throw new Error("PNG 第一個 chunk 不是 IHDR，檔案可能已損毀。 ");
  const ihdr = chunks[0].offset + 8;
  const header = { width: u32be(bytes, ihdr), height: u32be(bytes, ihdr + 4), bitDepth: bytes[ihdr + 8], colorType: bytes[ihdr + 9], interlace: bytes[ihdr + 12] };
  if (chunks[chunks.length - 1].type !== "IEND") truncated = true;
  return { chunks, header, truncated, trailingBytes: truncated ? 0 : bytes.length - offset };
}

/** Find the width/height whose IHDR CRC matches the stored one — CTF challenges often shrink the height. */
export function bruteforcePngSize(bytes: Uint8Array, report: PngReport, limit = 4096) {
  const ihdr = report.chunks[0];
  const data = bytes.slice(ihdr.offset + 4, ihdr.offset + 8 + ihdr.length);
  const { width, height } = report.header;
  const test = (w: number, h: number) => { writeU32be(data, 4, w); writeU32be(data, 8, h); return crc32(data) === ihdr.storedCrc; };
  for (let h = 1; h <= 16384; h += 1) if (test(width, h)) return { width, height: h };
  for (let w = 1; w <= 16384; w += 1) if (test(w, height)) return { width: w, height };
  for (let w = 1; w <= limit; w += 1) for (let h = 1; h <= limit; h += 1) if (test(w, h)) return { width: w, height: h };
  return null;
}

/** Estimate the real height from the inflated IDAT size (each row is a filter byte plus the packed pixels). */
export async function heightFromIdat(bytes: Uint8Array, report: PngReport) {
  const { width, bitDepth, colorType, interlace } = report.header;
  if (interlace || !channelsByColorType[colorType]) return null;
  const parts = report.chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => bytes.subarray(chunk.offset + 8, chunk.offset + 8 + chunk.length));
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) { joined.set(part, position); position += part.length; }
  try {
    const raw = await decompressBytes(joined, "deflate");
    const rowBytes = 1 + Math.ceil((width * channelsByColorType[colorType] * bitDepth) / 8);
    return Math.floor(raw.length / rowBytes);
  } catch { return null; }
}

/** Rewrite IHDR with a new size and recompute every chunk CRC. */
export function repairPng(bytes: Uint8Array, report: PngReport, size?: { width: number; height: number }) {
  const output = bytes.slice();
  const ihdr = report.chunks[0].offset + 8;
  if (size) { writeU32be(output, ihdr, size.width); writeU32be(output, ihdr + 4, size.height); }
  for (const chunk of report.chunks) writeU32be(output, chunk.offset + 8 + chunk.length, crc32(output, chunk.offset + 4, chunk.offset + 8 + chunk.length));
  return output;
}

/* ---------- EXIF / TIFF ---------- */

export type MetaEntry = { group: string; tag: string; value: string };
export type ImageMetadata = { format: string; entries: MetaEntry[]; gps: { latitude: number; longitude: number } | null; comments: string[]; xmp: string };

const tagNames: Record<string, Record<number, string>> = {
  IFD0: {
    0x010e: "ImageDescription", 0x010f: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x011a: "XResolution", 0x011b: "YResolution", 0x0128: "ResolutionUnit",
    0x0131: "Software", 0x0132: "DateTime", 0x013b: "Artist", 0x013c: "HostComputer", 0x8298: "Copyright",
    0x9c9b: "XPTitle", 0x9c9c: "XPComment", 0x9c9d: "XPAuthor", 0x9c9e: "XPKeywords", 0x9c9f: "XPSubject",
  },
  Exif: {
    0x829a: "ExposureTime", 0x829d: "FNumber", 0x8822: "ExposureProgram", 0x8827: "ISOSpeedRatings", 0x9000: "ExifVersion", 0x9003: "DateTimeOriginal",
    0x9004: "DateTimeDigitized", 0x9010: "OffsetTime", 0x9011: "OffsetTimeOriginal", 0x9201: "ShutterSpeedValue", 0x9202: "ApertureValue", 0x9204: "ExposureBiasValue",
    0x9207: "MeteringMode", 0x9209: "Flash", 0x920a: "FocalLength", 0x927c: "MakerNote", 0x9286: "UserComment", 0xa001: "ColorSpace", 0xa002: "PixelXDimension",
    0xa003: "PixelYDimension", 0xa405: "FocalLengthIn35mmFilm", 0xa420: "ImageUniqueID", 0xa430: "CameraOwnerName", 0xa431: "BodySerialNumber",
    0xa432: "LensSpecification", 0xa433: "LensMake", 0xa434: "LensModel", 0xa435: "LensSerialNumber",
  },
  GPS: {
    0: "GPSVersionID", 1: "GPSLatitudeRef", 2: "GPSLatitude", 3: "GPSLongitudeRef", 4: "GPSLongitude", 5: "GPSAltitudeRef", 6: "GPSAltitude",
    7: "GPSTimeStamp", 12: "GPSSpeedRef", 13: "GPSSpeed", 16: "GPSImgDirectionRef", 17: "GPSImgDirection", 18: "GPSMapDatum", 29: "GPSDateStamp",
  },
};
tagNames.IFD1 = tagNames.IFD0;

const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function parseTiff(tiff: Uint8Array) {
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = tiff[0] === 0x49;
  if (!(little ? tiff[1] === 0x49 : tiff[0] === 0x4d && tiff[1] === 0x4d) || view.getUint16(2, little) !== 42) throw new Error("EXIF 區塊的 TIFF 標頭無效。 ");
  const entries: MetaEntry[] = [];
  const raw: Record<string, Record<number, unknown>> = {};
  const seen = new Set<number>();
  const readIfd = (offset: number, group: string): number => {
    if (offset < 8 || offset + 2 > tiff.length || seen.has(offset)) return 0;
    seen.add(offset);
    const count = view.getUint16(offset, little);
    raw[group] ??= {};
    for (let index = 0; index < count && offset + 2 + index * 12 + 12 <= tiff.length; index += 1) {
      const entry = offset + 2 + index * 12;
      const tag = view.getUint16(entry, little);
      const type = view.getUint16(entry + 2, little);
      const length = view.getUint32(entry + 4, little);
      const size = (typeSizes[type] ?? 1) * length;
      const valueOffset = size <= 4 ? entry + 8 : view.getUint32(entry + 8, little);
      if (valueOffset + size > tiff.length) continue;
      if (group !== "GPS" && (tag === 0x8769 || tag === 0x8825)) { readIfd(view.getUint32(entry + 8, little), tag === 0x8769 ? "Exif" : "GPS"); continue; }
      if (tag === 0xa005) continue;
      const value = readValue(view, tiff, type, length, valueOffset, little, tag);
      raw[group][tag] = value;
      const name = tagNames[group]?.[tag] ?? `0x${tag.toString(16).padStart(4, "0")}`;
      entries.push({ group, tag: name, value: displayValue(value, tag, group) });
    }
    return offset + 2 + count * 12 + 4 <= tiff.length ? view.getUint32(offset + 2 + count * 12, little) : 0;
  };
  const next = readIfd(view.getUint32(4, little), "IFD0");
  if (next) readIfd(next, "IFD1");
  return { entries, raw };
}

type TiffValue = string | number | number[] | Uint8Array;

function readValue(view: DataView, tiff: Uint8Array, type: number, count: number, offset: number, little: boolean, tag: number): TiffValue {
  if (type === 2) return new TextDecoder("utf-8", { fatal: false }).decode(tiff.subarray(offset, offset + count)).replace(/\0+$/, "");
  if (type === 7 || type === 1) {
    const bytes = tiff.slice(offset, offset + count);
    if (tag >= 0x9c9b && tag <= 0x9c9f) return new TextDecoder("utf-16le").decode(bytes).replace(/\0+$/, "");
    if (tag === 0x9286) return new TextDecoder(bytes[0] === 0x55 ? "utf-16le" : "utf-8", { fatal: false }).decode(bytes.subarray(8)).replace(/\0+$/, "").trim();
    if (tag === 0x9000 || tag === 0xa000) return new TextDecoder("latin1").decode(bytes);
    return bytes;
  }
  const values: number[] = [];
  for (let index = 0; index < Math.min(count, 64); index += 1) {
    const at = offset + index * (typeSizes[type] ?? 1);
    if (type === 3) values.push(view.getUint16(at, little));
    else if (type === 4) values.push(view.getUint32(at, little));
    else if (type === 8) values.push(view.getInt16(at, little));
    else if (type === 9) values.push(view.getInt32(at, little));
    else if (type === 5) { const denominator = view.getUint32(at + 4, little); values.push(denominator ? view.getUint32(at, little) / denominator : 0); }
    else if (type === 10) { const denominator = view.getInt32(at + 4, little); values.push(denominator ? view.getInt32(at, little) / denominator : 0); }
    else if (type === 11) values.push(view.getFloat32(at, little));
    else if (type === 12) values.push(view.getFloat64(at, little));
    else values.push(tiff[at]);
  }
  return values.length === 1 ? values[0] : values;
}

function displayValue(value: TiffValue, tag: number, group: string) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) {
    const text = new TextDecoder("latin1").decode(value.subarray(0, 64));
    return /^[\x20-\x7e]+$/.test(text.replace(/\0+$/, "")) ? text.replace(/\0+$/, "") : `${value.length} bytes`;
  }
  const format = (number: number) => (Number.isInteger(number) ? number.toString() : Number(number.toFixed(6)).toString());
  if (group === "Exif" && tag === 0x829a && typeof value === "number" && value > 0 && value < 1) return `1/${Math.round(1 / value)} s`;
  if (group === "GPS" && (tag === 2 || tag === 4) && Array.isArray(value)) return `${format(value[0])}° ${format(value[1])}' ${format(value[2])}"`;
  return Array.isArray(value) ? value.map(format).join(", ") : format(value);
}

function gpsFrom(raw: Record<string, Record<number, unknown>>) {
  const gps = raw.GPS;
  if (!gps || !Array.isArray(gps[2]) || !Array.isArray(gps[4])) return null;
  const toDegrees = (parts: number[]) => parts[0] + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
  let latitude = toDegrees(gps[2] as number[]);
  let longitude = toDegrees(gps[4] as number[]);
  if (gps[1] === "S") latitude = -latitude;
  if (gps[3] === "W") longitude = -longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) };
}

export async function readImageMetadata(bytes: Uint8Array): Promise<ImageMetadata> {
  const result: ImageMetadata = { format: "", entries: [], gps: null, comments: [], xmp: "" };
  const latin1 = new TextDecoder("latin1");
  const utf8 = new TextDecoder("utf-8", { fatal: false });
  const tiffs: Uint8Array[] = [];
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    result.format = "JPEG";
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xff || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { offset += marker === 0xff ? 1 : 2; continue; }
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const segment = bytes.subarray(offset + 4, offset + 2 + length);
      if (marker === 0xe1 && latin1.decode(segment.subarray(0, 6)) === "Exif\0\0") tiffs.push(segment.subarray(6));
      else if (marker === 0xe1 && latin1.decode(segment.subarray(0, 29)) === "http://ns.adobe.com/xap/1.0/\0") result.xmp = utf8.decode(segment.subarray(29));
      else if (marker === 0xfe) result.comments.push(utf8.decode(segment));
      offset += 2 + length;
    }
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    result.format = "PNG";
    const report = parsePng(bytes);
    for (const chunk of report.chunks) {
      const data = bytes.subarray(chunk.offset + 8, chunk.offset + 8 + chunk.length);
      if (chunk.type === "eXIf") tiffs.push(data);
      else if (chunk.type === "tEXt") { const split = data.indexOf(0); result.comments.push(`${latin1.decode(data.subarray(0, split))}: ${latin1.decode(data.subarray(split + 1))}`); }
      else if (chunk.type === "zTXt") {
        const split = data.indexOf(0);
        try { result.comments.push(`${latin1.decode(data.subarray(0, split))}: ${utf8.decode(await decompressBytes(data.subarray(split + 2), "deflate"))}`); } catch { /* corrupt */ }
      } else if (chunk.type === "iTXt") {
        const split = data.indexOf(0);
        const keyword = latin1.decode(data.subarray(0, split));
        const compressed = data[split + 1] === 1;
        let position = split + 3;
        position = data.indexOf(0, position) + 1;
        position = data.indexOf(0, position) + 1;
        let text = data.subarray(position);
        if (compressed) { try { text = await decompressBytes(text, "deflate"); } catch { continue; } }
        if (keyword === "XML:com.adobe.xmp") result.xmp = utf8.decode(text);
        else result.comments.push(`${keyword}: ${utf8.decode(text)}`);
      }
    }
  } else if ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d)) {
    result.format = "TIFF";
    tiffs.push(bytes);
  } else if (latin1.decode(bytes.subarray(0, 4)) === "RIFF" && latin1.decode(bytes.subarray(8, 12)) === "WEBP") {
    result.format = "WebP";
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = latin1.decode(bytes.subarray(offset, offset + 4));
      const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
      const data = bytes.subarray(offset + 8, offset + 8 + size);
      if (type === "EXIF") tiffs.push(latin1.decode(data.subarray(0, 6)) === "Exif\0\0" ? data.subarray(6) : data);
      if (type === "XMP ") result.xmp = utf8.decode(data);
      offset += 8 + size + (size & 1);
    }
  } else throw new Error("只支援 JPEG、PNG、TIFF 與 WebP 圖片。 ");
  for (const tiff of tiffs) {
    const { entries, raw } = parseTiff(tiff);
    result.entries.push(...entries);
    result.gps ??= gpsFrom(raw);
  }
  return result;
}

/** Drop APP1–APP15 and COM segments so a JPEG can be shared without EXIF, GPS or XMP. */
export function stripJpegMetadata(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("目前只支援移除 JPEG 的中繼資料。 ");
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (!((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe)) parts.push(bytes.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  parts.push(bytes.subarray(offset));
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) { output.set(part, position); position += part.length; }
  return output;
}

/** Build an APP1 EXIF segment (big-endian TIFF) with a few IFD0, Exif and GPS fields — used for samples and tests. */
export function buildExifSegment(fields: { make?: string; model?: string; description?: string; dateTimeOriginal?: string; latitude?: number; longitude?: number }) {
  type Field = { tag: number; type: number; count: number; data: Uint8Array };
  const ascii = (tag: number, value: string): Field => { const data = new TextEncoder().encode(`${value}\0`); return { tag, type: 2, count: data.length, data }; };
  const rationals = (tag: number, values: number[]): Field => {
    const data = new Uint8Array(values.length * 8);
    values.forEach((value, index) => { const denominator = 10000; writeU32be(data, index * 8, Math.round(value * denominator)); writeU32be(data, index * 8 + 4, denominator); });
    return { tag, type: 5, count: values.length, data };
  };
  const dms = (value: number) => { const absolute = Math.abs(value); const degrees = Math.floor(absolute); const minutes = Math.floor((absolute - degrees) * 60); return [degrees, minutes, (absolute - degrees - minutes / 60) * 3600]; };
  const pointer = (tag: number): Field => ({ tag, type: 4, count: 1, data: new Uint8Array(4) });
  const ifd0: Field[] = [];
  if (fields.description) ifd0.push(ascii(0x010e, fields.description));
  if (fields.make) ifd0.push(ascii(0x010f, fields.make));
  if (fields.model) ifd0.push(ascii(0x0110, fields.model));
  const exif: Field[] = fields.dateTimeOriginal ? [ascii(0x9003, fields.dateTimeOriginal)] : [];
  const gps: Field[] = fields.latitude !== undefined && fields.longitude !== undefined
    ? [ascii(1, fields.latitude >= 0 ? "N" : "S"), rationals(2, dms(fields.latitude)), ascii(3, fields.longitude >= 0 ? "E" : "W"), rationals(4, dms(fields.longitude))]
    : [];
  if (exif.length) ifd0.push(pointer(0x8769));
  if (gps.length) ifd0.push(pointer(0x8825));
  const ifds = [ifd0, exif, gps].filter((ifd) => ifd.length);
  const ifdSize = (ifd: Field[]) => 2 + ifd.length * 12 + 4 + ifd.reduce((sum, field) => sum + (field.data.length > 4 ? field.data.length + (field.data.length & 1) : 0), 0);
  const offsets: number[] = [];
  let cursor = 8;
  for (const ifd of ifds) { offsets.push(cursor); cursor += ifdSize(ifd); }
  if (exif.length) writeU32be(ifd0.find((field) => field.tag === 0x8769)!.data, 0, offsets[ifds.indexOf(exif)]);
  if (gps.length) writeU32be(ifd0.find((field) => field.tag === 0x8825)!.data, 0, offsets[ifds.indexOf(gps)]);
  const tiff = new Uint8Array(cursor);
  tiff.set([0x4d, 0x4d, 0, 42, 0, 0, 0, 8]);
  ifds.forEach((ifd, ifdIndex) => {
    ifd.sort((a, b) => a.tag - b.tag);
    let at = offsets[ifdIndex];
    let extra = at + 2 + ifd.length * 12 + 4;
    tiff[at] = ifd.length >> 8; tiff[at + 1] = ifd.length & 0xff; at += 2;
    for (const field of ifd) {
      tiff[at] = field.tag >> 8; tiff[at + 1] = field.tag & 0xff; tiff[at + 2] = 0; tiff[at + 3] = field.type; writeU32be(tiff, at + 4, field.count);
      if (field.data.length <= 4) tiff.set(field.data, at + 8);
      else { writeU32be(tiff, at + 8, extra); tiff.set(field.data, extra); extra += field.data.length + (field.data.length & 1); }
      at += 12;
    }
  });
  const length = 2 + 6 + tiff.length;
  const segment = new Uint8Array(2 + length);
  segment.set([0xff, 0xe1, length >> 8, length & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  segment.set(tiff, 10);
  return segment;
}

export function insertJpegSegment(jpeg: Uint8Array, segment: Uint8Array) {
  const output = new Uint8Array(jpeg.length + segment.length);
  output.set(jpeg.subarray(0, 2)); output.set(segment, 2); output.set(jpeg.subarray(2), 2 + segment.length);
  return output;
}

/* ---------- Audio ---------- */

export type AudioSamples = { sampleRate: number; samples: Float32Array; channels: number; duration: number };

/** Parse PCM (8/16/24/32-bit) and float WAV files without relying on the browser's decoder; returns a mono mix. */
export function parseWav(bytes: Uint8Array): AudioSamples {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("不是 WAV 檔案（缺少 RIFF／WAVE 標頭）。 ");
  let format = 0, channels = 0, sampleRate = 0, bits = 0, dataOffset = -1, dataLength = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true);
    if (tag(offset) === "fmt ") { format = view.getUint16(offset + 8, true); channels = view.getUint16(offset + 10, true); sampleRate = view.getUint32(offset + 12, true); bits = view.getUint16(offset + 22, true); if (format === 0xfffe) format = view.getUint16(offset + 32, true); }
    if (tag(offset) === "data") { dataOffset = offset + 8; dataLength = Math.min(size, bytes.length - dataOffset); break; }
    offset += 8 + size + (size & 1);
  }
  if (dataOffset < 0 || !channels || !sampleRate) throw new Error("WAV 缺少 fmt 或 data 區塊。 ");
  if (!(format === 1 && [8, 16, 24, 32].includes(bits)) && !(format === 3 && (bits === 32 || bits === 64))) throw new Error("只支援 PCM 與 IEEE float WAV；其他格式請改用瀏覽器解碼。 ");
  const stride = (bits / 8) * channels;
  const frames = Math.floor(dataLength / stride);
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const at = dataOffset + frame * stride + channel * (bits / 8);
      if (format === 3) sum += bits === 32 ? view.getFloat32(at, true) : view.getFloat64(at, true);
      else if (bits === 8) sum += (bytes[at] - 128) / 128;
      else if (bits === 16) sum += view.getInt16(at, true) / 32768;
      else if (bits === 24) sum += (((bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)) << 8) >> 8) / 8388608;
      else sum += view.getInt32(at, true) / 2147483648;
    }
    samples[frame] = sum / channels;
  }
  return { sampleRate, samples, channels, duration: frames / sampleRate };
}

export function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => { for (let index = 0; index < 4; index += 1) bytes[offset + index] = value.charCodeAt(index); };
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  return bytes;
}

/** In-place iterative radix-2 FFT. */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wr = Math.cos(angle), wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1, ci = 0;
      for (let k = 0; k < size / 2; k += 1) {
        const a = start + k, b = a + size / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const next = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = next;
      }
    }
  }
}

/** Short-time Fourier transform: returns columns of dB magnitudes (low frequency first), capped to maxColumns. */
export function spectrogram(samples: Float32Array, fftSize = 1024, maxColumns = 1600) {
  const hop = Math.max(fftSize / 4, Math.ceil((samples.length - fftSize) / maxColumns));
  const columns = Math.max(1, Math.floor((samples.length - fftSize) / hop) + 1);
  const bins = fftSize / 2;
  const data = new Float32Array(columns * bins);
  const window = Float32Array.from({ length: fftSize }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (fftSize - 1)));
  const re = new Float32Array(fftSize), im = new Float32Array(fftSize);
  for (let column = 0; column < columns; column += 1) {
    const start = column * hop;
    for (let index = 0; index < fftSize; index += 1) { re[index] = (samples[start + index] ?? 0) * window[index]; im[index] = 0; }
    fft(re, im);
    for (let bin = 0; bin < bins; bin += 1) data[column * bins + bin] = 10 * Math.log10((re[bin] ** 2 + im[bin] ** 2) / fftSize + 1e-12);
  }
  return { data, columns, bins, hop };
}

/** Peak frequency of the whole signal, useful for spotting a carrier tone. */
export function dominantFrequency(samples: Float32Array, sampleRate: number) {
  const { data, columns, bins } = spectrogram(samples, 4096, 200);
  const totals = new Float32Array(bins);
  for (let column = 0; column < columns; column += 1) for (let bin = 1; bin < bins; bin += 1) totals[bin] += 10 ** (data[column * bins + bin] / 10);
  let best = 1;
  for (let bin = 2; bin < bins; bin += 1) if (totals[bin] > totals[best]) best = bin;
  return (best * sampleRate) / 4096;
}

const dtmfRows = [697, 770, 852, 941];
const dtmfColumns = [1209, 1336, 1477, 1633];
const dtmfKeys = ["123A", "456B", "789C", "*0#D"];

function goertzel(samples: Float32Array, start: number, length: number, frequency: number, sampleRate: number) {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
  let previous = 0, previous2 = 0;
  for (let index = start; index < start + length; index += 1) { const value = samples[index] + coefficient * previous - previous2; previous2 = previous; previous = value; }
  return previous2 ** 2 + previous ** 2 - coefficient * previous * previous2;
}

/** Decode DTMF key presses with Goertzel filters on 25 ms frames; a key must be stable for two frames. */
export function decodeDtmf(samples: Float32Array, sampleRate: number) {
  const frame = Math.round(sampleRate * 0.025);
  let output = "";
  let previous = "";
  let stable = 0;
  let emitted = false;
  for (let start = 0; start + frame <= samples.length; start += frame) {
    let energy = 0;
    for (let index = start; index < start + frame; index += 1) energy += samples[index] ** 2;
    const rows = dtmfRows.map((frequency) => goertzel(samples, start, frame, frequency, sampleRate));
    const cols = dtmfColumns.map((frequency) => goertzel(samples, start, frame, frequency, sampleRate));
    const row = rows.indexOf(Math.max(...rows));
    const col = cols.indexOf(Math.max(...cols));
    // Both tones must dominate their group and carry a meaningful share of the frame's energy.
    const dominant = rows.every((value, index) => index === row || value * 6 < rows[row]) && cols.every((value, index) => index === col || value * 6 < cols[col]);
    const strong = energy > 1e-4 * frame && (rows[row] + cols[col]) > energy * frame * 0.05;
    const key = dominant && strong ? dtmfKeys[row][col] : "";
    if (key && key === previous) { stable += 1; if (stable >= 1 && !emitted) { output += key; emitted = true; } }
    else { stable = 0; emitted = false; }
    previous = key;
  }
  return output;
}

export function synthesizeDtmf(keys: string, sampleRate = 8000, toneSeconds = 0.12, gapSeconds = 0.08) {
  const tone = Math.round(sampleRate * toneSeconds), gap = Math.round(sampleRate * gapSeconds);
  const samples = new Float32Array(keys.length * (tone + gap) + gap);
  [...keys].forEach((key, keyIndex) => {
    const row = dtmfKeys.findIndex((line) => line.includes(key));
    if (row < 0) throw new Error(`無效的 DTMF 按鍵：${key}`);
    const col = dtmfKeys[row].indexOf(key);
    const start = gap + keyIndex * (tone + gap);
    for (let index = 0; index < tone; index += 1) {
      const time = index / sampleRate;
      samples[start + index] = 0.45 * Math.sin(2 * Math.PI * dtmfRows[row] * time) + 0.45 * Math.sin(2 * Math.PI * dtmfColumns[col] * time);
    }
  });
  return samples;
}
