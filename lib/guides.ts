// Long-form guides that answer common search questions and point to the matching tools.
// Inline `code` in body text is rendered as <code>. Tool slugs in `tools` become linked cards.

export type GuideSection = { heading: string; body: string[]; list?: string[]; tools?: string[] };
export type GuideCopy = { title: string; description: string; lead: string; sections: GuideSection[]; faq: Array<{ question: string; answer: string }> };
export type Guide = { slug: string; icon: string; published: string; updated: string; tools: string[]; zh: GuideCopy; en: GuideCopy };

export const guides: Guide[] = [
  {
    slug: "ctf-beginner-toolkit",
    icon: "🚩",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["recipe-chain", "layered-decoder", "rsa-solver", "vigenere-cipher", "lsb-steganography", "hidden-data-scanner", "zip-inspector", "png-crc-fixer", "cyclic-pattern", "jwt-decoder"],
    zh: {
      title: "CTF 新手工具指南：依題型整理的免費線上解題工具",
      description: "第一次打 CTF 不知道從哪裡開始？依 Crypto、Misc、Forensics、Web、Pwn 題型整理常用線上工具與解題思路，全部免安裝、在瀏覽器執行。",
      lead: "CTF（Capture The Flag）題目大致分成 Crypto、Misc、Forensics、Web 與 Pwn 幾類，每一類都有一套固定的「第一步」。這篇整理新手最常卡關的情境，告訴你先看什麼、用哪個工具，不用先裝一整套 Kali。",
      sections: [
        {
          heading: "拿到題目的第一步：先判斷資料是什麼",
          body: [
            "大部分新手卡關不是因為不會解，而是不知道眼前的字串或檔案是什麼。先觀察字元組成：只有 0–9、a–f 通常是 Hex；結尾有 = 而且大小寫混合多半是 Base64；全大寫加上 2–7 可能是 Base32；開頭是 `eJ` 或 `H4sI` 的 Base64，解開後是 zlib 或 gzip 壓縮資料。",
            "如果資料被包了好幾層，就把它丟進多層編碼解碼器自動嘗試；想自己控制每一步，就用 Recipe 串接解碼器，一層一層看中間結果。",
          ],
          tools: ["layered-decoder", "recipe-chain", "base-family-codec"],
        },
        {
          heading: "Crypto：古典密碼與 RSA",
          body: [
            "入門 Crypto 題多半是古典密碼。只有字母且看起來像亂碼時，先做字母頻率分析：重合指數接近 0.066 代表單表替換（Caesar、Atbash、Affine），接近 0.038 則可能是 Vigenère 這類多表替換。",
            "RSA 題通常給 n、e、c。常見弱點有 e 很小、p 與 q 太接近、d 太小，或 n 本身能被分解。RSA 自動求解器會依序嘗試這些方法，成功後直接用 long_to_bytes 顯示明文。",
          ],
          list: ["Caesar／ROT13：Caesar 暴力枚舉一次列出 26 種位移", "Vigenère：用重合指數推測金鑰長度後自動破解", "RSA：小 e、Fermat、Wiener、Pollard rho 一次試完", "AES／DES：題目給了 Key 和 IV 時，直接用對稱加解密工具"],
          tools: ["frequency-analysis", "vigenere-cipher", "rsa-solver", "symmetric-cipher"],
        },
        {
          heading: "Misc 與 Forensics：圖片、壓縮檔與音訊",
          body: [
            "圖片題的標準流程是：先看檔案結尾後面有沒有接其他檔案，再看 EXIF 與文字區塊，最後檢查 LSB 位元平面。PNG 如果看起來被裁掉一半，很可能是 IHDR 高度被改小，CRC 會露出破綻。",
            "壓縮檔題常見的是偽加密（只改了加密旗標）與弱密碼；音訊題則可能把文字畫在頻譜圖裡，或用電話撥號音（DTMF）傳遞數字。",
          ],
          tools: ["hidden-data-scanner", "exif-viewer", "lsb-steganography", "png-crc-fixer", "zip-inspector", "audio-spectrogram"],
        },
        {
          heading: "Web：JWT、序列化與路徑穿越",
          body: [
            "Web 題常見的 JWT 問題包括伺服器接受 `alg=none`、使用弱 HMAC 金鑰，或沒有檢查 `exp`。先用 JWT 解碼器看清楚 Header 與 Payload，再決定要測試哪一種。",
            "Cookie 裡出現 `O:4:\"User\"` 這類字串代表 PHP 序列化物件，修改時最容易算錯字串長度；網址參數裡的 `..%2f` 則是路徑穿越的典型寫法。",
          ],
          tools: ["jwt-decoder", "php-unserialize", "path-traversal-analyzer"],
        },
        {
          heading: "Pwn：先算出 offset",
          body: [
            "Stack overflow 題的第一步是知道輸入多長才會蓋到返回位址。產生一段 cyclic pattern 送進程式，讓它崩潰後把 EIP／RIP 的值貼回來，就能得到 offset。Integer Pack 工具則能把位址轉成 little-endian bytes。",
          ],
          tools: ["cyclic-pattern", "integer-packer"],
        },
        {
          heading: "養成好習慣",
          body: [
            "把每一步做過的轉換記下來，卡住時才知道哪裡走錯；Recipe 串接解碼器的分享連結很適合拿來和隊友交換思路。另外，比賽的題目檔與 flag 不要貼到會上傳資料的線上服務，這也是本站所有工具都只在瀏覽器執行的原因。",
          ],
        },
      ],
      faq: [
        { question: "CTF 新手需要先安裝 Kali Linux 嗎？", answer: "不一定。入門的 Crypto、Misc 與 Forensics 題大多可以用線上工具完成，等開始碰 Pwn 與逆向再準備 Linux 環境、gdb 與 pwntools 即可。" },
        { question: "這些工具會把題目檔上傳嗎？", answer: "不會。所有工具都在瀏覽器本機執行，檔案與輸入不會送到任何伺服器。" },
        { question: "怎麼判斷一串文字是不是 flag？", answer: "多數比賽的 flag 有固定格式，例如 flag{...}、CTF{...} 或賽事名稱加大括號。解出可讀文字但格式不對時，通常代表還有下一層。" },
      ],
    },
    en: {
      title: "CTF Tools for Beginners: Free Online Tools by Challenge Category",
      description: "New to CTFs? A practical guide to the first steps and free browser-based tools for crypto, misc, forensics, web and pwn challenges — nothing to install.",
      lead: "CTF (Capture The Flag) challenges fall into a few categories — crypto, misc, forensics, web and pwn — and each one has a standard first move. This guide covers where beginners usually get stuck, what to look at first and which tool to reach for, without installing a full Kali setup.",
      sections: [
        {
          heading: "Step one: figure out what the data is",
          body: [
            "Most beginners get stuck not because they can't solve the challenge, but because they don't recognize the string or file in front of them. Look at the characters: only 0–9 and a–f usually means hex; mixed case with trailing = is probably Base64; uppercase plus 2–7 may be Base32; Base64 starting with `eJ` or `H4sI` decodes to zlib or gzip data.",
            "If the data is wrapped in several layers, try the layered decoder first. To control every step yourself, use the recipe chain and inspect each intermediate result.",
          ],
          tools: ["layered-decoder", "recipe-chain", "base-family-codec"],
        },
        {
          heading: "Crypto: classical ciphers and RSA",
          body: [
            "Beginner crypto challenges are often classical ciphers. If the text is letters-only gibberish, run a frequency analysis: an index of coincidence near 0.066 points to monoalphabetic substitution (Caesar, Atbash, Affine), while one near 0.038 suggests a polyalphabetic cipher such as Vigenère.",
            "RSA challenges usually give you n, e and c. Common weaknesses are a tiny e, p and q too close together, a small d, or an n that simply factors. The RSA solver tries each of these and shows the plaintext with long_to_bytes once it succeeds.",
          ],
          list: ["Caesar/ROT13: list all 26 shifts at once", "Vigenère: estimate the key length with the index of coincidence, then crack it", "RSA: small e, Fermat, Wiener and Pollard rho in one go", "AES/DES: when the challenge gives you the key and IV, decrypt directly"],
          tools: ["frequency-analysis", "vigenere-cipher", "rsa-solver", "symmetric-cipher"],
        },
        {
          heading: "Misc and forensics: images, archives and audio",
          body: [
            "The standard image workflow: check for files appended after the end of the image, then EXIF and text chunks, then the LSB bit planes. If a PNG looks cut in half, the IHDR height was probably reduced — and the CRC gives it away.",
            "Archive challenges often use pseudo-encryption (only the encryption flag is set) or weak passwords. Audio challenges may draw text into the spectrogram or send digits as phone dial tones (DTMF).",
          ],
          tools: ["hidden-data-scanner", "exif-viewer", "lsb-steganography", "png-crc-fixer", "zip-inspector", "audio-spectrogram"],
        },
        {
          heading: "Web: JWTs, serialization and path traversal",
          body: [
            "Common JWT issues in web challenges include servers that accept `alg=none`, weak HMAC secrets and missing `exp` checks. Decode the header and payload first, then decide what to test.",
            "A cookie containing something like `O:4:\"User\"` is a serialized PHP object, and hand edits usually break the string lengths. A parameter containing `..%2f` is the classic shape of path traversal.",
          ],
          tools: ["jwt-decoder", "php-unserialize", "path-traversal-analyzer"],
        },
        {
          heading: "Pwn: find the offset first",
          body: [
            "The first step in a stack overflow is learning how much input reaches the return address. Send a cyclic pattern, let the program crash, and paste the EIP/RIP value back to get the offset. The integer packer turns addresses into little-endian bytes.",
          ],
          tools: ["cyclic-pattern", "integer-packer"],
        },
        {
          heading: "Build good habits",
          body: [
            "Write down every transformation you apply so you can tell where you went wrong; recipe share links are a handy way to swap ideas with teammates. And don't paste challenge files or flags into online services that upload your data — which is why every tool on this site runs only in your browser.",
          ],
        },
      ],
      faq: [
        { question: "Do I need Kali Linux to start CTFs?", answer: "Not necessarily. Most beginner crypto, misc and forensics challenges can be solved with online tools. Set up Linux, gdb and pwntools when you move on to pwn and reversing." },
        { question: "Do these tools upload challenge files?", answer: "No. Every tool runs locally in your browser, and files and input are never sent to a server." },
        { question: "How do I know a string is the flag?", answer: "Most competitions use a fixed format such as flag{...}, CTF{...} or the event name with braces. If you decode readable text in the wrong format, there's usually another layer." },
      ],
    },
  },
  {
    slug: "identify-encoding",
    icon: "🔤",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["layered-decoder", "base64-codec", "base-family-codec", "url-codec", "unicode-escape-codec", "compression-codec", "hash-identifier", "recipe-chain"],
    zh: {
      title: "這是什麼編碼？Base64、Base32、Base58、Hex 與 URL 編碼辨識指南",
      description: "看到一串奇怪的字元不知道怎麼解？用字元集、長度與開頭特徵快速判斷 Base64、Base32、Base58、Hex、URL 編碼、Unicode 跳脫與壓縮資料。",
      lead: "編碼不是加密：只要認出格式，就能還原成原始內容。這篇用「看字元、看長度、看開頭」三個步驟，帶你分辨最常見的編碼，以及怎麼避免把雜湊值誤當成編碼。",
      sections: [
        {
          heading: "第一步：看字元集",
          body: ["不同編碼使用的字元不一樣，這是最快的判斷方式："],
          list: [
            "Hex：只有 0–9、a–f（或 A–F），長度是偶數，例如 `666c6167`",
            "Base64：A–Z、a–z、0–9、+、/，結尾可能有一或兩個 =；URL-safe 版本把 +/ 換成 -_",
            "Base32：A–Z 與 2–7，常以 = 補齊到 8 的倍數，TOTP Secret 就是這種格式",
            "Base58：沒有 0、O、I、l 這些容易混淆的字元，常見於比特幣位址",
            "Ascii85：使用大量標點符號，有時包在 `<~` 與 `~>` 之間",
            "URL 編碼：出現 `%2F`、`%20` 這種百分比加兩位十六進位",
            "Unicode 跳脫：`\\u0066`、`\\x66` 或 `&#102;`",
          ],
          tools: ["base64-codec", "base-family-codec", "url-codec", "unicode-escape-codec"],
        },
        {
          heading: "第二步：看長度",
          body: [
            "Base64 的長度通常是 4 的倍數，Base32 是 8 的倍數。長度剛好是 32、40、64 或 128 個十六進位字元時要小心：那很可能是 MD5、SHA-1、SHA-256 或 SHA-512 雜湊值，而雜湊是單向的，無法「解碼」。",
          ],
          tools: ["hash-identifier"],
        },
        {
          heading: "第三步：看開頭特徵",
          body: [
            "某些開頭幾乎可以直接判定內容：Base64 的 `eyJ` 解開是 `{\"`，代表 JSON（JWT 就是三段這樣的字串）；`eJ` 開頭是 zlib 壓縮；`H4sI` 開頭是 gzip；`iVBOR` 是 PNG 圖片；`UEsDB` 是 ZIP 檔；`JVBER` 是 PDF。",
          ],
          tools: ["compression-codec", "jwt-decoder"],
        },
        {
          heading: "多層編碼怎麼辦？",
          body: [
            "惡意程式與 CTF 題目常把編碼疊好幾層，例如 URL 編碼包住 Base64，Base64 裡又是 Hex。多層編碼解碼器會自動逐層嘗試並記錄每一步；如果中間還需要 XOR 或解壓縮，就改用 Recipe 串接解碼器自己排順序。",
          ],
          tools: ["layered-decoder", "recipe-chain"],
        },
        {
          heading: "常見誤判",
          body: [
            "純數字或純十六進位字串有可能剛好也是合法的 Base64，解出來會是一堆亂碼；這時看結果是否可讀即可判斷。另外，Base64 解碼後是亂碼不一定代表錯誤，也可能是壓縮或加密過的二進位資料，可以先用 Hex 檢視開頭的 Magic Bytes。",
          ],
          tools: ["hex-viewer", "file-signature-checker"],
        },
      ],
      faq: [
        { question: "編碼和加密有什麼不同？", answer: "編碼只是換一種表示方式，任何人都能還原；加密需要金鑰才能解開。Base64 不是加密，不應該用來保護密碼或機敏資料。" },
        { question: "為什麼 Base64 解出來是亂碼？", answer: "可能是解錯格式、資料不完整，或原始內容本來就是二進位（壓縮檔、圖片、加密資料）。檢查開頭的 Magic Bytes 通常就能知道是哪一種。" },
        { question: "MD5 可以解碼嗎？", answer: "不行。MD5、SHA 系列是雜湊函式，設計上無法反推原文。網路上的「MD5 解密」其實是查詢預先算好的對照表。" },
      ],
    },
    en: {
      title: "What Encoding Is This? Identify Base64, Base32, Base58, Hex and URL Encoding",
      description: "Staring at a strange string? Use its characters, length and prefix to tell Base64, Base32, Base58, hex, URL encoding and compressed data apart.",
      lead: "Encoding isn't encryption: once you recognize the format, you can get the original back. This guide uses three checks — characters, length and prefix — to identify the most common encodings, and shows how to avoid mistaking a hash for an encoding.",
      sections: [
        {
          heading: "Check 1: the character set",
          body: ["Each encoding uses a different alphabet, which makes this the fastest check:"],
          list: [
            "Hex: only 0–9 and a–f (or A–F), even length — e.g. `666c6167`",
            "Base64: A–Z, a–z, 0–9, + and /, possibly ending in one or two =; the URL-safe variant uses - and _ instead of + and /",
            "Base32: A–Z and 2–7, often padded with = to a multiple of 8 — TOTP secrets use it",
            "Base58: no easily confused characters like 0, O, I and l; common in Bitcoin addresses",
            "Ascii85: lots of punctuation, sometimes wrapped in `<~` and `~>`",
            "URL encoding: percent signs followed by two hex digits, like `%2F` or `%20`",
            "Unicode escapes: `\\u0066`, `\\x66` or `&#102;`",
          ],
          tools: ["base64-codec", "base-family-codec", "url-codec", "unicode-escape-codec"],
        },
        {
          heading: "Check 2: the length",
          body: [
            "Base64 length is usually a multiple of 4 and Base32 a multiple of 8. Be careful with exactly 32, 40, 64 or 128 hex characters: that's likely an MD5, SHA-1, SHA-256 or SHA-512 hash, and hashes are one-way — they can't be decoded.",
          ],
          tools: ["hash-identifier"],
        },
        {
          heading: "Check 3: the prefix",
          body: [
            "Some prefixes practically identify the content: Base64 `eyJ` decodes to `{\"`, meaning JSON (a JWT is three of these joined by dots); `eJ` is zlib; `H4sI` is gzip; `iVBOR` is a PNG; `UEsDB` is a ZIP; `JVBER` is a PDF.",
          ],
          tools: ["compression-codec", "jwt-decoder"],
        },
        {
          heading: "What about multiple layers?",
          body: [
            "Malware and CTF challenges often stack encodings — URL encoding around Base64 around hex, for example. The layered decoder tries each layer automatically and records every step. If you also need XOR or decompression along the way, build the order yourself with the recipe chain.",
          ],
          tools: ["layered-decoder", "recipe-chain"],
        },
        {
          heading: "Common false positives",
          body: [
            "A purely numeric or hex string can also be valid Base64 and decode to garbage — whether the result is readable tells you which it is. Garbage after Base64 decoding isn't always a mistake either: it may be compressed or encrypted binary data, so look at the magic bytes in a hex view.",
          ],
          tools: ["hex-viewer", "file-signature-checker"],
        },
      ],
      faq: [
        { question: "What's the difference between encoding and encryption?", answer: "Encoding is just another representation that anyone can reverse; encryption needs a key. Base64 isn't encryption and shouldn't be used to protect passwords or sensitive data." },
        { question: "Why does my Base64 decode to garbage?", answer: "You may have the wrong format or incomplete data, or the original content is binary (an archive, image or encrypted data). The magic bytes at the start usually tell you which." },
        { question: "Can MD5 be decoded?", answer: "No. MD5 and the SHA family are hash functions designed so the input can't be recovered. Online \"MD5 decrypters\" just look the hash up in precomputed tables." },
      ],
    },
  },
  {
    slug: "photo-exif-location",
    icon: "📍",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["exif-viewer", "hidden-data-scanner", "file-signature-checker"],
    zh: {
      title: "照片會洩漏拍攝地點嗎？檢查與移除 EXIF GPS 資訊的方法",
      description: "手機照片的 EXIF 可能記錄 GPS 座標、拍攝時間與手機型號。教你如何在不上傳照片的情況下檢查中繼資料，並在分享前移除。",
      lead: "大多數手機預設會把拍攝地點寫進照片的 EXIF 中繼資料。透過社群平台分享時，有些平台會自動移除，但透過 Email、雲端硬碟、論壇或通訊軟體的「原始檔」傳送時，GPS 座標很可能一起送出去。",
      sections: [
        {
          heading: "EXIF 會記錄哪些資訊？",
          body: ["EXIF 是相機與手機寫在 JPEG、HEIC、PNG、WebP 等圖片裡的中繼資料，常見欄位包括："],
          list: ["GPS 經緯度與海拔，精確到幾公尺", "拍攝日期時間與時區", "手機或相機品牌、型號、鏡頭與序號", "編輯軟體名稱，有時還有作者與版權資訊", "縮圖：即使裁切過原圖，舊縮圖可能仍保留原始畫面"],
        },
        {
          heading: "如何檢查照片有沒有 GPS？",
          body: [
            "把照片拖進 EXIF 中繼資料檢視工具，它會在瀏覽器裡直接讀取檔案，不會上傳。如果照片含有位置資訊，工具會顯示經緯度並提供地圖連結，讓你確認洩漏的精確程度。",
          ],
          tools: ["exif-viewer"],
        },
        {
          heading: "分享前如何移除？",
          body: ["幾種常見做法："],
          list: [
            "用本站的 EXIF 工具下載「移除中繼資料的 JPEG」，會刪除 EXIF、GPS、XMP 與註解區段，但保留影像內容",
            "iPhone：分享時點「選項」，關閉「位置」",
            "Android：在相機設定中關閉「位置標籤」，之後拍的照片就不會記錄 GPS",
            "截圖再分享也能去除大部分中繼資料，但畫質會下降",
          ],
          tools: ["exif-viewer"],
        },
        {
          heading: "OSINT 與鑑識上的用途",
          body: [
            "反過來說，EXIF 也是調查與 OSINT 的重要線索：比對拍攝時間與手機型號可以驗證照片真偽，GPS 能協助確認事件地點。CTF 的 Forensics 題也常把 flag 藏在 ImageDescription、UserComment 或 XMP 欄位裡。",
            "若照片結尾還接了其他資料（例如壓縮檔），可以用隱藏資料掃描器檢查。",
          ],
          tools: ["hidden-data-scanner"],
        },
      ],
      faq: [
        { question: "傳到 LINE 或 Facebook 的照片會保留 GPS 嗎？", answer: "多數社群與通訊平台在壓縮照片時會移除 EXIF，但以「原始檔」或文件方式傳送時通常會保留。平台政策可能變動，最保險的做法是分享前自己檢查並移除。" },
        { question: "用這個工具檢查會上傳照片嗎？", answer: "不會。照片只在你的瀏覽器裡解析，不會送到任何伺服器。" },
        { question: "PNG 也有 EXIF 嗎？", answer: "有。PNG 可以用 eXIf 區塊儲存 EXIF，也常用 tEXt、iTXt 文字區塊記錄軟體與說明資訊。" },
      ],
    },
    en: {
      title: "Does Your Photo Reveal Your Location? How to Check and Remove EXIF GPS Data",
      description: "Phone photos can carry GPS coordinates and device details in EXIF metadata. Check it without uploading the photo, and remove it before sharing.",
      lead: "Most phones write the capture location into a photo's EXIF metadata by default. Some social platforms strip it automatically, but when you send the original file by email, cloud drive, forum or messaging app, the GPS coordinates may well go with it.",
      sections: [
        {
          heading: "What does EXIF record?",
          body: ["EXIF is metadata that cameras and phones embed in JPEG, HEIC, PNG and WebP images. Common fields include:"],
          list: ["GPS latitude, longitude and altitude, accurate to a few meters", "Capture date, time and time zone", "Phone or camera make, model, lens and serial number", "Editing software, sometimes with author and copyright", "Thumbnails: even after cropping, an old thumbnail may still show the original picture"],
        },
        {
          heading: "How to check a photo for GPS",
          body: [
            "Drop the photo into the EXIF metadata viewer. It reads the file directly in your browser without uploading it. If the photo contains a location, the tool shows the coordinates with a map link so you can see exactly how precise the leak is.",
          ],
          tools: ["exif-viewer"],
        },
        {
          heading: "How to remove it before sharing",
          body: ["A few common options:"],
          list: [
            "Use the EXIF tool's \"Download JPEG without metadata\" to drop the EXIF, GPS, XMP and comment segments while keeping the image",
            "iPhone: tap Options when sharing and turn off Location",
            "Android: turn off location tags in the camera settings so new photos don't record GPS",
            "Screenshotting a photo removes most metadata too, at some cost in quality",
          ],
          tools: ["exif-viewer"],
        },
        {
          heading: "Uses in OSINT and forensics",
          body: [
            "On the flip side, EXIF is a valuable lead in investigations and OSINT: capture times and device models help verify a photo, and GPS can confirm where something happened. CTF forensics challenges also like to hide flags in ImageDescription, UserComment or XMP.",
            "If extra data such as an archive is appended to the image, check it with the hidden data scanner.",
          ],
          tools: ["hidden-data-scanner"],
        },
      ],
      faq: [
        { question: "Do photos sent through messaging apps keep GPS?", answer: "Most social and messaging platforms strip EXIF when they compress photos, but sending the original file or a document usually keeps it. Policies change, so the safest approach is to check and remove it yourself before sharing." },
        { question: "Does checking a photo here upload it?", answer: "No. The photo is parsed only in your browser and never sent to a server." },
        { question: "Do PNG files have EXIF?", answer: "Yes. PNG can store EXIF in an eXIf chunk and often records software and descriptions in tEXt and iTXt chunks." },
      ],
    },
  },
  {
    slug: "jwt-security-checklist",
    icon: "🔑",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["jwt-decoder", "jwt-signature-verifier", "jwt-forger", "password-generator", "hmac-generator", "timestamp-decoder"],
    zh: {
      title: "JWT 安全檢查清單：解碼、驗章與最常見的 7 個設定錯誤",
      description: "JWT 不是加密，Payload 任何人都看得到。整理 JWT 驗證最常見的錯誤，包括 alg=none、弱 HMAC 金鑰、未檢查 exp 與演算法混淆，並說明如何自行檢測。",
      lead: "JSON Web Token（JWT）被大量用在 API 驗證與單一登入。它的安全完全取決於伺服器如何驗證簽章與欄位。這份清單整理實務與滲透測試中最常見的問題，並對應到可以在瀏覽器完成的檢查方式。",
      sections: [
        {
          heading: "先理解 JWT 的結構",
          body: [
            "JWT 由三段以 . 連接的 Base64URL 字串組成：Header（演算法與類型）、Payload（使用者資料與時效）、Signature（簽章）。前兩段只是編碼，任何人都能解開閱讀，所以 Payload 不能放密碼或個資。",
          ],
          tools: ["jwt-decoder"],
        },
        {
          heading: "7 個最常見的設定錯誤",
          body: ["檢查你的系統是否有以下問題："],
          list: [
            "接受 `alg: none`：伺服器沒有強制指定演算法，未簽章的 Token 也能通過",
            "弱 HMAC 金鑰：HS256 使用 secret、password 這類短字串，容易被字典攻擊",
            "演算法混淆：伺服器同時支援 RS256 與 HS256，攻擊者用公鑰當 HMAC 金鑰簽章",
            "未檢查 `exp`、`nbf`：過期的 Token 仍可使用",
            "未檢查 `iss`、`aud`：其他服務簽發的 Token 也被接受",
            "Payload 放入機敏資料：Email、身分證字號或權限細節被任何人讀取",
            "沒有撤銷機制：Token 外洩後只能等它過期",
          ],
        },
        {
          heading: "如何自行檢查",
          body: [
            "用 JWT 解碼器確認 Header 的 alg 與 Payload 的 exp、iss、aud；用 JWT 簽章驗證工具確認簽章是否真的有效。在授權的測試環境中，可以用 JWT 偽造工具產生 alg=none 或修改過的 Token，確認伺服器會拒絕。",
          ],
          tools: ["jwt-decoder", "jwt-signature-verifier", "jwt-forger"],
        },
        {
          heading: "修正建議",
          body: [],
          list: [
            "在伺服器端明確指定允許的演算法，不要信任 Token Header 裡的 alg",
            "HS256 金鑰至少 32 bytes 的隨機值，可用密碼產生器產生",
            "一律驗證 exp、iss、aud，並設定合理的短時效",
            "需要撤銷時搭配短效 Access Token 與可撤銷的 Refresh Token",
          ],
          tools: ["password-generator", "timestamp-decoder"],
        },
      ],
      faq: [
        { question: "JWT 是加密的嗎？", answer: "一般的 JWT（JWS）只有簽章、沒有加密，Payload 任何人都能解碼閱讀。需要加密時要使用 JWE。" },
        { question: "在線上解碼 JWT 安全嗎？", answer: "取決於工具是否把 Token 上傳。本站的 JWT 工具全部在瀏覽器執行，不會送出 Token；但仍建議不要在共用電腦貼上有效的正式環境 Token。" },
        { question: "HS256 和 RS256 該選哪個？", answer: "單一服務內部使用時 HS256 簡單有效；需要讓多個服務驗證但只有一方簽發時，RS256 或 ES256 的公私鑰架構比較合適。" },
      ],
    },
    en: {
      title: "JWT Security Checklist: Decoding, Verification and the 7 Most Common Mistakes",
      description: "Anyone can read a JWT payload. The most common JWT validation mistakes — alg=none, weak HMAC secrets, missing exp checks — and how to test for them.",
      lead: "JSON Web Tokens (JWTs) are everywhere in API authentication and single sign-on, and their security depends entirely on how the server verifies the signature and claims. This checklist covers the issues that come up most in practice and in penetration tests, with checks you can run in your browser.",
      sections: [
        {
          heading: "Understand the structure first",
          body: [
            "A JWT is three Base64URL strings joined by dots: the header (algorithm and type), the payload (user data and expiry) and the signature. The first two are only encoded, so anyone can read them — never put passwords or personal data in the payload.",
          ],
          tools: ["jwt-decoder"],
        },
        {
          heading: "The 7 most common mistakes",
          body: ["Check whether your system has any of these problems:"],
          list: [
            "Accepting `alg: none`: the server doesn't enforce an algorithm, so unsigned tokens pass",
            "Weak HMAC secrets: HS256 keyed with short strings like secret or password is open to dictionary attacks",
            "Algorithm confusion: a server supporting both RS256 and HS256 accepts tokens signed with the public key as an HMAC secret",
            "No `exp` or `nbf` checks: expired tokens keep working",
            "No `iss` or `aud` checks: tokens issued for other services are accepted",
            "Sensitive data in the payload: emails, ID numbers or permission details readable by anyone",
            "No revocation: a leaked token stays valid until it expires",
          ],
        },
        {
          heading: "How to check",
          body: [
            "Use the JWT decoder to check the header's alg and the payload's exp, iss and aud, and the signature verifier to confirm the signature is actually valid. In an authorized test environment, the JWT forger can produce alg=none or modified tokens so you can confirm the server rejects them.",
          ],
          tools: ["jwt-decoder", "jwt-signature-verifier", "jwt-forger"],
        },
        {
          heading: "How to fix them",
          body: [],
          list: [
            "Specify the allowed algorithms on the server; never trust the alg in the token header",
            "Use at least 32 random bytes for HS256 secrets — the password generator can make one",
            "Always validate exp, iss and aud, and keep lifetimes short",
            "For revocation, pair short-lived access tokens with revocable refresh tokens",
          ],
          tools: ["password-generator", "timestamp-decoder"],
        },
      ],
      faq: [
        { question: "Are JWTs encrypted?", answer: "A regular JWT (JWS) is signed, not encrypted, so anyone can decode the payload. Use JWE when you need encryption." },
        { question: "Is it safe to decode JWTs online?", answer: "It depends on whether the tool uploads the token. The JWT tools on this site run entirely in your browser and never send it anywhere — but avoid pasting live production tokens on a shared computer anyway." },
        { question: "Should I use HS256 or RS256?", answer: "HS256 is simple and effective inside a single service. When several services must verify tokens that only one party issues, a public-key scheme like RS256 or ES256 fits better." },
      ],
    },
  },
  {
    slug: "pickle-model-security",
    icon: "🧪",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["pickle-analyzer", "file-signature-checker", "hash-generator", "zip-inspector"],
    zh: {
      title: "載入 AI 模型前先檢查：Python pickle 反序列化風險與安全做法",
      description: "PyTorch 模型、快取檔與資料集常用 pickle 格式，而 pickle.load 可能在載入時執行任意程式。說明風險原理、如何靜態檢查 pickle，以及更安全的替代格式。",
      lead: "從網路下載模型或資料集已經是日常工作，但很多人不知道：Python 的 pickle 格式在「載入」的瞬間就可以執行程式碼。這篇說明為什麼會這樣、怎麼在不執行的情況下檢查檔案，以及應該改用哪些格式。",
      sections: [
        {
          heading: "為什麼 pickle 不安全？",
          body: [
            "pickle 不只是資料格式，而是一個小型的堆疊機器。它可以用 GLOBAL 或 STACK_GLOBAL 匯入任何模組裡的函式，再用 REDUCE 呼叫它。這是為了重建任意 Python 物件而設計的功能，但也代表檔案可以要求在載入時呼叫 `os.system` 之類的函式。Python 官方文件也明確警告：不要 unpickle 不可信任的資料。",
          ],
        },
        {
          heading: "哪些檔案可能是 pickle？",
          body: [],
          list: [
            "PyTorch 的 `.pt`、`.pth`、`.bin`（舊版通常是內含 pickle 的 ZIP 檔）",
            "scikit-learn、joblib 匯出的 `.pkl`、`.joblib`",
            "pandas 的 `read_pickle`、各種快取與 checkpoint 檔",
            "Redis、Celery 等系統中以 pickle 序列化的訊息",
          ],
          tools: ["zip-inspector", "file-signature-checker"],
        },
        {
          heading: "如何在不執行的情況下檢查",
          body: [
            "Python Pickle 安全分析工具會像 `pickletools.dis` 一樣逐一解析 opcode，但完全不執行內容，並列出載入時會匯入的模組與函式。出現 os、subprocess、builtins.eval、exec 等項目時就是高風險。若檔案是 PyTorch 的 ZIP 格式，先用 ZIP 分析工具取出裡面的 `data.pkl` 再檢查。",
            "也建議記錄檔案的 SHA-256，並和官方發布的雜湊值比對，確認下載內容沒有被替換。",
          ],
          tools: ["pickle-analyzer", "zip-inspector", "hash-generator"],
        },
        {
          heading: "更安全的做法",
          body: [],
          list: [
            "模型權重優先使用 safetensors 格式，它只存張量，不能執行程式",
            "PyTorch 2.6 起 `torch.load` 預設 `weights_only=True`，不要為了相容性把它關掉",
            "只從可信任來源下載，並比對官方雜湊值",
            "需要處理不可信任檔案時，在隔離的容器或沙箱中進行",
          ],
        },
      ],
      faq: [
        { question: "靜態分析能保證檔案安全嗎？", answer: "不能完全保證，但能抓出絕大多數直接呼叫危險函式的惡意 pickle。若匯入清單中有不認識的模組，應視為可疑並在隔離環境處理。" },
        { question: "JSON 比 pickle 安全嗎？", answer: "是的。JSON 只能表示資料，解析時不會執行程式。需要跨語言交換資料時，JSON、MessagePack 或 Protocol Buffers 都是較安全的選擇。" },
        { question: "分析工具會上傳我的模型嗎？", answer: "不會。檔案只在瀏覽器中解析，不會送到伺服器。單檔上限為 10 MB。" },
      ],
    },
    en: {
      title: "Check Before You Load an AI Model: Python Pickle Deserialization Risks",
      description: "PyTorch models and caches often use pickle, which can run code when loaded. How the risk works, how to inspect a pickle safely, and safer formats.",
      lead: "Downloading models and datasets is routine now, but many people don't realize that Python's pickle format can execute code at the moment it's loaded. This guide explains why, how to inspect a file without running it, and which formats to use instead.",
      sections: [
        {
          heading: "Why pickle is unsafe",
          body: [
            "Pickle isn't just a data format — it's a small stack machine. It can import any function from any module with GLOBAL or STACK_GLOBAL and call it with REDUCE. That's how it rebuilds arbitrary Python objects, but it also means a file can ask to call something like `os.system` while loading. The Python documentation warns plainly: never unpickle untrusted data.",
          ],
        },
        {
          heading: "Which files might be pickles?",
          body: [],
          list: [
            "PyTorch `.pt`, `.pth` and `.bin` files (usually a ZIP containing a pickle)",
            "`.pkl` and `.joblib` files exported by scikit-learn or joblib",
            "pandas `read_pickle` files, caches and checkpoints",
            "Messages serialized with pickle in systems like Redis or Celery",
          ],
          tools: ["zip-inspector", "file-signature-checker"],
        },
        {
          heading: "How to inspect without executing",
          body: [
            "The Python pickle analyzer walks the opcodes like `pickletools.dis` but never executes anything, and lists the modules and functions loading would import. Entries such as os, subprocess, builtins.eval or exec are high risk. If the file is a PyTorch ZIP, extract the inner `data.pkl` with the ZIP inspector first.",
            "Also record the file's SHA-256 and compare it with the published hash to make sure the download wasn't swapped.",
          ],
          tools: ["pickle-analyzer", "zip-inspector", "hash-generator"],
        },
        {
          heading: "Safer practices",
          body: [],
          list: [
            "Prefer the safetensors format for model weights — it stores tensors only and can't run code",
            "Since PyTorch 2.6, `torch.load` defaults to `weights_only=True`; don't turn it off for convenience",
            "Download only from trusted sources and compare published hashes",
            "Handle untrusted files inside an isolated container or sandbox",
          ],
        },
      ],
      faq: [
        { question: "Does static analysis guarantee a file is safe?", answer: "Not completely, but it catches the vast majority of malicious pickles that call dangerous functions directly. Treat any unfamiliar module in the import list as suspicious and handle the file in isolation." },
        { question: "Is JSON safer than pickle?", answer: "Yes. JSON can only represent data and never runs code when parsed. For cross-language data exchange, JSON, MessagePack or Protocol Buffers are safer choices." },
        { question: "Does the analyzer upload my model?", answer: "No. Files are parsed only in your browser and never sent to a server. The limit is 10 MB per file." },
      ],
    },
  },
  {
    slug: "png-crc-height-ctf",
    icon: "🖼",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["png-crc-fixer", "hex-viewer", "hidden-data-scanner", "lsb-steganography", "exif-viewer"],
    zh: {
      title: "CTF 圖片題：PNG 高度被改怎麼辦？IHDR 與 CRC 修復原理",
      description: "PNG 圖片看起來被裁掉一半？說明 PNG 檔案結構、IHDR 寬高與 CRC32 的關係，以及如何用 CRC 反推原始尺寸並修復圖片。",
      lead: "「圖片下面好像還有東西」是 CTF Misc 最經典的題型之一。出題者把 PNG 的高度改小，看圖軟體就只顯示上半部，但檔案裡其實保留了完整的影像資料。只要理解 PNG 結構，就能把被藏起來的部分找回來。",
      sections: [
        {
          heading: "PNG 的結構",
          body: [
            "PNG 檔以 8 bytes 簽章 `89 50 4E 47 0D 0A 1A 0A` 開頭，後面是一連串 chunk。每個 chunk 都包含：4 bytes 長度、4 bytes 類型、資料，以及 4 bytes CRC32。第一個 chunk 一定是 IHDR，裡面記錄寬度、高度、位元深度與色彩類型；影像資料放在 IDAT，最後以 IEND 結束。",
          ],
          tools: ["hex-viewer"],
        },
        {
          heading: "為什麼改高度會露出破綻？",
          body: [
            "IHDR 的 CRC32 是根據 chunk 類型與資料計算的。出題者修改高度時如果沒有重算 CRC，看圖軟體多半仍會顯示圖片（只是被裁切），但 CRC 已經和內容對不上。因為寬高只有 8 bytes，我們可以暴力嘗試所有可能的寬高組合，找出讓 CRC 吻合的那一組，就是原始尺寸。",
            "就算出題者連 CRC 一起重算，還有另一個線索：IDAT 解壓縮後的資料量。每一列影像資料是 1 byte 濾波器加上像素資料，用總長度除以每列長度，就能算出實際高度。",
          ],
          tools: ["png-crc-fixer"],
        },
        {
          heading: "修復步驟",
          body: [],
          list: [
            "把 PNG 拖進 PNG 寬高與 CRC 修復工具，查看 IHDR CRC 是否正確",
            "CRC 錯誤時，工具會暴力找出符合的寬高並自動填入",
            "CRC 正確但 IDAT 資料量對應的高度不同時，也會提示可能的實際高度",
            "按「修復並預覽」確認完整畫面，再下載修復後的 PNG",
          ],
          tools: ["png-crc-fixer"],
        },
        {
          heading: "其他常見的 PNG 題型",
          body: [
            "如果尺寸沒有問題，接著檢查 IEND 之後有沒有接其他檔案、tEXt 區塊裡有沒有提示，以及 LSB 位元平面是否藏了文字或 QR Code。",
          ],
          tools: ["hidden-data-scanner", "exif-viewer", "lsb-steganography"],
        },
      ],
      faq: [
        { question: "暴力搜尋寬高需要多久？", answer: "通常只會改高度，搜尋一個維度不到一秒。兩個維度都被修改時，工具會在 4096 × 4096 範圍內搜尋，也只需要幾秒。" },
        { question: "修改高度會破壞圖片嗎？", answer: "不會。影像資料完整保留在 IDAT 中，只是 IHDR 宣告的高度變小，修回正確值後就能完整顯示。" },
        { question: "JPEG 也能這樣改嗎？", answer: "JPEG 的尺寸記錄在 SOF 區段，也可以修改，但 JPEG 沒有 CRC，需要依解碼結果手動嘗試。" },
      ],
    },
    en: {
      title: "CTF Image Challenges: Fixing a PNG Whose Height Was Changed (IHDR and CRC)",
      description: "PNG looks cut in half? How the IHDR size and CRC32 fit together, and how to use the CRC to recover the original dimensions and repair the image.",
      lead: "\"There seems to be more below the picture\" is one of the most classic CTF misc challenges. The author shrinks the PNG height so viewers only show the top part, while the file still holds the full image data. Once you understand the PNG structure, you can get the hidden part back.",
      sections: [
        {
          heading: "The PNG structure",
          body: [
            "A PNG starts with the 8-byte signature `89 50 4E 47 0D 0A 1A 0A`, followed by a series of chunks. Each chunk has a 4-byte length, a 4-byte type, the data and a 4-byte CRC32. The first chunk is always IHDR, which holds the width, height, bit depth and color type; image data lives in IDAT, and IEND closes the file.",
          ],
          tools: ["hex-viewer"],
        },
        {
          heading: "Why changing the height gives it away",
          body: [
            "The IHDR CRC32 is computed over the chunk type and data. If the author changes the height without recomputing the CRC, most viewers still show the (cropped) image, but the CRC no longer matches. Because the width and height are only 8 bytes, we can brute-force size combinations until the CRC matches — that's the original size.",
            "Even if the CRC was recomputed too, there's another clue: the size of the inflated IDAT data. Each image row is one filter byte plus the pixel data, so dividing the total length by the row length gives the real height.",
          ],
          tools: ["png-crc-fixer"],
        },
        {
          heading: "Repair steps",
          body: [],
          list: [
            "Drop the PNG into the PNG CRC & dimension fixer and check whether the IHDR CRC is valid",
            "If the CRC is wrong, the tool brute-forces the matching size and fills it in",
            "If the CRC is valid but the IDAT size implies a different height, the tool suggests it",
            "Click Repair and preview to see the full image, then download the repaired PNG",
          ],
          tools: ["png-crc-fixer"],
        },
        {
          heading: "Other common PNG challenges",
          body: [
            "If the size is fine, check for files appended after IEND, hints in tEXt chunks, and text or QR codes hidden in the LSB bit planes.",
          ],
          tools: ["hidden-data-scanner", "exif-viewer", "lsb-steganography"],
        },
      ],
      faq: [
        { question: "How long does the size brute force take?", answer: "Usually only the height is changed, and searching one dimension takes under a second. If both were modified, the tool searches up to 4096 × 4096, which still takes only a few seconds." },
        { question: "Does changing the height damage the image?", answer: "No. The image data stays intact in IDAT; only the height declared in IHDR is smaller. Restore the correct value and the full image shows again." },
        { question: "Can JPEGs be modified the same way?", answer: "A JPEG's size lives in its SOF segment and can be changed too, but JPEG has no CRC, so you have to try values and check the decoded result by hand." },
      ],
    },
  },
  {
    slug: "phishing-link-check",
    icon: "🎣",
    published: "2026-10-24",
    updated: "2026-10-24",
    tools: ["url-risk-analyzer", "url-defanger", "email-header-analyzer", "qr-code-decoder", "ioc-extractor", "layered-decoder"],
    zh: {
      title: "收到可疑連結怎麼辦？不點開也能判斷釣魚網址的方法",
      description: "教你在不開啟連結的情況下拆解網址、辨識常見釣魚手法（帳密嵌入、同形字、短網址、QR Code），檢查郵件標頭，並安全地分享給資安團隊。",
      lead: "釣魚郵件與簡訊越做越逼真，但網址本身常常會露出馬腳。這篇整理不需要點開連結就能做的檢查，適合一般使用者自保，也適合 SOC 分析師快速初判。",
      sections: [
        {
          heading: "先看真正的網域",
          body: [
            "網址中真正決定前往哪裡的是 `://` 之後、第一個 `/` 之前的主機名稱，而且要從右往左讀。`https://secure.bank.example.evil.test/login` 真正的網域是 `evil.test`，前面的字只是子網域，任何人都能取。",
          ],
          tools: ["url-risk-analyzer"],
        },
        {
          heading: "常見的釣魚手法",
          body: [],
          list: [
            "帳密嵌入：`https://bank.com@evil.test/`，@ 前面的字會被忽略",
            "同形字與 Punycode：用西里爾字母 а 取代英文 a，網址顯示為 `xn--` 開頭",
            "直接使用 IP 位址或非標準 Port",
            "短網址與多層轉址，隱藏最終目的地",
            "把連結藏在 QR Code 裡（Quishing），繞過郵件過濾",
            "網址參數裡藏著經過 URL 或 Base64 編碼的目標網址",
          ],
          tools: ["url-risk-analyzer", "qr-code-decoder", "layered-decoder"],
        },
        {
          heading: "檢查郵件本身",
          body: [
            "如果連結來自 Email，檢查郵件標頭裡的 SPF、DKIM 與 DMARC 結果，以及 From、Reply-To、Return-Path 是否一致。顯示名稱可以隨便寫，但這些技術欄位比較難偽造。",
          ],
          tools: ["email-header-analyzer"],
        },
        {
          heading: "安全地回報與分享",
          body: [
            "把可疑網址貼到聊天群組或工單時，先做 defang（例如把 `https://` 改成 `hxxps://`、`.` 改成 `[.]`），避免別人誤點或系統自動預覽。整理事件時，可以用 IOC 擷取工具一次抓出內文中的網址、網域、IP 與雜湊值。",
          ],
          tools: ["url-defanger", "ioc-extractor"],
        },
        {
          heading: "不小心點開了怎麼辦？",
          body: [],
          list: [
            "沒有輸入任何資料：關閉分頁，清除瀏覽器下載的檔案",
            "輸入了帳號密碼：立即到官方網站（不要用郵件裡的連結）修改密碼，並開啟兩步驟驗證",
            "輸入了信用卡資料：聯絡發卡銀行停卡",
            "公司設備：立刻通報資安或 IT 團隊",
          ],
        },
      ],
      faq: [
        { question: "網址有 HTTPS 鎖頭就安全嗎？", answer: "不一定。HTTPS 只代表連線有加密，釣魚網站也能免費取得憑證。真正要確認的是網域是否為官方網域。" },
        { question: "用這些工具分析網址會連到該網站嗎？", answer: "不會。工具只在瀏覽器中拆解網址字串，不會發出任何連線，可以安全地分析惡意連結。" },
        { question: "什麼是 defang？", answer: "Defang 是把網址改成無法直接點擊的格式，例如 hxxps://evil[.]com，方便在報告與聊天中安全分享。" },
      ],
    },
    en: {
      title: "Got a Suspicious Link? How to Spot a Phishing URL Without Clicking It",
      description: "Break down a URL without opening it, spot common phishing tricks like look-alike domains and QR codes, check email headers and share links safely.",
      lead: "Phishing emails and texts keep getting more convincing, but the URL itself often gives the game away. Here are checks you can run without clicking the link — useful for protecting yourself and for SOC analysts doing quick triage.",
      sections: [
        {
          heading: "Find the real domain first",
          body: [
            "What actually decides where a URL goes is the host name between `://` and the first `/`, read from right to left. The real domain of `https://secure.bank.example.evil.test/login` is `evil.test`; everything before it is a subdomain anyone can choose.",
          ],
          tools: ["url-risk-analyzer"],
        },
        {
          heading: "Common phishing tricks",
          body: [],
          list: [
            "Embedded credentials: in `https://bank.com@evil.test/`, everything before @ is ignored",
            "Look-alike characters and Punycode: a Cyrillic а in place of a Latin a, shown as a domain starting with `xn--`",
            "Raw IP addresses or non-standard ports",
            "Short links and redirect chains that hide the final destination",
            "Links hidden in QR codes (quishing) to slip past email filters",
            "Destination URLs hidden in parameters with URL or Base64 encoding",
          ],
          tools: ["url-risk-analyzer", "qr-code-decoder", "layered-decoder"],
        },
        {
          heading: "Check the email itself",
          body: [
            "If the link came by email, check the SPF, DKIM and DMARC results in the headers and whether From, Reply-To and Return-Path agree. Anyone can set a display name, but these technical fields are much harder to fake.",
          ],
          tools: ["email-header-analyzer"],
        },
        {
          heading: "Report and share safely",
          body: [
            "Before pasting a suspicious URL into chat or a ticket, defang it (for example `https://` to `hxxps://` and `.` to `[.]`) so nobody clicks it by accident and nothing auto-previews it. When writing up an incident, the IOC extractor pulls every URL, domain, IP and hash out of the text at once.",
          ],
          tools: ["url-defanger", "ioc-extractor"],
        },
        {
          heading: "What if you already clicked?",
          body: [],
          list: [
            "You didn't enter anything: close the tab and delete anything it downloaded",
            "You entered a username and password: change the password on the official site (not through the email link) and turn on two-factor authentication",
            "You entered card details: call your bank to block the card",
            "On a work device: report it to your security or IT team right away",
          ],
        },
      ],
      faq: [
        { question: "Is a URL with the HTTPS padlock safe?", answer: "Not necessarily. HTTPS only means the connection is encrypted, and phishing sites get free certificates too. What matters is whether the domain is the official one." },
        { question: "Do these tools connect to the site?", answer: "No. They only take the URL string apart in your browser and make no connections, so malicious links are safe to analyze." },
        { question: "What does defang mean?", answer: "Defanging rewrites a URL so it can't be clicked directly, such as hxxps://evil[.]com, making it safe to share in reports and chat." },
      ],
    },
  },
];

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export function guidesForTool(slug: string) {
  return guides.filter((guide) => guide.tools.includes(slug));
}
