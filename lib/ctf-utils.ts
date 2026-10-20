// Pure helpers for the CTF tools. Everything here runs offline in the browser and in Node tests.

const englishFrequency = [8.17, 1.49, 2.78, 4.25, 12.7, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.1, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07];
const maxOutput = 2_000_000;

function lettersOnly(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

function chiSquared(counts: number[], total: number) {
  if (!total) return Number.POSITIVE_INFINITY;
  return counts.reduce((sum, count, index) => {
    const expected = (englishFrequency[index] / 100) * total;
    return sum + ((count - expected) ** 2) / expected;
  }, 0);
}

function letterCounts(value: string) {
  const counts = new Array(26).fill(0);
  for (const character of lettersOnly(value)) counts[character.charCodeAt(0) - 65] += 1;
  return counts;
}

const commonBigrams = new Set(["TH", "HE", "IN", "ER", "AN", "RE", "ON", "AT", "EN", "ND", "TI", "ES", "OR", "TE", "OF", "ED", "IS", "IT", "AL", "AR", "ST", "TO", "NT", "NG", "SE", "HA", "AS", "OU", "IO", "LE", "VE", "CO", "ME", "DE", "HI", "RI", "RO", "IC", "NE", "EA", "RA", "CE"]);
const commonTrigrams = new Set(["THE", "AND", "ING", "ION", "ENT", "HER", "FOR", "THA", "NTH", "INT", "ERE", "TIO", "TER", "EST", "ERS", "ATI", "HAT", "ATE", "ALL", "ETH", "HES", "VER", "HIS", "OFT", "ITH", "RES", "ARE", "RED", "NCE", "OVE", "WAS", "YOU", "NOT", "OUR", "ESS", "COM", "CON", "ONE", "AST", "IST"]);

const commonWords = ["the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from", "they", "say", "her", "she", "will", "one", "all", "would", "there", "their", "what", "out", "about", "who", "get", "which", "when", "make", "can", "like", "time", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "are", "was", "were", "been", "has", "had", "did", "does", "where", "secret", "flag", "key", "password", "message", "cipher", "attack", "night", "before", "should", "must", "never", "every", "under", "while", "through", "between", "against"];
const wordPattern = new RegExp(commonWords.sort((x, y) => y.length - x.length).join("|"), "g");
const commonWordSet = new Set([...commonWords, "a", "i", "of", "to", "in", "it", "is", "be", "as", "at", "so", "we", "he", "by", "or", "on", "do", "if", "me", "my", "up", "an", "go", "no", "us", "am", "dawn", "noon", "park", "meet", "help"]);

/** Lower is more English-like. Combines letter log-likelihood, common n-grams and common words, so it also ranks transposition ciphers. */
export function englishScore(value: string) {
  let penalty = 0;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) penalty += 50;
    else if (code > 126 && code < 160) penalty += 50;
  }
  const letters = lettersOnly(value);
  const total = letters.length;
  if (!total) return 1000 + penalty;
  let logCost = 0;
  for (const character of letters) logCost -= Math.log(englishFrequency[character.charCodeAt(0) - 65] / 100);
  let bigrams = 0;
  let trigrams = 0;
  for (let index = 0; index < total - 1; index += 1) {
    if (commonBigrams.has(letters.slice(index, index + 2))) bigrams += 1;
    if (index < total - 2 && commonTrigrams.has(letters.slice(index, index + 3))) trigrams += 1;
  }
  // With spaces, credit only whole common words; without spaces, fall back to substring matches.
  const tokens = value.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const wordLetters = tokens.length >= 3
    ? tokens.filter((token) => commonWordSet.has(token)).reduce((sum, token) => sum + token.length, 0)
    : (letters.toLowerCase().match(wordPattern) ?? []).reduce((sum, word) => sum + word.length, 0);
  const letterRatio = value.length ? total / value.length : 0;
  return (logCost / total) * 25
    - (total > 1 ? (bigrams / (total - 1)) * 60 : 0)
    - (total > 2 ? (trigrams / (total - 2)) * 150 : 0)
    - (wordLetters / total) * 60
    + penalty + (letterRatio < 0.5 ? 40 : 0)
    - (/flag\{|ctf\{/i.test(value) ? 30 : 0);
}

function shiftLetter(character: string, shift: number) {
  const code = character.charCodeAt(0);
  const base = code >= 97 ? 97 : 65;
  return String.fromCharCode(((code - base + shift) % 26 + 26) % 26 + base);
}

/* ---------- Vigenère ---------- */

export function vigenere(value: string, key: string, decrypt = false) {
  const shifts = lettersOnly(key).split("").map((character) => character.charCodeAt(0) - 65);
  if (!shifts.length) throw new Error("Key 至少需要一個英文字母。 ");
  let index = 0;
  return value.replace(/[a-z]/gi, (character) => {
    const shift = shifts[index % shifts.length] * (decrypt ? -1 : 1);
    index += 1;
    return shiftLetter(character, shift);
  });
}

export function indexOfCoincidence(value: string) {
  const counts = letterCounts(value);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total < 2) return 0;
  return counts.reduce((sum, count) => sum + count * (count - 1), 0) / (total * (total - 1));
}

export type VigenereCandidate = { key: string; keyLength: number; plaintext: string; score: number };

