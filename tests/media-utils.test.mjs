import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
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
} from "../lib/media-utils.ts";

const fixture = async (name) => new Uint8Array(await readFile(new URL(`./e2e/fixtures/${name}`, import.meta.url)));

test("PNG with a shrunken height is detected, brute-forced and repaired", async () => {
  const bytes = await fixture("short-height.png");
  const report = parsePng(bytes);
  assert.equal(report.header.height, 30);
  assert.notEqual(report.chunks[0].storedCrc, report.chunks[0].actualCrc);
  assert.deepEqual(bruteforcePngSize(bytes, report), { width: 120, height: 60 });
  assert.equal(await heightFromIdat(bytes, report), 60);
  const repaired = parsePng(repairPng(bytes, report, { width: 120, height: 60 }));
  assert.equal(repaired.header.height, 60);
  assert.ok(repaired.chunks.every((chunk) => chunk.storedCrc === chunk.actualCrc));
  // Width tampering is found too.
  const wide = bytes.slice(); wide[19] = 7;
  assert.equal(parsePng(wide).header.width, 7);
  assert.equal(bruteforcePngSize(wide, parsePng(wide)).width, 120);
  assert.throws(() => parsePng(new Uint8Array(40)), /不是 PNG/);
});

test("EXIF from Pillow JPEGs is read, including GPS, UserComment and the COM segment", async () => {
  const meta = await readImageMetadata(await fixture("exif.jpg"));
  const value = (tag) => meta.entries.find((entry) => entry.tag === tag)?.value;
  assert.equal(meta.format, "JPEG");
  assert.equal(value("Make"), "Nikon");
  assert.equal(value("Software"), "GIMP");
  assert.equal(value("ExposureTime"), "1/250 s");
  assert.equal(value("UserComment"), "flag{user_comment}");
  assert.deepEqual(meta.gps, { latitude: -33.856944, longitude: -70.168056 });
  assert.deepEqual(meta.comments, ["jpeg comment here"]);
  const stripped = await readImageMetadata(stripJpegMetadata(await fixture("exif.jpg")));
  assert.equal(stripped.entries.length, 0);
  assert.equal(stripped.comments.length, 0);
});

test("generated EXIF segments round-trip", async () => {
  const segment = buildExifSegment({ make: "Apple", model: "iPhone 15 Pro", description: "flag{exif}", dateTimeOriginal: "2026:03:14 15:09:26", latitude: 25.033964, longitude: 121.564468 });
  const meta = await readImageMetadata(insertJpegSegment(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), segment));
  assert.equal(meta.entries.find((entry) => entry.tag === "ImageDescription").value, "flag{exif}");
  assert.equal(meta.entries.find((entry) => entry.tag === "DateTimeOriginal").value, "2026:03:14 15:09:26");
  assert.deepEqual(meta.gps, { latitude: 25.033964, longitude: 121.564468 });
  await assert.rejects(readImageMetadata(new Uint8Array([1, 2, 3, 4])), /只支援/);
});

test("WAV parsing, spectrogram peaks and DTMF decoding", () => {
  for (const rate of [8000, 44100]) {
    const samples = synthesizeDtmf("0123456789*#ABCD", rate);
    for (let index = 0; index < samples.length; index += 1) samples[index] += Math.sin(index * 12.9898) * 0.03;
    const wav = parseWav(encodeWav(samples, rate));
    assert.equal(wav.sampleRate, rate);
    assert.equal(decodeDtmf(wav.samples, wav.sampleRate), "0123456789*#ABCD");
  }
  const noise = Float32Array.from({ length: 16000 }, (_, index) => Math.sin(index * 78.233) * 0.5);
  assert.equal(decodeDtmf(noise, 8000), "");
  const tone = Float32Array.from({ length: 16000 }, (_, index) => Math.sin((2 * Math.PI * 1000 * index) / 8000));
  assert.equal(dominantFrequency(tone, 8000), 1000);
  const { columns, bins } = spectrogram(tone, 1024);
  assert.equal(bins, 512);
  assert.ok(columns > 10);
  assert.throws(() => parseWav(new Uint8Array(44)), /不是 WAV/);
});
