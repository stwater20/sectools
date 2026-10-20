# 曝光與成長計畫（Growth playbook）

網站本身已做好的部分，以及需要網站擁有者在站外執行的步驟。

## 已在程式內完成

| 項目 | 內容 |
|---|---|
| 中英雙語 | 每個頁面都有 `/…` 與 `/en/…` 兩個版本，`<html lang>`、canonical 與 hreflang（zh-Hant-TW / en / x-default）皆正確 |
| Sitemap | `/sitemap.xml` 含 118 個網址，每筆都列出另一語言的對應頁 |
| 結構化資料 | WebSite + SearchAction、Organization、ItemList、WebApplication、HowTo、BreadcrumbList、FAQPage、CollectionPage |
| 長尾內容 | 每個工具頁都有獨立的介紹、步驟、使用情境與 FAQ（中英各一份） |
| 分享預覽 | 中文 `og.jpg`、英文 `og-en.jpg`，Twitter／X summary_large_image |
| AI 搜尋 | `/llms.txt` 以純文字列出所有工具與說明，方便 ChatGPT、Perplexity、Claude 等引用 |
| IndexNow | 每次部署後自動把 sitemap 網址送給 IndexNow（Bing、Yandex、Seznam、Naver 等） |
| 驗證碼 | 可用 repository variables 設定 `GOOGLE_SITE_VERIFICATION`、`BING_SITE_VERIFICATION` |

## 站外步驟（依效益排序）

### 1. 搜尋引擎（第一週，約 30 分鐘）
1. **Google Search Console**：新增網域資源 `sectools.tw`（DNS TXT 驗證最穩），或新增網址資源 `https://tools.sectools.tw/` 並把驗證碼存成 repository variable `GOOGLE_SITE_VERIFICATION`。接著提交 `https://tools.sectools.tw/sitemap.xml`。
2. **Bing Webmaster Tools**：可直接從 Search Console 匯入；或把驗證碼存成 `BING_SITE_VERIFICATION`。Bing 也會供應 DuckDuckGo、Yahoo 與 ChatGPT 搜尋。
3. 兩週後在 Search Console 檢查「網頁」報表，確認中英文頁面都已被索引、hreflang 沒有錯誤。

### 2. 開發者與資安社群清單（高品質反向連結）
在 GitHub 上對這些清單送 PR（請先閱讀各清單的貢獻規則）：
- `apsdehal/awesome-ctf`（Tools → Crypto / Steganography / Misc）
- `sindresorhus/awesome` 底下的資安相關清單，例如 `sbilly/awesome-security`、`qazbnm456/awesome-web-security`
- `devsecops/awesome-devsecops`、`onlurking/awesome-infosec`
- `meirwah/awesome-incident-response`（IOC、PCAP、時間戳等工具）
- CTF 教學站與 Wiki（例如 CTF Wiki 的工具頁）

也把 GitHub repo 的 **About** 填上網址，並加上 topics：`ctf-tools`、`security-tools`、`cyberchef-alternative`、`jwt`、`steganography`、`rsa`、`privacy`、`nextjs`。

### 3. 發布與社群（集中在同一週，效果最好）
- **Hacker News**：`Show HN: 51 security/CTF tools that run entirely in your browser`，強調「不上傳」與開源。
- **Reddit**：r/securityCTF、r/cybersecurity、r/netsec（遵守自我推廣規則，先貢獻內容）、r/webdev。
- **Product Hunt**：準備 5 張截圖（首頁、RSA 求解、LSB 隱寫、深色模式、手機）。
- **X／Mastodon（infosec.exchange）**：每天介紹一個工具，附 GIF 示範。
- **台灣社群**：PTT（Soft_Job、資安相關板）、Dcard 資訊安全版、Facebook 台灣資安社群、HITCON／CTF 相關 Telegram 與 Discord、iThome 投稿。
- **CTF 賽事**：在 CTFtime 的隊伍頁或 writeup 中引用工具連結；贊助或合作校園 CTF，把工具放進題目提示。

### 4. 持續產生內容（長期 SEO）
- 針對高搜尋量問題寫教學文，例如「CTF RSA 題型整理」、「如何判斷是哪種 Base 編碼」、「JWT alg=none 攻擊原理」，每篇連到對應工具。
- 每次新增工具就在 README 與社群更新一次，IndexNow 會自動通知搜尋引擎。
- 在 Search Console 觀察哪些查詢有曝光但點擊率低，優化那些頁面的標題與描述。

### 5. 衡量方式（不加追蹤碼）
網站刻意不放分析腳本。建議用：
- Google Search Console／Bing Webmaster 的曝光、點擊與排名。
- Cloudflare 的匿名流量統計（伺服器端，不注入腳本；記得關閉 Web Analytics 自動注入）。
- GitHub repo 的 Traffic 頁（訪客與來源網站）。