export function crackVigenere(value: string, maxKeyLength = 20): VigenereCandidate[] {
  const letters = lettersOnly(value);
  if (letters.length < 20) throw new Error("密文至少需要 20 個英文字母才能統計分析。 ");
  // Keep at least ~7 letters per column; shorter columns give noisy, inflated IC values.
  const limit = Math.max(1, Math.min(maxKeyLength, Math.floor(letters.length / 7)));
  const columnsOf = (length: number) => Array.from({ length }, (_, column) => {
    let slice = "";
    for (let index = column; index < letters.length; index += length) slice += letters[index];
    return slice;
  });
  const lengths = Array.from({ length: limit }, (_, index) => {
    const columns = columnsOf(index + 1);
    return { length: index + 1, ic: columns.reduce((sum, column) => sum + indexOfCoincidence(column), 0) / columns.length };
  });
  const bestIc = Math.max(...lengths.map((item) => item.ic));
  // Multiples of the true length score as well as the true length, so try the shortest strong lengths plus the top IC values.
  const strong = lengths.filter((item) => item.ic >= Math.min(0.058, bestIc * 0.85)).slice(0, 3).map((item) => item.length);
  const top = [...lengths].sort((a, b) => b.ic - a.ic).slice(0, 4).map((item) => item.length);
  // A peak at 12 often means the key is 6, 4, 3 or 2, so try the divisors of the strongest lengths too.
  const divisors = top.flatMap((length) => Array.from({ length }, (_, index) => index + 1).filter((size) => length % size === 0));
  const shortlisted = [...new Set([...strong, ...top, ...divisors])].slice(0, 16);
  const score = (key: string) => englishScore(vigenere(value, key, true)) + key.length * 0.8;
  const candidates = shortlisted.map((length) => {
    const key = columnsOf(length).map((slice) => {
      let bestShift = 0;
      let bestChi = Number.POSITIVE_INFINITY;
      for (let shift = 0; shift < 26; shift += 1) {
        const counts = new Array(26).fill(0);
        for (const character of slice) counts[(character.charCodeAt(0) - 65 - shift + 26) % 26] += 1;
        const chi = chiSquared(counts, slice.length);
        if (chi < bestChi) { bestChi = chi; bestShift = shift; }
      }
      return String.fromCharCode(65 + bestShift);
    });
    // Frequency guesses per column are noisy on short texts; refine each key letter against the whole plaintext.
    let best = score(key.join(""));
    for (let pass = 0; pass < 2; pass += 1) {
      for (let position = 0; position < key.length; position += 1) {
        for (let shift = 0; shift < 26; shift += 1) {
          const trial = [...key];
          trial[position] = String.fromCharCode(65 + shift);
          const trialScore = score(trial.join(""));
          if (trialScore < best) { best = trialScore; key[position] = trial[position]; }
        }
      }
    }
    const full = key.join("");
    // A key like LEMONLEMON is the same as LEMON; keep the shortest period.
    const period = Array.from({ length: full.length }, (_, index) => index + 1).find((size) => full.length % size === 0 && full.slice(0, size).repeat(full.length / size) === full) ?? full.length;
    const refined = full.slice(0, period);
    return { key: refined, keyLength: refined.length, plaintext: vigenere(value, refined, true), score: score(refined) };
  });
  const unique = [...new Map(candidates.map((item) => [item.key, item])).values()];
  return unique.sort((a, b) => a.score - b.score || a.keyLength - b.keyLength);
}

/* ---------- Classical ciphers ---------- */

export function atbash(value: string) {
  return value.replace(/[a-z]/gi, (character) => {
    const code = character.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(base + 25 - (code - base));
  });
}

export function rot47(value: string) {
  return value.replace(/[!-~]/g, (character) => String.fromCharCode(33 + ((character.charCodeAt(0) - 33 + 47) % 94)));
}

function modInverse26(value: number) {
  for (let candidate = 1; candidate < 26; candidate += 1) if ((value * candidate) % 26 === 1) return candidate;
  return null;
}

export const affineMultipliers = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];

export function affine(value: string, a: number, b: number, decrypt = false) {
  const inverse = modInverse26(((a % 26) + 26) % 26);
  if (inverse === null) throw new Error("a 必須與 26 互質（1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25）。 ");
  return value.replace(/[a-z]/gi, (character) => {
    const code = character.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    const x = code - base;
    const y = decrypt ? (inverse * (x - b)) % 26 : (a * x + b) % 26;
    return String.fromCharCode(base + ((y % 26) + 26) % 26);
  });
}

export type RankedCandidate = { label: string; text: string; score: number };

export function affineBruteforce(value: string, limit = 10): RankedCandidate[] {
  const results: RankedCandidate[] = [];
  for (const a of affineMultipliers) for (let b = 0; b < 26; b += 1) {
    const text = affine(value, a, b, true);
    results.push({ label: `a=${a}, b=${b}`, text, score: englishScore(text) });
  }
  return results.sort((x, y) => x.score - y.score).slice(0, limit);
}

function railPattern(length: number, rails: number, offset: number) {
  const cycle = 2 * (rails - 1);
  return Array.from({ length }, (_, index) => {
    const position = (index + offset) % cycle;
    return position < rails ? position : cycle - position;
  });
}

export function railFence(value: string, rails: number, decrypt = false, offset = 0) {
  if (!Number.isInteger(rails) || rails < 2) throw new Error("Rails 至少為 2。 ");
  const characters = Array.from(value);
  if (rails >= characters.length) return value;
  const pattern = railPattern(characters.length, rails, offset);
  const order = pattern.map((rail, index) => ({ rail, index })).sort((a, b) => a.rail - b.rail || a.index - b.index).map((item) => item.index);
  if (!decrypt) return order.map((index) => characters[index]).join("");
  const output = new Array<string>(characters.length);
  order.forEach((index, position) => { output[index] = characters[position]; });
  return output.join("");
}

