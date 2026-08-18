# SecTools.tw Toolkit

一個真的能用、可稽核、可部署到 GitHub Pages 的繁體中文資安工具庫。所有工具預設只在瀏覽器本機運算，不含分析腳本、廣告或後端 API。

## 目前工具

- 編碼與雜湊：Base64、URL Codec、Hash、HMAC、SRI
- 密碼與驗證：JWT Decoder、JWT/JWK Signature Verifier、安全密碼產生器、密碼強度檢查、TOTP/HOTP 驗證碼
- 威脅分析：IOC Extractor、URL Defang / Refang、Entropy Calculator
- 網路與風險：IPv4 CIDR Calculator、IPv4 CIDR Aggregator、IPv6 CIDR Calculator、IPv4/IPv6 位址轉換、HTTP Message Parser、DNS Wire Message Decoder、CVSS v3.1 Calculator
- 網站與郵件：Security Headers Analyzer、CSP Policy Analyzer、Email Header Analyzer
- 鑑識與分析：File Signature Checker、PCAP Summary Analyzer、String Extractor、Forensic Timestamp Decoder
- 進階分析：Secret Scanner、Hash Identifier、Hex Viewer、Suspicious URL Analyzer、chmod Calculator
- CTF：XOR Tool、Caesar Brute Force、Base/ASCII Converter、Integer Pack/Unpack、RSA Math Helper、Unicode/Escape Codec、多層編碼解碼器、Path Traversal Analyzer

每個工具都有獨立靜態網址、SEO metadata、結構化資料與安全使用提醒。

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

1. 在 `lib/tool-catalog.ts` 加入工具 metadata。
2. 在 `components/tool-workbench.tsx` 實作純前端操作介面。
3. 將可測試的核心運算放進 `lib/tool-utils.ts`，補上測試。
4. 執行 `npm run check`，確認靜態輸出與所有工具頁都成功產生。

## 授權

程式碼建議以 MIT License 發布；品牌名稱與識別仍屬 SecTools.tw。
