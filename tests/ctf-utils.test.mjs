import assert from "node:assert/strict";
import test from "node:test";
import {
  affine,
  affineBruteforce,
  analyzeFrequency,
  atbash,
  baconDecode,
  baconEncode,
  baseEncodings,
  bytesToBigint,
  crackVigenere,
  decodeBase,
  detectBaseEncodings,
  encodeBase,
  extractLsb,
  forgeJwt,
  integerRoot,
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
} from "../lib/ctf-utils.ts";

function powMod(base, exponent, modulus) {
  let result = 1n;
  base %= modulus;
  while (exponent) {
    if (exponent & 1n) result = (result * base) % modulus;
    exponent >>= 1n;
    base = (base * base) % modulus;
  }
  return result;
}

test("Vigenère encrypts, decrypts, and recovers keys from ciphertext alone", () => {
  assert.equal(vigenere("ATTACKATDAWN", "LEMON"), "LXFOPVEFRNHR");
  assert.equal(vigenere("LXFOPVEFRNHR", "LEMON", true), "ATTACKATDAWN");
  const samples = [
    ["Cryptography is the practice and study of techniques for secure communication in the presence of adversarial behavior. flag{repeat_key}", "CIPHER"],
    ["Meet me at the old bridge after midnight. Bring the documents and do not tell anyone where we are going tonight.", "BRIDGE"],
    ["ITWASABRIGHTCOLDDAYINAPRILANDTHECLOCKSWERESTRIKINGTHIRTEENWINSTONSMITHHISCHINNUZZLEDINTOHISBREAST", "ORWELL"],
  ];
  for (const [plaintext, key] of samples) {
    const [best] = crackVigenere(vigenere(plaintext, key));
    assert.equal(best.key, key);
    assert.equal(best.plaintext, plaintext);
  }
  assert.throws(() => crackVigenere("short"), /20/);
});

test("classical ciphers round-trip and brute-force to English", () => {
  assert.equal(atbash("flag{atbash}"), "uozt{zgyzhs}");
  assert.equal(rot47(rot47("flag{rot47!}")), "flag{rot47!}");
  assert.equal(rot47("Hello"), "w6==@");
  assert.equal(affine(affine("attack at dawn", 7, 3), 7, 3, true), "attack at dawn");
  assert.throws(() => affine("x", 2, 1), /互質/);
  assert.equal(affineBruteforce(affine("meet me after the party", 5, 8))[0].text, "meet me after the party");
  assert.equal(railFence("WEAREDISCOVEREDFLEEATONCE", 3), "WECRLTEERDSOEEFEAOCAIVDEN");
  assert.equal(railFence("WECRLTEERDSOEEFEAOCAIVDEN", 3, true), "WEAREDISCOVEREDFLEEATONCE");
  assert.equal(railFenceBruteforce(railFence("THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG", 4))[0].text, "THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG");
  assert.equal(baconEncode("Hi"), "AABBB ABAAA");
  assert.equal(baconDecode("00111 01000"), "HI");
});

test("Morse code handles words, punctuation, and alternative symbols", () => {
  assert.equal(morseEncode("SOS help"), "... --- ... / .... . .-.. .--.");
  assert.equal(morseDecode("... --- ... / .... . .-.. .--."), "SOS HELP");
  assert.equal(morseDecode("··· ——— ···"), "SOS");
  assert.throws(() => morseDecode("hello"), /點/);
});

test("Base family codecs round-trip and match reference vectors", () => {
  const bytes = new TextEncoder().encode("Hello, CTF!\u0000ÿ");
  for (const { id } of baseEncodings) assert.deepEqual(decodeBase(encodeBase(bytes, id), id), bytes, id);
  assert.equal(encodeBase(new TextEncoder().encode("foobar"), "base32"), "MZXW6YTBOI======");
  assert.equal(new TextDecoder().decode(decodeBase("StV1DL6CwTryKyV", "base58")), "hello world");
  assert.deepEqual(decodeBase("1112", "base58"), new Uint8Array([0, 0, 0, 1]));
  assert.equal(new TextDecoder().decode(decodeBase('<~87cURD]i,"Ebo80~>', "ascii85")), "Hello World!");
  assert.equal(encodeBase(new Uint8Array(4), "ascii85"), "<~z~>");
  assert.equal(detectBaseEncodings("JBSWY3DPEBLW64TMMQ======")[0].text, "Hello World");
});

test("frequency analysis reports IC and the most likely Caesar shift", () => {
  const plaintext = "Frequency analysis is the study of the frequency of letters or groups of letters in a ciphertext.";
  const shifted = plaintext.replace(/[a-z]/gi, (character) => {
    const base = character <= "Z" ? 65 : 97;
    return String.fromCharCode(((character.charCodeAt(0) - base + 11) % 26) + base);
  });
  const result = analyzeFrequency(shifted);
  assert.equal(result.likelyCaesarShift, 11);
  assert.ok(result.ic > 0.06);
  assert.throws(() => analyzeFrequency("1234"), /英文字母/);
});