export function railFenceBruteforce(value: string, maxRails = 12): RankedCandidate[] {
  const results: RankedCandidate[] = [];
  const length = Array.from(value).length;
  for (let rails = 2; rails <= Math.min(maxRails, length - 1); rails += 1) {
    for (let offset = 0; offset < 2 * (rails - 1); offset += 1) {
      const text = railFence(value, rails, true, offset);
      results.push({ label: `rails=${rails}${offset ? `, offset=${offset}` : ""}`, text, score: englishScore(text) });
    }
  }
  return results.sort((a, b) => a.score - b.score).slice(0, 10);
}

const baconAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function baconDecode(value: string, variant: 24 | 26 = 26) {
  const cleaned = value.toUpperCase().replace(/[^AB01]/g, "").replace(/0/g, "A").replace(/1/g, "B");
  if (cleaned.length < 5) throw new Error("請輸入以 A/B 或 0/1 表示的 Bacon 密文。 ");
  let output = "";
  for (let index = 0; index + 5 <= cleaned.length; index += 5) {
    const value5 = parseInt(cleaned.slice(index, index + 5).replace(/A/g, "0").replace(/B/g, "1"), 2);
    if (variant === 24) {
      const letters = "ABCDEFGHIKLMNOPQRSTUWXYZ";
      output += letters[value5] ?? "?";
    } else output += baconAlphabet[value5] ?? "?";
  }
  return output;
}

export function baconEncode(value: string) {
  return lettersOnly(value).split("").map((character) => (character.charCodeAt(0) - 65).toString(2).padStart(5, "0").replace(/0/g, "A").replace(/1/g, "B")).join(" ");
}

/* ---------- Morse ---------- */

const morseTable: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", _: "..--.-", '"': ".-..-.", $: "...-..-", "@": ".--.-.", "{": "-.--.", "}": "-.--.-",
};
const morseReverse = Object.fromEntries(Object.entries(morseTable).filter(([key]) => key !== "{" && key !== "}").map(([key, code]) => [code, key]));

export function morseEncode(value: string) {
  return value.toUpperCase().trim().split(/\s+/).map((word) => Array.from(word).map((character) => morseTable[character] ?? "?").join(" ")).join(" / ");
}

export function morseDecode(value: string) {
  const normalized = value.replace(/[·•∙]/g, ".").replace(/[–—_−]/g, "-").trim();
  if (!/[.-]/.test(normalized)) throw new Error("沒有找到點（.）或劃（-）。 ");
  return normalized.split(/\s*(?:\/|\||\s{3,}|\n)\s*/).filter(Boolean).map((word) => word.trim().split(/\s+/).map((code) => morseReverse[code] ?? "?").join("")).join(" ");
}

/* ---------- Base family ---------- */

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base62Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const base91Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\"";

export type BaseEncoding = "base32" | "base58" | "base62" | "ascii85" | "base91";
export const baseEncodings: Array<{ id: BaseEncoding; label: string }> = [
  { id: "base32", label: "Base32 (RFC 4648)" },
  { id: "base58", label: "Base58 (Bitcoin)" },
  { id: "base62", label: "Base62" },
  { id: "ascii85", label: "Ascii85 / Base85" },
  { id: "base91", label: "Base91" },
];

function encodeBase32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += base32Alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += base32Alphabet[(value << (5 - bits)) & 31];
  while (output.length % 8) output += "=";
  return output;
}

