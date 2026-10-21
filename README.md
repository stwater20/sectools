# SecTools 資安工具箱 · Security Toolkit

**🌐 [tools.sectools.tw](https://tools.sectools.tw/)（繁體中文） · [tools.sectools.tw/en](https://tools.sectools.tw/en/)（English）**

51 個免費線上資安與 CTF 工具，全部在瀏覽器本機運算：JWT 解碼／驗簽／偽造、Hash、CIDR、CVSS、IOC、PCAP、RSA 自動求解、Vigenère 破解、LSB 隱寫、QR 解碼、binwalk 式隱藏檔案掃描……免註冊、無廣告、不追蹤，輸入資料不會離開你的電腦。

> **English:** 61 free online security and CTF tools that run entirely in your browser — JWT decode/verify/forge, hashing, CIDR, CVSS, IOC extraction, PCAP summaries, an RSA auto-solver, a Vigenère cracker, LSB steganography, QR decoding and a binwalk-style embedded file scanner, a CyberChef-style recipe chain, AES/DES/RC4, ZIP and PNG repair, EXIF/GPS, audio spectrograms, and PHP/pickle deserialization analysis. No sign-up, no ads, no tracking; your input never leaves your machine. A privacy-first alternative to pasting secrets into online tools, inspired by CyberChef, dCode, RsaCtfTool, Stegsolve and binwalk.

## 目前工具

- 編碼與雜湊：Base64、URL Codec、Hash、HMAC、SRI
- 密碼與驗證：JWT Decoder、JWT/JWK Signature Verifier、安全密碼產生器、密碼強度檢查、TOTP/HOTP 驗證碼
- 威脅分析：IOC Extractor、URL Defang / Refang、Entropy Calculator
- 網路與風險：IPv4 CIDR Calculator、IPv4 CIDR Aggregator、IPv6 CIDR Calculator、IPv4/IPv6 位址轉換、HTTP Message Parser、DNS Wire Message Decoder、CVSS v3.1 Calculator
- 網站與郵件：Security Headers Analyzer、CSP Policy Analyzer、Email Header Analyzer
- 鑑識與分析：File Signature Checker、PCAP Summary Analyzer、String Extractor、Forensic Timestamp Decoder
- 進階分析：Secret Scanner、Hash Identifier、Hex Viewer、Suspicious URL Analyzer、chmod Calculator
- CTF：Recipe 串接解碼器（CyberChef 式）、PHP 反序列化檢視與編輯、RSA 自動求解器、Vigenère 密碼破解、古典密碼工具組（Atbash／ROT47／Affine／Rail Fence／Bacon）、字母頻率分析、摩斯密碼、JWT 偽造、Brainfuck／Ook!、QR Code 解碼、XOR Tool、Caesar Brute Force、Base/ASCII Converter、Integer Pack/Unpack、Cyclic Pattern 偏移計算（pwntools cyclic）、AES／DES／3DES／RC4 加解密、RSA Math Helper、Unicode/Escape Codec、多層編碼解碼器、Path Traversal Analyzer
- 隱寫與鑑識：Python Pickle 安全分析（靜態反組譯）、LSB 隱寫分析（位元平面檢視）、檔案隱藏資料掃描器（binwalk-lite）、ZIP 分析（偽加密修復、ZipCrypto 字典攻擊）、PNG 寬高／CRC 修復、EXIF／GPS 中繼資料檢視、音訊頻譜圖與 DTMF 解碼、gzip／zlib 解壓縮、Base32／58／85／91 編解碼

每個工具都有中英文獨立靜態網址（`/<tool>/` 與 `/en/<tool>/`）、SEO metadata、hreflang、結構化資料與安全使用提醒。

## 網站功能

- **全站快速搜尋**：任何頁面按 `Ctrl/⌘ + K`（或 `/`）開啟搜尋面板，支援中英文、多關鍵字與方向鍵操作。
- **可分享的篩選網址**：首頁搜尋與分類會同步到網址，例如 `/?q=jwt`、`/?category=ctf`，也作為 Google Sitelinks Search Box 的 `SearchAction`。
- **分類頁**：`/categories/<slug>/` 為每個分類提供獨立介紹與工具清單，並列入 sitemap。
- **收藏與最近使用**：首頁卡片與工具頁皆可收藏；造訪工具頁會自動記入最近使用（僅存 slug 於 localStorage）。
- **深色模式**：預設跟隨系統，可手動切換並記住選擇。
- **中英雙語**：`/en/` 提供完整英文版（含每個工具的操作介面）。工具介面以 `t("中文")` 呼叫翻譯，英文字典在 `lib/i18n-en.ts`；頁面內容在 `lib/content-en.ts`。
- **曝光**：`/llms.txt` 給 AI 搜尋與助理、部署後自動通知 IndexNow（Bing 等），並可用 repository variables 設定 Google／Bing 驗證碼。詳見 [docs/GROWTH.md](docs/GROWTH.md)。
- **SEO**：每頁具 canonical、Open Graph／Twitter、`WebApplication`／`BreadcrumbList`／`FAQPage`／`ItemList` 結構化資料、Web App Manifest 與 sitemap。

## 本機開發

需求：Node.js 22.13 或更新版本。

```bash
npm ci
npm run dev
```

完整驗證：

```bash
npm run check
```

瀏覽器端對端測試（逐一以中英文介面驗證每個工具的計算結果、搜尋與收藏流程，並檢查各頁在 320–1280px 不會水平溢出；需先 build）：

```bash
npx playwright install chromium   # 第一次執行時
npm run test:e2e
```

靜態輸出位於 `out/`。

## GitHub Pages

Repo 已包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 後：

1. 在 GitHub repo 的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。
2. Workflow 會自動判斷 user site（`owner.github.io`）或 project site（`owner.github.io/repo`）的 base path。
3. 如使用自訂網域，將 `NEXT_PUBLIC_SITE_URL` 與 DNS 設定改為正式網址，並在 `public/` 加入 `CNAME`。

目前正式網域設定為 `tools.sectools.tw`；自訂網域從網站根目錄提供內容，因此 GitHub Actions 會停用 `/sectools` base path，避免 CSS/JavaScript 資源路徑錯誤。

## 安全模型

- Repo 原始碼不使用第三方 CDN、字型、追蹤器或遠端腳本；Cloudflare edge 功能若注入額外腳本，需在 Cloudflare 端另行治理。
- 使用 Web Crypto API 處理 Hash、HMAC 與密碼學安全亂數。
- 所有輸入限制為 2 MB，避免意外貼入大型資料造成瀏覽器卡住。
- 不使用 `innerHTML` 呈現使用者輸入；結果一律當作純文字。
- 收藏與最近使用只存工具 slug，不保存工具輸入或結果。

GitHub Pages 無法自訂 HTTP response headers。請在自訂網域前方的 Cloudflare / reverse proxy 設定 CSP、HSTS、Permissions-Policy 等 response headers；不要使用 HTML `<meta http-equiv="Content-Security-Policy">`，Cloudflare 的自動 nonce／分析功能可能改寫該標籤並阻止 Next.js hydration。建議加入：

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
X-Content-Type-Options: nosniff
```

Cloudflare 端也應關閉 Zaraz 與 Web Analytics 自動注入，避免加入未由 repo 管理的追蹤腳本，並在每次部署後以真實瀏覽器驗證至少一個互動工具。

## 新增工具

1. 在 `lib/tool-catalog.ts` 加入工具 metadata（分類需已存在於 `categories`；新增分類時一併填寫 `slug`、`summary` 與 `intro`）。
2. 在 `components/tool-workbench.tsx` 實作純前端操作介面。
3. 將可測試的核心運算放進 `lib/tool-utils.ts`，補上測試。
4. 在 `lib/content-en.ts` 加入英文頁面內容；工具介面的中文字串用 `t()` 包起來，並在 `lib/i18n-en.ts` 補上英文（單元測試會檢查是否漏翻）。
5. 在 `tests/e2e/site.e2e.mjs` 的 `specs` 加入該工具的瀏覽器測試（中英文頁面都會跑）。
6. 執行 `npm run check` 與 `npm run test:e2e`。

## 授權

程式碼建議以 MIT License 發布；品牌名稱與識別仍屬 SecTools.tw。