test("RSA solver factors weak moduli and recovers plaintext", () => {
  const message = bytesToBigint(new TextEncoder().encode("hi!"));
  const e = 65537n;
  // Fermat: p and q are adjacent primes.
  let n = 1000000007n * 1000000009n;
  let result = solveRsa({ n: n.toString(), e: "65537", c: powMod(message, e, n).toString() });
  assert.equal(result.text, "hi!");
  assert.ok(result.steps.some((step) => step.includes("Fermat")));
  // Pollard rho on unbalanced primes, hex input.
  n = 4294967311n * 1099511627791n;
  result = solveRsa({ n: `0x${n.toString(16)}`, e: "65537", c: powMod(message, e, n).toString() });
  assert.equal(result.text, "hi!");
  // Small e with no modular wrap-around.
  const cube = bytesToBigint(new TextEncoder().encode("flag{cube}")) ** 3n;
  result = solveRsa({ n: ((1n << 1024n) + 1n).toString(), e: "3", c: cube.toString() });
  assert.equal(result.text, "flag{cube}");
  // Known factors.
  result = solveRsa({ p: "61", q: "53", e: "17", c: "2790" });
  assert.equal(result.m, 65n);
  assert.equal(result.d, 2753n);
  assert.throws(() => solveRsa({ e: "3" }), /n/);
  assert.deepEqual(integerRoot(27n, 3n), { root: 3n, exact: true });
});

test("RSA solver applies Wiener's attack when d is small", () => {
  // Known primes 2^61 − 1 and 2^62 − 57 (q < 2p); d = 10007 is far below n^(1/4) / 3.
  const p = 2305843009213693951n;
  const q = 4611686018427387847n;
  const phi = (p - 1n) * (q - 1n);
  const d = 10007n;
  let e = 0n;
  for (let x = phi + 1n; ; x += phi) if (x % d === 0n) { e = x / d; break; }
  const n = p * q;
  const message = bytesToBigint(new TextEncoder().encode("wiener"));
  const result = solveRsa({ n: n.toString(), e: e.toString(), c: powMod(message, e, n).toString() });
  assert.equal(result.text, "wiener");
  assert.ok(result.steps.some((step) => step.includes("Wiener")));
});

test("Brainfuck and Ook! run with output and step limits", () => {
  assert.equal(runBrainfuck("++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.").output, "Hello World!");
  assert.equal(runBrainfuck(",.", "A").output, "A");
  assert.equal(runBrainfuck("+[]", "", 1000).halted, false);
  assert.throws(() => runBrainfuck("[["), /\]/);
  assert.equal(ookToBrainfuck("Ook. Ook? Ook. Ook. Ook! Ook."), ">+.");
});

test("JWT forger signs with none and HMAC and round-trips existing tokens", async () => {
  const none = await forgeJwt('{"typ":"JWT"}', '{"sub":"admin"}', "none");
  assert.equal(none, "eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.");
  const signed = await forgeJwt('{"alg":"HS256","typ":"JWT"}', '{"sub":"1234567890","name":"John Doe","iat":1516239022}', "HS256", "your-256-bit-secret");
  assert.equal(signed, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  assert.match(splitJwt(signed).payload, /John Doe/);
  await assert.rejects(() => forgeJwt("{", "{}", "none"), /Header/);
});

test("LSB extraction reads hidden bytes from RGB channels", () => {
  const message = new TextEncoder().encode("flag{lsb}");
  const pixels = new Uint8Array(4 * 40);
  let bit = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const byte = message[Math.floor(bit / 8)] ?? 0;
      pixels[index + channel] = 0xa0 | ((byte >> (7 - (bit % 8))) & 1);
      bit += 1;
    }
    pixels[index + 3] = 255;
  }
  assert.equal(printablePrefix(extractLsb(pixels, ["r", "g", "b"])), "flag{lsb}");
  assert.throws(() => extractLsb(pixels, []), /通道/);
});

test("embedded file scanner finds appended archives, PNG text, and flags", () => {
  const text = new TextEncoder().encode("Comment\u0000flag{in_text_chunk}");
  const chunk = (type, data) => [(data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...new TextEncoder().encode(type), ...data, 0, 0, 0, 0];
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("tEXt", text), ...chunk("IEND", []), 0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  const { hits, findings } = scanEmbeddedFiles(bytes);
  assert.deepEqual(hits.map((hit) => hit.extension), ["png", "zip"]);
  assert.ok(findings.some((finding) => finding.title.includes("tEXt") && finding.detail.includes("flag{in_text_chunk}")));
  assert.ok(findings.some((finding) => finding.title.includes("IEND")));
  assert.ok(findings.some((finding) => finding.detail === "flag{in_text_chunk}"));
});