function decodeBase32Bytes(value: string) {
  const cleaned = value.toUpperCase().replace(/\s|=+$/g, "");
  if (!/^[A-Z2-7]*$/.test(cleaned)) throw new Error("包含 Base32 以外的字元。 ");
  let bits = 0;
  let current = 0;
  const output: number[] = [];
  for (const character of cleaned) {
    current = (current << 5) | base32Alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) { output.push((current >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(output);
}

function encodeBigBase(bytes: Uint8Array, alphabet: string, keepLeadingZeros: boolean) {
  let number = BigInt(0);
  for (const byte of bytes) number = (number << BigInt(8)) | BigInt(byte);
  const radix = BigInt(alphabet.length);
  let output = "";
  while (number > BigInt(0)) { output = alphabet[Number(number % radix)] + output; number /= radix; }
  if (keepLeadingZeros) for (const byte of bytes) { if (byte !== 0) break; output = alphabet[0] + output; }
  return output || (bytes.length ? alphabet[0] : "");
}

function decodeBigBase(value: string, alphabet: string, keepLeadingZeros: boolean) {
  const cleaned = value.replace(/\s/g, "");
  const radix = BigInt(alphabet.length);
  let number = BigInt(0);
  for (const character of cleaned) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error(`字元「${character}」不在字母表中。 `);
    number = number * radix + BigInt(index);
  }
  const bytes: number[] = [];
  while (number > BigInt(0)) { bytes.unshift(Number(number & BigInt(255))); number >>= BigInt(8); }
  if (keepLeadingZeros) for (const character of cleaned) { if (character !== alphabet[0]) break; bytes.unshift(0); }
  return new Uint8Array(bytes);
}

function encodeAscii85(bytes: Uint8Array) {
  let output = "";
  for (let index = 0; index < bytes.length; index += 4) {
    const chunk = bytes.slice(index, index + 4);
    const padded = new Uint8Array(4);
    padded.set(chunk);
    let number = ((padded[0] << 24) | (padded[1] << 16) | (padded[2] << 8) | padded[3]) >>> 0;
    if (number === 0 && chunk.length === 4) { output += "z"; continue; }
    const digits = new Array(5);
    for (let digit = 4; digit >= 0; digit -= 1) { digits[digit] = String.fromCharCode((number % 85) + 33); number = Math.floor(number / 85); }
    output += digits.slice(0, chunk.length + 1).join("");
  }
  return `<~${output}~>`;
}

function decodeAscii85(value: string) {
  let cleaned = value.replace(/\s/g, "");
  if (cleaned.startsWith("<~")) cleaned = cleaned.slice(2);
  if (cleaned.endsWith("~>")) cleaned = cleaned.slice(0, -2);
  cleaned = cleaned.replace(/z/g, "!!!!!");
  if (!/^[!-u]*$/.test(cleaned)) throw new Error("包含 Ascii85 以外的字元。 ");
  const output: number[] = [];
  for (let index = 0; index < cleaned.length; index += 5) {
    const chunk = cleaned.slice(index, index + 5);
    const padded = chunk.padEnd(5, "u");
    let number = 0;
    for (const character of padded) number = number * 85 + (character.charCodeAt(0) - 33);
    if (number > 0xffffffff) throw new Error("Ascii85 區塊數值超出範圍。 ");
    const bytes = [(number >>> 24) & 255, (number >>> 16) & 255, (number >>> 8) & 255, number & 255];
    output.push(...bytes.slice(0, chunk.length - 1));
  }
  return new Uint8Array(output);
}

function encodeBase91(bytes: Uint8Array) {
  let queue = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    queue |= byte << bits;
    bits += 8;
    if (bits > 13) {
      let value = queue & 8191;
      if (value > 88) { queue >>= 13; bits -= 13; } else { value = queue & 16383; queue >>= 14; bits -= 14; }
      output += base91Alphabet[value % 91] + base91Alphabet[Math.floor(value / 91)];
    }
  }
  if (bits) {
    output += base91Alphabet[queue % 91];
    if (bits > 7 || queue > 90) output += base91Alphabet[Math.floor(queue / 91)];
  }
  return output;
}

function decodeBase91(value: string) {
  let queue = 0;
  let bits = 0;
  let current = -1;
  const output: number[] = [];
  for (const character of value.replace(/\s/g, "")) {
    const digit = base91Alphabet.indexOf(character);
    if (digit < 0) throw new Error(`字元「${character}」不在 Base91 字母表中。 `);
    if (current < 0) { current = digit; continue; }
    current += digit * 91;
    queue |= current << bits;
    bits += (current & 8191) > 88 ? 13 : 14;
    do { output.push(queue & 255); queue >>= 8; bits -= 8; } while (bits > 7);
    current = -1;
  }
  if (current > -1) output.push((queue | (current << bits)) & 255);
  return new Uint8Array(output);
}

export function encodeBase(bytes: Uint8Array, encoding: BaseEncoding) {
  switch (encoding) {
    case "base32": return encodeBase32(bytes);
    case "base58": return encodeBigBase(bytes, base58Alphabet, true);
    case "base62": return encodeBigBase(bytes, base62Alphabet, false);
    case "ascii85": return encodeAscii85(bytes);
    case "base91": return encodeBase91(bytes);
  }
}

export function decodeBase(value: string, encoding: BaseEncoding) {
  if (!value.trim()) throw new Error("請輸入要解碼的字串。 ");
  switch (encoding) {
    case "base32": return decodeBase32Bytes(value);
    case "base58": return decodeBigBase(value, base58Alphabet, true);
    case "base62": return decodeBigBase(value, base62Alphabet, false);
    case "ascii85": return decodeAscii85(value);
    case "base91": return decodeBase91(value);
  }
}

export function bytesToDisplay(bytes: Uint8Array) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const printable = Array.from(text).filter((character) => /[\p{L}\p{N}\p{P}\p{S}\s]/u.test(character) && character !== "�").length;
  return { text, hex: Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(" "), printableRatio: text.length ? printable / Array.from(text).length : 0 };
}

export function detectBaseEncodings(value: string) {
  const results: Array<{ encoding: BaseEncoding; label: string; text: string; printableRatio: number }> = [];
  for (const { id, label } of baseEncodings) {
    try {
      const bytes = decodeBase(value, id);
      if (!bytes.length) continue;
      const display = bytesToDisplay(bytes);
      if (display.printableRatio >= 0.85) results.push({ encoding: id, label, text: display.text, printableRatio: display.printableRatio });
    } catch {
      // Not valid in this alphabet.
    }
  }
  return results.sort((a, b) => b.printableRatio - a.printableRatio);
}

/* ---------- Frequency analysis ---------- */

export function analyzeFrequency(value: string) {
  const counts = letterCounts(value);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) throw new Error("沒有找到英文字母。 ");
  const letters = counts.map((count, index) => ({ letter: String.fromCharCode(65 + index), count, percent: (count / total) * 100, expected: englishFrequency[index] })).sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
  const bigramCounts = new Map<string, number>();
  const cleaned = lettersOnly(value);
  for (let index = 0; index < cleaned.length - 1; index += 1) {
    const bigram = cleaned.slice(index, index + 2);
    bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
  }
  const bigrams = [...bigramCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([bigram, count]) => ({ bigram, count }));
  let bestShift = 0;
  let bestChi = Number.POSITIVE_INFINITY;
  for (let shift = 0; shift < 26; shift += 1) {
    const shifted = counts.map((_, index) => counts[(index + shift) % 26]);
    const chi = chiSquared(shifted, total);
    if (chi < bestChi) { bestChi = chi; bestShift = shift; }
  }
  const ic = indexOfCoincidence(value);
  return {
    total,
    letters,
    bigrams,
    ic,
    chiSquared: chiSquared(counts, total),
    likelyCaesarShift: bestShift,
    verdict: ic > 0.06 ? "IC 接近英文（約 0.066），可能是單表替換（Caesar、Atbash、Affine、替換密碼）或明文。" : ic > 0.045 ? "IC 介於英文與隨機之間，可能是短金鑰的多表替換（如 Vigenère）。" : "IC 接近隨機（約 0.038），可能是長金鑰多表替換、Base 編碼或已加密資料。",
  };
}

/* ---------- RSA ---------- */

export function parseBigIntInput(value: string, name: string) {
  const cleaned = value.trim().replace(/[\s_,]/g, "");
  if (!cleaned) throw new Error(`請輸入 ${name}。 `);
  try {
    if (/^-?0x[0-9a-f]+$/i.test(cleaned)) return BigInt(cleaned);
    if (/^-?\d+$/.test(cleaned)) return BigInt(cleaned);
  } catch {
    // fall through
  }
  throw new Error(`${name} 必須是十進位或 0x 開頭的十六進位整數。 `);
}

function bigAbs(value: bigint) { return value < BigInt(0) ? -value : value; }

function bigGcd(a: bigint, b: bigint) {
  a = bigAbs(a); b = bigAbs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function bigModPow(base: bigint, exponent: bigint, modulus: bigint) {
  if (modulus === BigInt(1)) return BigInt(0);
  let result = BigInt(1);
  base = ((base % modulus) + modulus) % modulus;
  while (exponent > BigInt(0)) {
    if (exponent & BigInt(1)) result = (result * base) % modulus;
    exponent >>= BigInt(1);
    base = (base * base) % modulus;
  }
  return result;
}

function bigModInverse(value: bigint, modulus: bigint) {
  let [oldR, r] = [((value % modulus) + modulus) % modulus, modulus];
  let [oldS, s] = [BigInt(1), BigInt(0)];
  while (r) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR !== BigInt(1)) throw new Error("e 與 φ(n) 不互質，無法計算 d。 ");
  return ((oldS % modulus) + modulus) % modulus;
}

export function integerRoot(value: bigint, degree: bigint) {
  if (value < BigInt(0)) throw new Error("不支援負數開根號。 ");
  if (value < BigInt(2)) return { root: value, exact: true };
  const bits = value.toString(2).length;
  let high = BigInt(1) << BigInt(Math.ceil(bits / Number(degree)) + 1);
  let low = BigInt(0);
  while (low < high) {
    const middle = (low + high + BigInt(1)) / BigInt(2);
    if (middle ** degree <= value) low = middle; else high = middle - BigInt(1);
  }
  return { root: low, exact: low ** degree === value };
}

function isProbablePrime(n: bigint) {
  if (n < BigInt(2)) return false;
  for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]) {
    const bp = BigInt(p);
    if (n === bp) return true;
    if (n % bp === BigInt(0)) return false;
  }
  let d = n - BigInt(1);
  let r = 0;
  while ((d & BigInt(1)) === BigInt(0)) { d >>= BigInt(1); r += 1; }
  for (const a of [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]) {
    let x = bigModPow(BigInt(a), d, n);
    if (x === BigInt(1) || x === n - BigInt(1)) continue;
    let composite = true;
    for (let i = 1; i < r; i += 1) {
      x = (x * x) % n;
      if (x === n - BigInt(1)) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

function trialDivision(n: bigint, limit = 200_000) {
  if (n % BigInt(2) === BigInt(0)) return BigInt(2);
  for (let i = 3; i <= limit; i += 2) {
    const bi = BigInt(i);
    if (bi * bi > n) break;
    if (n % bi === BigInt(0)) return bi;
  }
  return null;
}

function fermatFactor(n: bigint, iterations = 200_000) {
  const start = integerRoot(n, BigInt(2));
  if (start.exact) return start.root;
  let a = start.root;
  a += BigInt(1);
  for (let i = 0; i < iterations; i += 1) {
    const b2 = a * a - n;
    const { root, exact: square } = integerRoot(b2, BigInt(2));
    if (square) return a - root;
    a += BigInt(1);
  }
  return null;
}

function pollardRho(n: bigint, iterations = 300_000) {
  if (n % BigInt(2) === BigInt(0)) return BigInt(2);
  for (let c = BigInt(1); c < BigInt(6); c += BigInt(1)) {
    let x = BigInt(2);
    let y = BigInt(2);
    let d = BigInt(1);
    let product = BigInt(1);
    for (let i = 0; i < iterations && d === BigInt(1); i += 1) {
      x = (x * x + c) % n;
      y = (y * y + c) % n;
      y = (y * y + c) % n;
      product = (product * bigAbs(x - y)) % n;
      if (i % 64 === 63) { d = bigGcd(product, n); product = BigInt(1); }
    }
    if (d === BigInt(1)) d = bigGcd(product, n);
    if (d !== BigInt(1) && d !== n) return d;
  }
  return null;
}

function wienerAttack(e: bigint, n: bigint) {
  // Continued-fraction expansion of e/n; each convergent k/d is a candidate private exponent.
  const terms: bigint[] = [];
  let [numerator, denominator] = [e, n];
  while (denominator && terms.length < 2000) {
    terms.push(numerator / denominator);
    [numerator, denominator] = [denominator, numerator % denominator];
  }
  let [h1, h2] = [BigInt(1), BigInt(0)];
  let [k1, k2] = [BigInt(0), BigInt(1)];
  for (const term of terms) {
    [h1, h2] = [term * h1 + h2, h1];
    [k1, k2] = [term * k1 + k2, k1];
    const k = h1;
    const d = k1;
    if (k === BigInt(0) || (e * d - BigInt(1)) % k !== BigInt(0)) continue;
    const phi = (e * d - BigInt(1)) / k;
    const s = n - phi + BigInt(1);
    const discriminant = s * s - BigInt(4) * n;
    if (discriminant < BigInt(0)) continue;
    const { root, exact } = integerRoot(discriminant, BigInt(2));
    if (exact && (s + root) % BigInt(2) === BigInt(0)) return { d, p: (s + root) / BigInt(2), q: (s - root) / BigInt(2) };
  }
  return null;
}

export function bigintToBytes(value: bigint) {
  if (value < BigInt(0)) throw new Error("明文為負數。 ");
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  return new Uint8Array(hex.match(/../g)?.map((pair) => parseInt(pair, 16)) ?? []);
}

export function bytesToBigint(bytes: Uint8Array) {
  return bytes.length ? BigInt(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`) : BigInt(0);
}

export type RsaInput = { n?: string; e?: string; c?: string; p?: string; q?: string; d?: string };
export type RsaResult = { steps: string[]; p?: bigint; q?: bigint; d?: bigint; phi?: bigint; m?: bigint; text?: string; hex?: string };

export function solveRsa(input: RsaInput): RsaResult {
  const steps: string[] = [];
  const optional = (value: string | undefined, name: string) => value?.trim() ? parseBigIntInput(value, name) : undefined;
  let n = optional(input.n, "n");
  const e = optional(input.e, "e") ?? BigInt(65537);
  const c = optional(input.c, "c");
  let p = optional(input.p, "p");
  let q = optional(input.q, "q");
  let d = optional(input.d, "d");
  if (!input.e?.trim()) steps.push("未輸入 e，使用常見預設值 65537。");
  if (!n && p && q) { n = p * q; steps.push("由 p × q 計算 n。"); }
  if (!n) throw new Error("至少需要 n（或同時提供 p 與 q）。 ");
  if (p && !q) { if (n % p !== BigInt(0)) throw new Error("p 無法整除 n。 "); q = n / p; steps.push("由 n ÷ p 計算 q。"); }
  if (q && !p) { if (n % q !== BigInt(0)) throw new Error("q 無法整除 n。 "); p = n / q; steps.push("由 n ÷ q 計算 p。"); }

  let m: bigint | undefined;
  if (!d && !p && c !== undefined && e <= BigInt(17)) {
    const { root, exact } = integerRoot(c, e);
    if (exact) { m = root; steps.push(`小 e 攻擊：c 是完全 ${e} 次方，m = ∛c（m^e < n，未被模數截斷）。`); }
  }
  if (m === undefined && !d && !p) {
    if (isProbablePrime(n)) {
      p = n; q = BigInt(1);
      steps.push("n 本身是質數，φ(n) = n − 1。");
    } else {
      const small = trialDivision(n);
      if (small) { p = small; steps.push(`試除法找到小質因數 ${small}。`); }
      if (!p) { const fermat = fermatFactor(n); if (fermat) { p = fermat; steps.push("Fermat 分解成功：p 與 q 非常接近。"); } }
      if (!p) { const wiener = wienerAttack(e, n); if (wiener) { ({ d, p, q } = wiener); steps.push("Wiener 攻擊成功：私鑰 d 過小。"); } }
      if (!p) { const rho = pollardRho(n); if (rho) { p = rho; steps.push("Pollard's rho 找到因數。"); } }
      if (!p) throw new Error("無法在瀏覽器的運算上限內分解 n。請到 factordb.com 查詢已知分解，再把 p、q 填回來。 ");
      if (!q) q = n / p;
    }
  }
  let phi: bigint | undefined;
  if (p && q && !d) {
    phi = q === BigInt(1) ? p - BigInt(1) : p === q ? p * (p - BigInt(1)) : (p - BigInt(1)) * (q - BigInt(1));
    d = bigModInverse(e, phi);
    steps.push("計算 φ(n) 與 d = e⁻¹ mod φ(n)。");
  }
  if (m === undefined && c !== undefined && d) { m = bigModPow(c, d, n); steps.push("解密 m = c^d mod n。"); }
  const result: RsaResult = { steps, p, q: q === BigInt(1) ? undefined : q, d, phi, m };
  if (m !== undefined) {
    const bytes = bigintToBytes(m);
    result.hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    result.text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  return result;
}

/* ---------- Brainfuck / Ook! ---------- */

export function ookToBrainfuck(value: string) {
  const tokens = value.match(/Ook[.!?]/g) ?? [];
  if (tokens.length % 2) throw new Error("Ook! 指令數量必須成對。 ");
  const map: Record<string, string> = { "Ook. Ook?": ">", "Ook? Ook.": "<", "Ook. Ook.": "+", "Ook! Ook!": "-", "Ook! Ook.": ".", "Ook. Ook!": ",", "Ook! Ook?": "[", "Ook? Ook!": "]" };
  let output = "";
  for (let index = 0; index < tokens.length; index += 2) output += map[`${tokens[index]} ${tokens[index + 1]}`] ?? "";
  return output;
}

export function runBrainfuck(source: string, input = "", maxSteps = 5_000_000) {
  const code = source.replace(/[^<>+\-.,[\]]/g, "");
  const jumps = new Map<number, number>();
  const stack: number[] = [];
  for (let index = 0; index < code.length; index += 1) {
    if (code[index] === "[") stack.push(index);
    else if (code[index] === "]") {
      const open = stack.pop();
      if (open === undefined) throw new Error(`第 ${index + 1} 個指令的 ] 沒有對應的 [。 `);
      jumps.set(open, index); jumps.set(index, open);
    }
  }
  if (stack.length) throw new Error("有 [ 沒有對應的 ]。 ");
  const tape = new Uint8Array(30_000);
  const inputBytes = new TextEncoder().encode(input);
  let pointer = 0;
  let inputIndex = 0;
  let steps = 0;
  const output: number[] = [];
  for (let ip = 0; ip < code.length; ip += 1) {
    if (++steps > maxSteps) return { output: new TextDecoder().decode(new Uint8Array(output)), steps, halted: false };
    switch (code[ip]) {
      case ">": pointer = (pointer + 1) % tape.length; break;
      case "<": pointer = (pointer - 1 + tape.length) % tape.length; break;
      case "+": tape[pointer] += 1; break;
      case "-": tape[pointer] -= 1; break;
      case ".": output.push(tape[pointer]); if (output.length > maxOutput) throw new Error("輸出超過 2 MB 上限。 "); break;
      case ",": tape[pointer] = inputIndex < inputBytes.length ? inputBytes[inputIndex++] : 0; break;
      case "[": if (!tape[pointer]) ip = jumps.get(ip)!; break;
      case "]": if (tape[pointer]) ip = jumps.get(ip)!; break;
    }
  }
  return { output: new TextDecoder().decode(new Uint8Array(output)), steps, halted: true };
}

/* ---------- JWT forging ---------- */

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeText(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export type JwtForgeAlgorithm = "none" | "HS256" | "HS384" | "HS512";

export function splitJwt(token: string) {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("JWT 至少需要 header 與 payload 兩段。 ");
  const header = JSON.parse(base64UrlDecodeText(parts[0]));
  const payload = JSON.parse(base64UrlDecodeText(parts[1]));
  return { header: JSON.stringify(header, null, 2), payload: JSON.stringify(payload, null, 2) };
}

export async function forgeJwt(headerJson: string, payloadJson: string, algorithm: JwtForgeAlgorithm, secret = "") {
  let header: Record<string, unknown>;
  let payload: unknown;
  try { header = JSON.parse(headerJson); } catch { throw new Error("Header 不是有效的 JSON。 "); }
  try { payload = JSON.parse(payloadJson); } catch { throw new Error("Payload 不是有效的 JSON。 "); }
  header = { ...header, alg: algorithm };
  const encoder = new TextEncoder();
  const signingInput = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(encoder.encode(JSON.stringify(payload)))}`;
  if (algorithm === "none") return `${signingInput}.`;
  const hash = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" }[algorithm];
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput)));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/* ---------- LSB steganography ---------- */

export type StegoChannel = "r" | "g" | "b" | "a";

export function extractLsb(pixels: Uint8ClampedArray | Uint8Array, channels: StegoChannel[], bit = 0, msbFirst = true, maxBytes = 65_536) {
  if (!channels.length) throw new Error("至少選擇一個色彩通道。 ");
  const offsets = channels.map((channel) => ({ r: 0, g: 1, b: 2, a: 3 })[channel]);
  const output: number[] = [];
  let current = 0;
  let count = 0;
  for (let index = 0; index < pixels.length && output.length < maxBytes; index += 4) {
    for (const offset of offsets) {
      const value = (pixels[index + offset] >> bit) & 1;
      current = msbFirst ? (current << 1) | value : current | (value << count);
      count += 1;
      if (count === 8) { output.push(current & 255); current = 0; count = 0; if (output.length >= maxBytes) break; }
    }
  }
  return new Uint8Array(output);
}

export function printablePrefix(bytes: Uint8Array) {
  let end = 0;
  while (end < bytes.length && (bytes[end] === 9 || bytes[end] === 10 || bytes[end] === 13 || (bytes[end] >= 32 && bytes[end] < 127))) end += 1;
  return new TextDecoder("latin1").decode(bytes.slice(0, end));
}

/* ---------- Embedded file scanner (binwalk-lite) ---------- */

type Signature = { label: string; magic: number[]; extension: string; offsetInFile?: number };

const embeddedSignatures: Signature[] = [
  { label: "PNG image", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], extension: "png" },
  { label: "JPEG image", magic: [0xff, 0xd8, 0xff], extension: "jpg" },
  { label: "GIF image", magic: [0x47, 0x49, 0x46, 0x38], extension: "gif" },
  { label: "ZIP archive / Office / JAR", magic: [0x50, 0x4b, 0x03, 0x04], extension: "zip" },
  { label: "RAR archive", magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], extension: "rar" },
  { label: "7-Zip archive", magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], extension: "7z" },
  { label: "gzip compressed data", magic: [0x1f, 0x8b, 0x08], extension: "gz" },
  { label: "bzip2 compressed data", magic: [0x42, 0x5a, 0x68], extension: "bz2" },
  { label: "XZ compressed data", magic: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], extension: "xz" },
  { label: "PDF document", magic: [0x25, 0x50, 0x44, 0x46, 0x2d], extension: "pdf" },
  { label: "ELF executable", magic: [0x7f, 0x45, 0x4c, 0x46], extension: "elf" },
  { label: "SQLite database", magic: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74], extension: "sqlite" },
  { label: "RIFF (WAV/AVI/WebP)", magic: [0x52, 0x49, 0x46, 0x46], extension: "riff" },
  { label: "OGG media", magic: [0x4f, 0x67, 0x67, 0x53], extension: "ogg" },
  { label: "Java class", magic: [0xca, 0xfe, 0xba, 0xbe], extension: "class" },
  { label: "PCAP capture", magic: [0xd4, 0xc3, 0xb2, 0xa1], extension: "pcap" },
  { label: "MP3 (ID3 tag)", magic: [0x49, 0x44, 0x33], extension: "mp3" },
];

export type EmbeddedHit = { offset: number; label: string; extension: string };
export type FileFinding = { title: string; detail: string; offset?: number };

function matchAt(bytes: Uint8Array, offset: number, magic: number[]) {
  for (let index = 0; index < magic.length; index += 1) if (bytes[offset + index] !== magic[index]) return false;
  return true;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function findSequence(bytes: Uint8Array, sequence: number[], from = 0) {
  outer: for (let index = from; index <= bytes.length - sequence.length; index += 1) {
    for (let j = 0; j < sequence.length; j += 1) if (bytes[index + j] !== sequence[j]) continue outer;
    return index;
  }
  return -1;
}

export function scanEmbeddedFiles(bytes: Uint8Array, limit = 200) {
  const hits: EmbeddedHit[] = [];
  for (let offset = 0; offset < bytes.length && hits.length < limit; offset += 1) {
    for (const signature of embeddedSignatures) {
      if (signature.magic[0] === bytes[offset] && matchAt(bytes, offset, signature.magic)) {
        // MP3/bzip2/JPEG magics are short; only report them at offset 0 or with extra validation to avoid noise.
        if (signature.extension === "mp3" && offset !== 0) continue;
        if (signature.extension === "bz2" && !(bytes[offset + 3] >= 0x31 && bytes[offset + 3] <= 0x39)) continue;
        if (signature.extension === "jpg" && !(bytes[offset + 3] >= 0xc0)) continue;
        hits.push({ offset, label: signature.label, extension: signature.extension });
      }
    }
  }
  const findings: FileFinding[] = [];
  const latin = new TextDecoder("latin1");
  if (matchAt(bytes, 0, embeddedSignatures[0].magic)) {
    let offset = 8;
    const chunks: string[] = [];
    while (offset + 12 <= bytes.length) {
      const length = readUint32(bytes, offset);
      const type = latin.decode(bytes.slice(offset + 4, offset + 8));
      chunks.push(type);
      if (type === "tEXt" || type === "iTXt") {
        const data = bytes.slice(offset + 8, offset + 8 + Math.min(length, 4096));
        findings.push({ title: `PNG ${type} 文字區塊`, detail: latin.decode(data).replace(/\0+/g, " = "), offset });
      }
      if (type === "zTXt") findings.push({ title: "PNG zTXt 壓縮文字區塊", detail: `長度 ${length} bytes，內容經 zlib 壓縮。`, offset });
      offset += 12 + length;
      if (type === "IEND") {
        if (offset < bytes.length) findings.push({ title: "IEND 之後有額外資料", detail: `PNG 結尾後還有 ${bytes.length - offset} bytes，常見的隱藏資料位置。`, offset });
        break;
      }
      if (length > bytes.length) break;
    }
    findings.unshift({ title: "PNG 區塊結構", detail: chunks.slice(0, 60).join(" → ") });
  }
  if (matchAt(bytes, 0, [0xff, 0xd8, 0xff])) {
    let commentOffset = findSequence(bytes, [0xff, 0xfe]);
    let guard = 0;
    while (commentOffset >= 0 && guard++ < 10) {
      const length = (bytes[commentOffset + 2] << 8) | bytes[commentOffset + 3];
      findings.push({ title: "JPEG COM 註解", detail: latin.decode(bytes.slice(commentOffset + 4, commentOffset + 2 + Math.min(length, 4096))), offset: commentOffset });
      commentOffset = findSequence(bytes, [0xff, 0xfe], commentOffset + 2 + length);
    }
    const exif = findSequence(bytes, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
    if (exif >= 0) findings.push({ title: "JPEG EXIF 中繼資料", detail: "含 EXIF 區段，可能記錄相機型號、時間或 GPS 座標。", offset: exif });
    let end = -1;
    for (let index = bytes.length - 2; index >= 2; index -= 1) if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) { end = index + 2; break; }
    if (end > 0 && end < bytes.length) findings.push({ title: "JPEG EOI 之後有額外資料", detail: `檔案結尾標記後還有 ${bytes.length - end} bytes。`, offset: end });
  }
  const flags = latin.decode(bytes).match(/(?:flag|ctf|picoCTF|HTB|THM)\{[\x20-\x7e]{1,200}?\}/gi);
  if (flags) for (const flag of [...new Set(flags)].slice(0, 20)) findings.push({ title: "疑似 Flag 字串", detail: flag });
  return { hits, findings };
}
