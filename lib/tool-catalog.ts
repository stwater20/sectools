export type ToolCategory = "編碼與雜湊" | "威脅分析" | "網路與風險" | "密碼與驗證" | "鑑識與分析" | "CTF 工具";

export type ToolDefinition = {
  slug: string;
  name: string;
  englishName: string;
  description: string;
  category: ToolCategory;
  icon: string;
  tags: string[];
  featured?: boolean;
  status?: "new" | "popular";
  guide?: {
    intro: string;
    steps: [string, string, string];
    useCases: [string, string, string];
  };
};

export type CategoryDefinition = {
  name: ToolCategory;
  label: string;
  slug: string;
  title: string;
  summary: string;
  intro: string;
  useCase: string;
};

export const categories: CategoryDefinition[] = [
  {
    name: "編碼與雜湊",
    label: "ENCODE",
    slug: "encoding",
    title: "編碼與雜湊工具",
    summary: "Base64、URL、Hash、HMAC 與 SRI，處理日常資料格式與完整性驗證。",
    intro: "從 API 除錯、檔案比對到前端資源完整性，編碼與雜湊是資安工作最常用的基本功。這裡的工具使用瀏覽器 Web Crypto API 計算，正確處理 UTF-8 中文，結果可直接複製到報告或設定檔。",
    useCase: "處理 API、檔案驗證、資料編碼與惡意程式分析時常見的格式。",
  },
  {
    name: "威脅分析",
    label: "THREAT INTEL",
    slug: "threat-intel",
    title: "威脅分析與事件調查工具",
    summary: "IOC 擷取、URL defang、郵件標頭與機敏資訊掃描，加速 SOC 告警初判。",
    intro: "SOC 分析師每天面對告警、釣魚郵件與威脅情資報告。這組工具協助你從雜亂文字中擷取 IOC、安全地分享惡意連結、檢查郵件驗證結果，並在提交程式碼或日誌前掃出外洩的金鑰。",
    useCase: "整理事件調查、SOC 告警、釣魚郵件與 Threat Intelligence 資料。",
  },
  {
    name: "網路與風險",
    label: "NETWORK",
    slug: "network",
    title: "網路、Web 安全與風險評估工具",
    summary: "CIDR、IPv6、HTTP、DNS、CSP、安全標頭與 CVSS，涵蓋網路設定到弱點評分。",
    intro: "從防火牆規則的網段計算、HTTP 與 DNS 封包解析，到 Security Headers、CSP 檢查與 CVSS v3.1 評分，這些工具協助網路與 Web 安全工程師快速完成設定檢查與風險溝通。",
    useCase: "輔助網路設定、弱點管理、Web 安全檢查與風險溝通。",
  },
  {
    name: "密碼與驗證",
    label: "AUTH",
    slug: "auth",
    title: "密碼、JWT 與身分驗證工具",
    summary: "JWT 解碼與驗簽、密碼產生、強度檢查與 TOTP，檢視身分驗證流程。",
    intro: "身分驗證是攻擊者最常鎖定的入口。這組工具讓你在本機解碼並驗證 JWT 簽章、產生高強度密碼、評估密碼強度，以及計算 TOTP／HOTP 驗證碼，敏感資料不會離開瀏覽器。",
    useCase: "檢查身分驗證、Token、密碼與多因素驗證流程。",
  },
  {
    name: "鑑識與分析",
    label: "FORENSICS",
    slug: "forensics",
    title: "數位鑑識與檔案分析工具",
    summary: "檔案簽章、隱藏檔案掃描、LSB 隱寫、PCAP 摘要、字串擷取與 Hex 檢視，快速初篩證據。",
    intro: "數位鑑識的第一步通常是快速初篩：這個檔案真的是它宣稱的格式嗎？封包裡有哪些主機？二進位檔藏了什麼字串？這些工具直接在瀏覽器讀取檔案，不上傳證據，適合事件應變現場使用。",
    useCase: "快速初篩檔案、時間戳與二進位證據，再交由正式鑑識流程確認。",
  },
  {
    name: "CTF 工具",
    label: "CTF",
    slug: "ctf",
    title: "CTF 解題工具",
    summary: "RSA 求解、Vigenère 破解、古典密碼、摩斯碼、XOR、QR Code 與多層解碼，CTF 選手的常備工具。",
    intro: "Crypto、Pwn、Web 與 Misc 題目常需要反覆轉換資料。這組 CTF 工具參考 CyberChef、dCode 與 RsaCtfTool 的常用功能，整合 RSA 自動求解、Vigenère 與古典密碼破解、字頻分析、摩斯碼、XOR、JWT 偽造、Brainfuck 與 QR Code 解碼，讓你專注在解題思路而不是寫一次性腳本。",
    useCase: "解答密碼學、Pwn、Web 與資料編碼類 CTF 題目。",
  },
];

export function findCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function categoryOf(tool: ToolDefinition) {
  return categories.find((category) => category.name === tool.category)!;
}

export const toolCatalog: ToolDefinition[] = [
  {
    slug: "hash-generator",
    name: "雜湊產生器",
    englishName: "Hash Generator",
    description: "快速計算 SHA-1、SHA-256、SHA-384 與 SHA-512，適合比對檔案與事件證據。",
    category: "編碼與雜湊",
    icon: "#",
    tags: ["hash", "sha256", "checksum", "雜湊"],
    featured: true,
    status: "popular",
  },
  {
    slug: "base64-codec",
    name: "Base64 編解碼",
    englishName: "Base64 Codec",
    description: "正確處理 UTF-8 中文文字的 Base64 編碼與解碼。",
    category: "編碼與雜湊",
    icon: "64",
    tags: ["base64", "encode", "decode", "編碼"],
    featured: true,
  },
  {
    slug: "url-codec",
    name: "URL 編解碼",
    englishName: "URL Codec",
    description: "安全地編碼或還原查詢字串、路徑與特殊字元。",
    category: "編碼與雜湊",
    icon: "%",
    tags: ["url", "percent encoding", "decode"],
  },
  {
    slug: "hmac-generator",
    name: "HMAC 產生器",
    englishName: "HMAC Generator",
    description: "使用本機 Web Crypto 建立 HMAC-SHA256/384/512 訊息驗證碼。",
    category: "編碼與雜湊",
    icon: "H",
    tags: ["hmac", "signature", "sha256", "api"],
  },
  {
    slug: "sri-generator",
    name: "SRI 完整性雜湊",
    englishName: "SRI Hash Generator",
    description: "為前端資源產生 Subresource Integrity sha384 屬性值。",
    category: "編碼與雜湊",
    icon: "S",
    tags: ["sri", "integrity", "frontend", "supply chain"],
    status: "new",
  },
  {
    slug: "jwt-decoder",
    name: "JWT 解碼器",
    englishName: "JWT Decoder",
    description: "在本機檢視 JWT header、payload、到期時間與常見安全警訊。",
    category: "密碼與驗證",
    icon: "J",
    tags: ["jwt", "token", "oauth", "authentication"],
    featured: true,
    status: "popular",
  },
  {
    slug: "jwt-signature-verifier",
    name: "JWT／JWK 簽章驗證器",
    englishName: "JWT Signature Verifier",
    description: "使用本機 Web Crypto 驗證 HS、RS、PS、ES 系列 JWT 簽章，公開金鑰與 Secret 不會送出瀏覽器。",
    category: "密碼與驗證",
    icon: "✓J",
    tags: ["jwt verify", "jwk", "jwks", "oauth", "openid connect"],
    featured: true,
    status: "new",
    guide: {
      intro: "JWT 能被 Base64URL 解碼不代表簽章有效。本工具依 Header alg 選擇固定的 Web Crypto 驗章演算法，拒絕 alg=none，且不會自動從網路下載 JWKS。",
      steps: ["貼上完整三段式 JWT，再輸入 HS Secret 或可信來源提供的公開 JWK JSON。", "驗證後核對 alg、金鑰類型、簽章結果，以及 exp、nbf、iat 時間警告。", "簽章有效只代表內容未被該金鑰竄改；仍需由應用程式驗證 issuer、audience、nonce 與授權規則。"],
      useCases: ["排查 OAuth、OpenID Connect 與 API Gateway 的 JWT 驗章問題。", "在不把 Token 或金鑰傳到第三方網站的前提下核對簽章。", "分析 CTF、事件調查或測試環境中的 HS／RSA／ECDSA JWT。"],
    },
  },
  {
    slug: "password-generator",
    name: "安全密碼產生器",
    englishName: "Password Generator",
    description: "使用密碼學安全亂數產生器建立可自訂規則的強密碼。",
    category: "密碼與驗證",
    icon: "✦",
    tags: ["password", "random", "credential", "密碼"],
    featured: true,
  },
  {
    slug: "password-strength",
    name: "密碼強度檢查",
    englishName: "Password Strength Checker",
    description: "估算熵值並找出常見字串、重複模式與組成弱點。",
    category: "密碼與驗證",
    icon: "▰",
    tags: ["password", "entropy", "strength", "密碼強度"],
  },
  {
    slug: "otp-generator",
    name: "TOTP／HOTP 驗證碼",
    englishName: "TOTP & HOTP Generator",
    description: "使用本機 Web Crypto 依 RFC 4226／6238 計算一次性驗證碼，支援 SHA-1、SHA-256 與 SHA-512。",
    category: "密碼與驗證",
    icon: "OTP",
    tags: ["totp", "hotp", "mfa", "2fa", "rfc 6238"],
    featured: true,
    status: "new",
    guide: {
      intro: "TOTP 與 HOTP 是雙因素驗證常見的一次性密碼標準。本工具可離線重現 Authenticator 驗證碼，用來測試 MFA 串接、CTF 題目或核對伺服器實作。",
      steps: ["貼上服務提供的 Base32 Secret，選擇時間型 TOTP 或 Counter 型 HOTP。", "依服務端設定選擇驗證碼位數、HMAC 演算法與週期或 Counter。", "產生驗證碼後立即核對；TOTP 會隨時間週期失效，HOTP 使用後應遞增 Counter。"],
      useCases: ["測試 RFC 4226 HOTP 與 RFC 6238 TOTP 實作是否一致。", "排查 MFA、2FA 或 Authenticator 因時間偏差造成的驗證失敗。", "解答需要一次性密碼、Base32 或 HMAC 的資安與 CTF 題目。"],
    },
  },
  {
    slug: "ioc-extractor",
    name: "IOC 指標擷取器",
    englishName: "IOC Extractor",
    description: "從事件報告或 Log 一次擷取 IP、網域、URL、Email 與雜湊值。",
    category: "威脅分析",
    icon: "◎",
    tags: ["ioc", "ip", "domain", "hash", "threat intelligence"],
    featured: true,
    status: "popular",
  },
  {
    slug: "url-defanger",
    name: "URL Defang / Refang",
    englishName: "URL Defanger",
    description: "將可疑 URL 與 IP 去武器化，或還原分析報告中的安全格式。",
    category: "威脅分析",
    icon: "[.]",
    tags: ["defang", "refang", "url", "malware"],
    featured: true,
  },
  {
    slug: "entropy-calculator",
    name: "資料熵值計算器",
    englishName: "Entropy Calculator",
    description: "計算 Shannon entropy，協助辨識壓縮、加密或混淆內容。",
    category: "威脅分析",
    icon: "Σ",
    tags: ["entropy", "forensics", "malware", "shannon"],
  },
  {
    slug: "cidr-calculator",
    name: "IPv4 CIDR 計算器",
    englishName: "CIDR Calculator",
    description: "計算網路位址、廣播位址、遮罩、可用主機數與 IP 範圍。",
    category: "網路與風險",
    icon: "/",
    tags: ["cidr", "subnet", "ipv4", "network"],
    featured: true,
  },
  {
    slug: "ip-address-converter",
    name: "IP 位址轉換器",
    englishName: "IPv4 & IPv6 Address Converter",
    description: "正規化 IPv4／IPv6，並轉換成展開格式、整數、Hex、Binary 與 Reverse DNS 名稱。",
    category: "網路與風險",
    icon: "IP",
    tags: ["ipv4", "ipv6", "hex", "reverse dns", "network"],
    featured: true,
    status: "new",
    guide: {
      intro: "IP 位址在封包、Log、DNS 與 CTF 題目中常以不同格式出現。本工具同時處理 IPv4 與 IPv6，協助確認同一位址的正規化、整數與十六進位表示。",
      steps: ["輸入一個 IPv4 或 IPv6 位址；IPv6 可使用 :: 壓縮，也可保留成對方括號。", "按下解析與轉換，檢查正規化、完整展開、Decimal、Hex 與 Binary 結果。", "需要 PTR 查詢名稱時，複製產生的 in-addr.arpa 或 ip6.arpa Reverse DNS 名稱。"],
      useCases: ["正規化 SOC、Firewall、Proxy 與 Web Log 裡的 IPv6 位址。", "在惡意程式分析或 CTF 中轉換 IPv4 整數、Hex 與 Binary。", "產生 IPv4／IPv6 的 Reverse DNS PTR 查詢名稱。"],
    },
  },
  {
    slug: "ipv6-cidr-calculator",
    name: "IPv6 CIDR 計算器",
    englishName: "IPv6 CIDR Calculator",
    description: "計算 IPv6 prefix 的網路位址、範圍、位址數與 Reverse DNS zone，並輸出 RFC 5952 正規格式。",
    category: "網路與風險",
    icon: "/6",
    tags: ["ipv6", "cidr", "prefix", "subnet", "reverse dns"],
    featured: true,
    status: "new",
    guide: {
      intro: "IPv6 網段通常以 prefix length 表示，手動展開 128-bit 位址很容易出錯。本工具可離線計算網路邊界、完整範圍與 nibble-aligned Reverse DNS zone。",
      steps: ["輸入 IPv6 位址與 prefix，例如 2001:db8:1234:5678::1/64。", "計算後核對 RFC 5952 壓縮格式、完整展開格式與首末位址。", "若 prefix 為 4 的倍數，可複製產生的 ip6.arpa Reverse DNS zone。"],
      useCases: ["規劃 IPv6 subnet、ACL、Firewall 與 SIEM 網段條件。", "確認某個壓縮 IPv6 位址所屬的 prefix 範圍。", "產生 IPv6 PTR delegation 使用的 ip6.arpa zone。"],
    },
  },
  {
    slug: "ipv4-cidr-aggregator",
    name: "IPv4 CIDR 合併器",
    englishName: "IPv4 CIDR Aggregator",
    description: "合併重疊與相鄰的 IPv4 位址或 CIDR，輸出涵蓋相同範圍的最小網段清單。",
    category: "網路與風險",
    icon: "Σ/",
    tags: ["ipv4", "cidr aggregation", "subnet", "firewall", "acl"],
    featured: true,
    status: "new",
    guide: {
      intro: "Firewall、ACL、SIEM 與 Threat Intel 清單常累積大量重疊網段。本工具會在本機將它們轉成精確、無額外放寬範圍的最小 IPv4 CIDR 集合。",
      steps: ["每行貼上一個 IPv4 或 CIDR；單一 IP 會視為 /32，也支援逗號與 # 註解。", "執行後核對輸入筆數、實際涵蓋位址數與壓縮後的 CIDR 數量。", "複製結果到 Firewall、ACL 或 SIEM 前，仍應依設備語法與變更流程驗證。"],
      useCases: ["整理防火牆 allowlist、blocklist 與雲端 Security Group 網段。", "將 Threat Intel IP 清單去重並壓縮，減少規則數量。", "確認相鄰的 /25、/26 等網段能否安全合併成較短 prefix。"],
    },
  },
  {
    slug: "cvss-calculator",
    name: "CVSS v3.1 計算器",
    englishName: "CVSS v3.1 Calculator",
    description: "依 FIRST CVSS v3.1 基礎指標計算分數、嚴重度與 Vector。",
    category: "網路與風險",
    icon: "V",
    tags: ["cvss", "vulnerability", "risk", "cve"],
    featured: true,
    status: "new",
  },
  {
    slug: "security-headers-analyzer",
    name: "安全標頭分析器",
    englishName: "Security Headers Analyzer",
    description: "貼上 HTTP response headers，檢查 CSP、HSTS、Referrer-Policy 等防護與常見設定缺口。",
    category: "網路與風險",
    icon: "H:",
    tags: ["security headers", "csp", "hsts", "http", "web security"],
    featured: true,
    status: "new",
  },
  {
    slug: "csp-policy-analyzer",
    name: "CSP 政策深度分析器",
    englishName: "Content Security Policy Analyzer",
    description: "逐項檢查 Content-Security-Policy 的 script-src、object-src、base-uri、frame-ancestors 與常見寬鬆來源。",
    category: "網路與風險",
    icon: "CSP",
    tags: ["content security policy", "csp", "xss", "security headers", "frontend security"],
    featured: true,
    status: "new",
    guide: {
      intro: "CSP 是否存在只是第一步，unsafe-inline、unsafe-eval、wildcard、缺少 base-uri 或 frame-ancestors 都會影響實際防護。本工具離線拆解 policy 並區分阻斷缺口與強化建議。",
      steps: ["貼上完整 CSP Header 或只有 policy value；Report-Only Header 也可辨識。", "依分數、等級與逐項 findings 檢查腳本來源、plugin、base tag、表單與 iframe 限制。", "修改政策後重新分析，並在測試環境觀察瀏覽器 violation report，避免直接破壞正式功能。"],
      useCases: ["檢查網站、CDN 或 Cloudflare Response Header 的 CSP 強度。", "找出 unsafe-inline、unsafe-eval、data:、blob: 與 wildcard 等 XSS 風險。", "協助前端團隊逐步導入 nonce、hash、Trusted Types 與 deny-by-default CSP。"],
    },
  },
  {
    slug: "http-message-parser",
    name: "HTTP 訊息解析器",
    englishName: "HTTP Request & Response Parser",
    description: "解析原始 HTTP Request／Response、Headers、Query、Cookies 與表單 Body，並標示常見歧義與敏感欄位。",
    category: "網路與風險",
    icon: "HTTP",
    tags: ["http request", "http response", "burp suite", "headers", "web ctf"],
    featured: true,
    status: "new",
    guide: {
      intro: "從 Burp Suite、Proxy、封包或 Log 複製的原始 HTTP 訊息常包含多層資料。本工具不會重送請求，只在本機拆解起始行、標頭與常見 Body 格式。",
      steps: ["貼上完整 Request 或 Response，保留起始行與 Headers。", "按下解析後檢查 Method／Status、Query、Cookies、Body parameters 與重複 Headers。", "依警告確認 Content-Length、Transfer-Encoding 或敏感 Authorization 欄位是否需要進一步調查。"],
      useCases: ["整理 Burp Suite、mitmproxy 或封包擷取中的 HTTP 訊息。", "分析 Web CTF 的 Query、Cookie、Form Body 與 Request Smuggling 線索。", "在不對目標主機發送任何請求的前提下檢查可疑流量。"],
    },
  },
  {
    slug: "dns-message-decoder",
    name: "DNS 封包解碼器",
    englishName: "DNS Wire Message Decoder",
    description: "離線解析 Hex 或 Base64 DNS wire message，拆解 Header、Question、Answer 與常見 Resource Record。",
    category: "網路與風險",
    icon: "DNS",
    tags: ["dns packet", "dns decoder", "pcap", "wireshark", "malware"],
    featured: true,
    status: "new",
    guide: {
      intro: "DNS 封包在 PCAP、EDR、惡意程式設定與 CTF 中常以原始 Hex 或 Base64 出現。本工具不會送出 DNS 查詢，只依 wire format 拆解本機輸入。",
      steps: ["選擇 Hex 或 Base64，貼入從封包或紀錄擷取的完整 DNS message。", "解碼後檢查 Transaction ID、Flags、RCODE、Question 與各 Section 的 Resource Records。", "對照 TTL、A／AAAA／CNAME／MX／TXT 等資料；未知 Record 會保留為 Hex。"],
      useCases: ["分析 Wireshark、Zeek、Suricata 或惡意程式擷取出的 DNS payload。", "辨識 DNS tunneling、可疑 TXT record 與 CNAME 跳轉線索。", "解答需要手動閱讀 DNS name compression 或 wire format 的 CTF 題目。"],
    },
  },
  {
    slug: "email-header-analyzer",
    name: "Email Header 分析器",
    englishName: "Email Header Analyzer",
    description: "解析郵件標頭、傳遞節點與 SPF、DKIM、DMARC 驗證結果，協助調查釣魚郵件。",
    category: "威脅分析",
    icon: "@",
    tags: ["email", "header", "spf", "dkim", "dmarc", "phishing"],
    featured: true,
    status: "new",
  },
  {
    slug: "file-signature-checker",
    name: "檔案簽章辨識器",
    englishName: "File Signature Checker",
    description: "讀取本機檔案 Magic Bytes，辨識真實格式並比對副檔名，檔案內容不會上傳。",
    category: "鑑識與分析",
    icon: "0x",
    tags: ["magic bytes", "file signature", "forensics", "malware", "檔案鑑識"],
    featured: true,
    status: "new",
  },
  {
    slug: "pcap-summary-analyzer",
    name: "PCAP 封包摘要分析器",
    englishName: "PCAP Packet Summary Analyzer",
    description: "在瀏覽器本機讀取 classic PCAP，彙整協定、端點與前 200 筆 Ethernet／IPv4／IPv6／TCP／UDP 封包。",
    category: "鑑識與分析",
    icon: "PCAP",
    tags: ["pcap analyzer", "packet capture", "wireshark", "network forensics", "dns"],
    featured: true,
    status: "new",
    guide: {
      intro: "事件初篩不一定需要先把封包上傳或開啟完整 Wireshark。本工具直接在瀏覽器讀取 classic PCAP Global Header 與 packet records，快速呈現協定與通訊端點。",
      steps: ["選擇小於 10 MB 的 classic .pcap，或先使用內建 DNS 範例確認解析格式。", "檢查 Link Type、封包數、協定分布、熱門端點與前 200 筆 packet summary。", "需要 TCP stream 重組、PCAPNG 或深度 payload 分析時，再交由 Wireshark、Zeek 等專業工具。"],
      useCases: ["快速初篩 EDR、IDS、蜜罐或 CTF 提供的小型 PCAP。", "辨識 DNS、TCP、UDP、ICMP 與 IPv4／IPv6 通訊比例。", "在離線且不外傳封包內容的情境下找出主要來源與目的端點。"],
    },
  },
  {
    slug: "string-extractor",
    name: "檔案字串擷取器",
    englishName: "String Extractor",
    description: "從本機二進位檔擷取可列印 ASCII 字串，快速尋找 URL、路徑與可疑命令。",
    category: "鑑識與分析",
    icon: "Aa",
    tags: ["strings", "binary", "forensics", "malware analysis", "ascii"],
    featured: true,
  },
  {
    slug: "timestamp-decoder",
    name: "鑑識時間戳解碼器",
    englishName: "Forensic Timestamp Decoder",
    description: "解碼 Unix 秒／毫秒、Windows FILETIME 與 WebKit 時間，統一顯示 UTC 與台北時間。",
    category: "鑑識與分析",
    icon: "T",
    tags: ["timestamp", "unix", "filetime", "webkit", "forensics"],
    featured: true,
    status: "new",
  },
  {
    slug: "secret-scanner",
    name: "敏感資訊掃描器",
    englishName: "Secret Scanner",
    description: "從程式碼、設定檔或 Log 找出 Private Key、JWT、雲端金鑰與常見 Token，避免秘密外洩。",
    category: "威脅分析",
    icon: "!",
    tags: ["secret", "token", "api key", "credential", "leak"],
    featured: true,
    status: "new",
  },
  {
    slug: "hash-identifier",
    name: "Hash 類型辨識器",
    englishName: "Hash Identifier",
    description: "依字元集、長度與格式辨識 MD5、SHA、bcrypt、Argon2、NTLM 等常見雜湊候選。",
    category: "編碼與雜湊",
    icon: "?",
    tags: ["hash identifier", "md5", "sha", "bcrypt", "argon2"],
    featured: true,
    status: "new",
  },
  {
    slug: "hex-viewer",
    name: "本機 Hex Viewer",
    englishName: "Hex Viewer",
    description: "以 Offset、十六進位與 ASCII 三欄檢視本機檔案前 64 KB，適合快速鑑識與格式判讀。",
    category: "鑑識與分析",
    icon: "Hx",
    tags: ["hex", "binary", "forensics", "file analysis"],
    featured: true,
  },
  {
    slug: "url-risk-analyzer",
    name: "可疑 URL 分析器",
    englishName: "Suspicious URL Analyzer",
    description: "拆解網址結構並標示帳密嵌入、Punycode、IP Host、非標準 Port 與混淆風險。",
    category: "威脅分析",
    icon: "U",
    tags: ["url", "phishing", "punycode", "domain", "triage"],
    featured: true,
    status: "new",
  },
  {
    slug: "chmod-calculator",
    name: "chmod 權限計算器",
    englishName: "chmod Calculator",
    description: "在 rwx 權限與八進位模式間即時換算，並提示 world-writable、SUID、SGID 等風險。",
    category: "網路與風險",
    icon: "rwx",
    tags: ["chmod", "linux", "permissions", "suid", "unix"],
    featured: true,
  },
  { slug: "xor-tool", name: "XOR 編解碼與破解", englishName: "XOR Cipher Tool", description: "使用文字或 Hex Key 進行重複 XOR，並暴力枚舉 Single-byte XOR 的可讀結果。", category: "CTF 工具", icon: "⊕", tags: ["xor", "crypto", "single byte", "ctf"], featured: true, status: "new" },
  { slug: "caesar-bruteforce", name: "Caesar／ROT 暴力枚舉", englishName: "Caesar Cipher Brute Force", description: "一次列出 Caesar Cipher 全部 26 種位移，快速辨識 ROT13 與古典密碼明文。", category: "CTF 工具", icon: "R", tags: ["caesar", "rot13", "cipher", "ctf"], featured: true, status: "new" },
  { slug: "base-ascii-converter", name: "進位與 ASCII 轉換器", englishName: "Number Base & ASCII Converter", description: "在 Binary、Octal、Decimal、Hex 與 ASCII bytes 間轉換，支援空白分隔輸入。", category: "CTF 工具", icon: "0b", tags: ["binary", "hex", "ascii", "base", "ctf"], featured: true, status: "new" },
  { slug: "integer-packer", name: "整數 Pack／Unpack", englishName: "Integer Packing Tool", description: "將整數轉成 p16、p32、p64 的 Little／Big Endian bytes，或從 Hex 還原數值。", category: "CTF 工具", icon: "p64", tags: ["pwn", "pack", "unpack", "endian", "ctf"], featured: true, status: "new" },
  { slug: "rsa-math-helper", name: "RSA 數學助手", englishName: "RSA Math Helper", description: "計算 GCD、模反元素與快速模冪，協助 CTF RSA 題目的基礎數論運算。", category: "CTF 工具", icon: "RSA", tags: ["rsa", "gcd", "modular inverse", "powmod", "crypto"], featured: true, status: "new" },
  { slug: "unicode-escape-codec", name: "Unicode／跳脫序列工具", englishName: "Unicode Escape Codec", description: "安全編解碼 JavaScript escape、Unicode code point 與 HTML numeric entity，不執行輸入內容。", category: "CTF 工具", icon: "U+", tags: ["unicode", "escape", "javascript", "html entity", "ctf"], featured: true, status: "new", guide: {
    intro: "Unicode 與跳脫序列常被用在 JavaScript、HTML、XSS payload、惡意程式設定與 CTF 題目。本工具只把編碼還原成純文字，不會執行腳本或解析 HTML 標籤。",
    steps: ["選擇 JavaScript escape、Unicode code point 或 HTML numeric entity 格式。", "貼上要分析的跳脫序列並按解碼；也可貼入一般文字反向編碼。", "以純文字檢查結果，必要時搭配 URL Codec 或 Base64 工具繼續分層解碼。"],
    useCases: ["還原 \\u、\\x 與 \\u{...} 混淆的 JavaScript 字串。", "轉換 U+XXXX Unicode code point，辨識同形字與特殊字元。", "分析 HTML numeric entity 編碼的 XSS payload 或釣魚內容。"],
  } },
  { slug: "layered-decoder", name: "多層編碼解碼器", englishName: "Layered Encoding Decoder", description: "自動辨識並逐層還原 URL、Base64、Hex、JavaScript escape 與 HTML numeric entity，保留每一步記錄。", category: "CTF 工具", icon: "≋", tags: ["base64", "url decode", "hex", "unicode", "obfuscation", "ctf"], featured: true, status: "new", guide: {
    intro: "惡意程式字串、釣魚連結與 CTF 題目常把 URL、Base64、Hex 或 Unicode 疊加多次。本工具會在安全上限內逐層辨識，並顯示每一步採用的格式。",
    steps: ["貼上疑似多層編碼的字串，選擇最多解碼層數。", "執行後逐步檢查格式判斷與長度變化，避免把正常文字誤判為編碼。", "複製最終純文字；若仍有其他格式，可改用對應的單一編解碼工具深入分析。"],
    useCases: ["拆解 URL encoding 包住 Base64 或 Hex 的 CTF payload。", "追蹤惡意 JavaScript、PowerShell 或釣魚內容的混淆層。", "以限深度、限輸出的方式分析未知字串，避免無限解碼。"],
  } },
  { slug: "path-traversal-analyzer", name: "Path Traversal 分析器", englishName: "Path Traversal Analyzer", description: "逐層還原 percent encoding、統一 Windows／POSIX 分隔符並標示上層目錄、null byte 與解析差異風險。", category: "CTF 工具", icon: "../", tags: ["path traversal", "directory traversal", "lfi", "url decode", "web ctf"], featured: true, status: "new", guide: {
    intro: "Directory Traversal 與 LFI payload 常透過 double encoding、反斜線或 null byte 隱藏。本工具只做詞法分析，不會讀取檔案，也不會把輸入送到任何網站。",
    steps: ["貼上 URL path、Windows 路徑或可疑參數值，選擇最多 percent decoding 層數。", "檢查每層解碼結果、正規化路徑與上層目錄片段，辨識不同解析器可能看到的內容。", "依風險提示回到應用程式驗證 canonicalization、base directory 與 allowlist 邏輯。"],
    useCases: ["分析 Web Log、WAF 告警與 CTF 中的 ../、%2e%2e 或 double-encoded payload。", "比較 Windows 反斜線與 POSIX 正斜線混用造成的路徑解析差異。", "檢查 null byte、絕對路徑與越過起始目錄等 LFI 線索。"],
  } },
  { slug: "vigenere-cipher", name: "Vigenère 密碼破解", englishName: "Vigenère Cipher Solver", description: "用 Key 加解密 Vigenère，或在不知道 Key 時以重合指數與字頻分析自動猜出金鑰並還原明文。", category: "CTF 工具", icon: "Vg", tags: ["vigenere", "維吉尼亞密碼", "polyalphabetic", "kasiski", "crypto", "ctf"], featured: true, status: "new", guide: {
    intro: "Vigenère 是 CTF Crypto 入門最常見的多表替換密碼。本工具除了用已知 Key 加解密，也能在只有密文時，以重合指數（IC）推測金鑰長度，再逐欄用英文字頻與常見字詞評分，自動找出最可能的 Key。",
    steps: ["貼上密文；保留原本的空白與標點，可提高評分準確度。", "按「自動破解 Key」，檢視排名最前面的幾組金鑰與明文。", "若結果只差幾個字母，把 Key 手動修正後按「用 Key 解密」確認。"],
    useCases: ["解出 CTF 中只給密文的 Vigenère／維吉尼亞密碼題。", "已知 Key 時快速加密或解密英文訊息。", "教學示範 Kasiski／Friedman 分析如何破解多表替換。"],
  } },
  { slug: "classic-ciphers", name: "古典密碼工具組", englishName: "Classical Cipher Toolkit", description: "Atbash、ROT47、Affine、Rail Fence 柵欄密碼與 Bacon 培根密碼一次搞定，Affine 與柵欄支援暴力枚舉。", category: "CTF 工具", icon: "Ab", tags: ["atbash", "rot47", "affine", "rail fence", "柵欄密碼", "bacon", "培根密碼", "ctf"], featured: true, status: "new", guide: {
    intro: "CTF 古典密碼題常見 Atbash、ROT47、Affine 仿射密碼、Rail Fence 柵欄密碼與 Bacon 培根密碼。本工具整合這五種加解密，Affine 與 Rail Fence 也能暴力枚舉所有參數並依英文程度排序。",
    steps: ["在上方選擇密碼類型，或按「載入範例」看看密文長什麼樣子。", "已知參數就直接解密；不知道參數時按「暴力枚舉」。", "從排名第一的候選開始檢查，確認可讀後複製結果。"],
    useCases: ["辨識並解開 Atbash 鏡像字母或 ROT47 混淆字串。", "枚舉 Affine 的 312 組金鑰與柵欄密碼的層數。", "把 AABAB 形式的培根密碼轉回英文字母。"],
  } },
  { slug: "morse-code", name: "摩斯密碼轉換器", englishName: "Morse Code Translator", description: "摩斯密碼與英文、數字、標點雙向轉換，支援 /、| 或換行分隔單字，也接受 · 與 — 等符號。", category: "CTF 工具", icon: "·−", tags: ["morse", "摩斯密碼", "摩斯電碼", "encoding", "ctf"], featured: true, status: "new" },
  { slug: "base-family-codec", name: "Base32／58／85／91 編解碼", englishName: "Base32 / Base58 / Base85 / Base91 Codec", description: "支援 Base32、Base58（Bitcoin）、Base62、Ascii85 與 Base91 編解碼，並能自動辨識是哪一種 Base。", category: "編碼與雜湊", icon: "B58", tags: ["base32", "base58", "base62", "base85", "ascii85", "base91", "ctf", "encoding"], featured: true, status: "new", guide: {
    intro: "CTF 常把 flag 用 Base32、Base58、Ascii85 或 Base91 包裝，外觀和 Base64 很像卻無法用一般工具解碼。本工具支援五種常見 Base 編碼，也能一次嘗試全部格式，列出可讀的結果。",
    steps: ["貼上可疑字串，先按「自動辨識」看看哪種 Base 能解出可讀文字。", "確認格式後選擇對應的 Base 並按「解碼」，同時查看原始 bytes。", "若解出的仍是編碼字串，可交給多層編碼解碼器繼續處理。"],
    useCases: ["解開 CTF Misc／Crypto 題中的 Base58、Base91 字串。", "辨識只含大寫字母與 2–7 的 Base32（常見於 TOTP Secret）。", "處理 PDF 與 PostScript 中的 Ascii85 資料。"],
  } },
  { slug: "frequency-analysis", name: "字母頻率分析", englishName: "Letter Frequency Analysis", description: "即時計算密文字母頻率、重合指數與常見雙字母，對照英文平均分佈，判斷密碼類型與 Caesar 位移。", category: "CTF 工具", icon: "f%", tags: ["frequency analysis", "字頻分析", "index of coincidence", "cryptanalysis", "ctf"], status: "new" },
  { slug: "rsa-solver", name: "RSA 自動求解器", englishName: "RSA CTF Solver", description: "輸入 n、e、c 自動嘗試小 e 開根號、試除法、Fermat、Wiener 與 Pollard rho，分解後直接解出明文。", category: "CTF 工具", icon: "n,e", tags: ["rsa", "rsa ctf", "factor", "wiener attack", "fermat", "long_to_bytes", "crypto"], featured: true, status: "new", guide: {
    intro: "RSA 是 CTF Crypto 的必考題型。本工具會依序嘗試已知 p／q／d、小 e 直接開根號、試除法、Fermat 分解（p、q 接近）、Wiener 攻擊（d 過小）與 Pollard's rho，成功後計算 d 並以 long_to_bytes 顯示明文。",
    steps: ["填入 n、e、c；支援十進位或 0x 開頭的十六進位。", "若已知 p、q 或 d 可一併填入，按「自動求解」。", "檢查求解步驟與明文；若無法分解，可到 factordb 查詢後把 p、q 填回。"],
    useCases: ["解出模數過小或 p、q 太接近的 RSA 題目。", "處理 e = 3 且明文未被模數截斷的小指數題。", "已知因數時快速計算 φ(n)、d 與明文。"],
  } },
  { slug: "brainfuck-interpreter", name: "Brainfuck／Ook! 直譯器", englishName: "Brainfuck & Ook! Interpreter", description: "在瀏覽器執行 Brainfuck 或 Ook! 程式並顯示輸出，有 500 萬步上限，避免無窮迴圈卡住頁面。", category: "CTF 工具", icon: "+[]", tags: ["brainfuck", "ook", "esolang", "esoteric", "ctf"], status: "new" },
  { slug: "jwt-forger", name: "JWT 偽造工具", englishName: "JWT Forger (alg none / HS256)", description: "修改 JWT payload 後重新以 alg=none 或 HS256/384/512 簽章，用於 CTF 與授權測試中驗證伺服器驗章邏輯。", category: "CTF 工具", icon: "J*", tags: ["jwt", "alg none", "jwt attack", "hs256", "web ctf", "token forgery"], featured: true, status: "new", guide: {
    intro: "Web CTF 常見 JWT 漏洞：伺服器接受 alg=none，或使用可被破解的弱 HMAC 金鑰。本工具可載入既有 Token、修改 payload（例如把 role 改成 admin），再以 none 或指定金鑰重新簽章。請只用於 CTF 與授權測試。",
    steps: ["貼上取得的 JWT 並按「載入 Header／Payload」。", "修改 payload 欄位，選擇 none 或 HS256 並填入 Secret。", "產生新的 JWT，帶回題目或測試環境驗證伺服器行為。"],
    useCases: ["測試伺服器是否錯誤接受 alg=none 的未簽章 Token。", "以破解出的弱金鑰重新簽發提升權限的 Token。", "在滲透測試報告中重現 JWT 驗章缺陷。"],
  } },
  { slug: "lsb-steganography", name: "LSB 隱寫分析", englishName: "LSB Steganography & Bit Plane Viewer", description: "類似 Stegsolve，檢視圖片 R/G/B/A 各位元平面，並依 LSB 擷取藏在像素裡的文字或檔案。", category: "鑑識與分析", icon: "▦", tags: ["steganography", "隱寫術", "lsb", "stegsolve", "bit plane", "image", "ctf"], featured: true, status: "new", guide: {
    intro: "圖片隱寫是 CTF Misc／Forensics 常客，最常見手法是把資料藏在像素的最低位元（LSB）。本工具像 Stegsolve 一樣逐一顯示各色彩通道的位元平面，並能依通道組合與位元順序擷取隱藏資料，全程不上傳圖片。",
    steps: ["拖放 PNG／BMP 圖片，或直接按 Ctrl + V 貼上截圖。", "切換 R/G/B/A 與位元 0–7，觀察位元平面是否出現文字或圖案。", "在右側選擇通道組合與位元順序擷取資料，可複製文字或下載 bytes。"],
    useCases: ["找出藏在 PNG 最低位元的 flag 字串。", "檢視位元平面中隱藏的 QR Code 或文字圖案。", "擷取 LSB 中嵌入的檔案，再交給隱藏資料掃描器分析。"],
  } },
  { slug: "qr-code-decoder", name: "QR Code 解碼器", englishName: "QR Code Decoder", description: "從圖片或截圖解讀 QR Code 內容，支援反色 QR，圖片只在瀏覽器處理，可直接 Ctrl + V 貼上。", category: "CTF 工具", icon: "QR", tags: ["qr code", "qr 解碼", "qrcode reader", "barcode", "ctf", "misc"], featured: true, status: "new" },
  { slug: "hidden-data-scanner", name: "檔案隱藏資料掃描器", englishName: "Embedded File Scanner (binwalk-lite)", description: "像 binwalk 一樣掃描檔案內嵌的 ZIP、PNG、PDF 等簽章，檢查 PNG 文字區塊、JPEG 註解與結尾後的多餘資料。", category: "鑑識與分析", icon: "⌖", tags: ["binwalk", "steganography", "隱寫", "embedded file", "隱藏檔案", "forensics", "ctf"], featured: true, status: "new", guide: {
    intro: "CTF Forensics 題常把壓縮檔接在圖片後面，或把 flag 藏在 PNG 文字區塊與 JPEG 註解裡。本工具像 binwalk 一樣掃描每個位置的 Magic Bytes，列出內嵌檔案的位移並可直接擷取下載，同時提示結尾之後的多餘資料。",
    steps: ["選擇或拖放要分析的檔案（上限 10 MB），檔案不會上傳。", "查看找到的檔案簽章與位移，以及 PNG／JPEG 結構線索。", "按「擷取下載」取出內嵌檔案，再用對應工具繼續分析。"],
    useCases: ["找出接在 JPEG 或 PNG 結尾後的 ZIP／RAR 壓縮檔。", "讀取 PNG tEXt 區塊與 JPEG COM 註解中的提示。", "快速搜尋檔案中 flag{...} 形式的字串。"],
  } },
  { slug: "symmetric-cipher", name: "AES／DES／RC4 加解密", englishName: "AES, DES & RC4 Encrypt / Decrypt", description: "在瀏覽器用 AES、DES、3DES 或 RC4 加解密，支援 ECB、CBC、CTR 模式、PKCS#7 padding 與文字／Hex／Base64 輸入輸出。", category: "CTF 工具", icon: "AES", tags: ["aes", "aes decrypt", "des", "3des", "rc4", "ecb", "cbc", "ctr", "對稱加密", "crypto", "ctf"], featured: true, status: "new", guide: {
    intro: "CTF Crypto 與逆向題常給你 Key、IV 和一段密文，要求還原 AES、DES 或 RC4 加密的 flag。瀏覽器的 Web Crypto 不支援 ECB、DES 與 RC4，本工具以純 JavaScript 實作，Key、IV、資料都能分別選擇文字、Hex 或 Base64 格式。",
    steps: ["選擇演算法與模式（ECB／CBC／CTR），填入 Key 與 IV，並設定各自的格式。", "貼上密文並選擇輸入格式，按「解密」；加密時則貼明文按「加密」。", "切換輸出格式檢視結果；若出現 padding 錯誤，檢查 Key／IV 或取消 PKCS#7 padding。"],
    useCases: ["解出逆向分析中找到 Key 的 AES-CBC／ECB 加密字串。", "驗證惡意程式設定檔使用的 RC4 或 DES 金鑰。", "比對自己寫的加密程式與標準實作的輸出是否一致。"],
  } },
  { slug: "cyclic-pattern", name: "Cyclic Pattern 偏移計算", englishName: "Cyclic Pattern Generator & Offset Finder", description: "產生與 pwntools cyclic() 相同的 de Bruijn pattern，貼上崩潰時的 EIP／RIP 即可算出 buffer overflow 偏移量。", category: "CTF 工具", icon: "aab", tags: ["cyclic", "pattern create", "pattern offset", "de bruijn", "buffer overflow", "pwn", "pwntools", "ctf"], featured: true, status: "new", guide: {
    intro: "Pwn 題的第一步通常是找出覆寫返回位址需要多少 bytes。本工具產生與 pwntools cyclic() 完全相同的 de Bruijn 序列；程式崩潰後把 EIP／RIP 的值貼回來，就能立即算出偏移量，不必安裝任何套件。",
    steps: ["選擇 32 或 64 位元，輸入長度並產生 Pattern，作為程式輸入讓它崩潰。", "在 gdb 中查看 EIP／RIP，或 RSP 指向的 8 bytes，複製該值。", "貼到右側並按「計算 Offset」，得到 padding 長度後撰寫 exploit。"],
    useCases: ["計算 stack buffer overflow 覆寫返回位址的偏移量。", "沒有 pwntools 或 Metasploit 的環境下替代 pattern_create／pattern_offset。", "確認 64 位元程式 RSP 上的資料位於輸入的哪個位置。"],
  } },
  { slug: "compression-codec", name: "gzip／zlib 壓縮解壓縮", englishName: "gzip / zlib / Deflate Decompressor", description: "自動辨識並解壓 gzip、zlib 與 raw deflate 資料，支援 Base64、Hex 與檔案輸入，也能反向壓縮。", category: "編碼與雜湊", icon: "gz", tags: ["gzip", "zlib", "deflate", "inflate", "decompress", "解壓縮", "base64", "ctf"], status: "new", guide: {
    intro: "CTF 與惡意程式分析常遇到「Base64 解完是一堆亂碼」的情況，其實那是 zlib 或 gzip 壓縮過的資料，例如 PowerShell 載荷、Cookie 與 PDF 串流。本工具會依開頭的 Magic Bytes 自動判斷格式並解壓，全程在瀏覽器完成。",
    steps: ["貼上 Base64 或 Hex 壓縮資料並選擇輸入格式，或直接拖放 .gz 檔案。", "保留「自動偵測」並按「解壓縮」，工具會判斷 gzip、zlib 或 raw deflate。", "切換輸出格式檢視結果，或下載解壓後的 bytes 交給其他工具分析。"],
    useCases: ["還原 eJ 或 H4sI 開頭的 Base64 字串（zlib／gzip）。", "解開 PowerShell 中 DeflateStream／GzipStream 壓縮的惡意載荷。", "把文字壓縮成 zlib 或 gzip，用於 payload 測試與比對。"],
  } },
  { slug: "zip-inspector", name: "ZIP 分析與密碼破解", englishName: "ZIP Inspector & Password Cracker", description: "列出 ZIP 內容、註解與 CRC32，自動偵測並修復偽加密，ZipCrypto 加密檔可用字典攻擊找出密碼。", category: "鑑識與分析", icon: "zip", tags: ["zip", "zip password", "zip 密碼", "偽加密", "pseudo encryption", "zipcrypto", "crc32", "forensics", "ctf"], featured: true, status: "new", guide: {
    intro: "ZIP 是 CTF Misc 題的常客：偽加密、藏在註解裡的提示、接在圖片後面的壓縮檔，或是用弱密碼保護的檔案。本工具在瀏覽器解析 ZIP 結構，自動判斷加密是真是假，並可用內建常見密碼或自訂字典嘗試 ZipCrypto 密碼。",
    steps: ["拖放 ZIP 檔（也可以是接了 ZIP 的圖片），查看檔案列表、註解與 CRC32。", "若狀態顯示「偽加密」，直接預覽內容或下載修復後的 ZIP。", "真正加密的檔案可輸入密碼，或貼上自訂字典後按「字典攻擊」。"],
    useCases: ["破解 CTF 中把加密旗標改成 1 的 ZIP 偽加密。", "以常見弱密碼與自訂字典找回 ZipCrypto 密碼。", "讀取 ZIP 註解，並檢查壓縮檔前後是否夾帶其他資料。"],
  } },
  { slug: "png-crc-fixer", name: "PNG 寬高與 CRC 修復", englishName: "PNG CRC & Dimension Fixer", description: "檢查 PNG 每個 chunk 的 CRC，暴力找回被竄改的寬高，比對 IDAT 資料量並輸出修復後的圖片。", category: "鑑識與分析", icon: "PNG", tags: ["png", "crc", "ihdr", "png height", "png 修復", "image forensics", "misc", "ctf"], featured: true, status: "new", guide: {
    intro: "CTF Misc 最常見的圖片題之一：PNG 的高度被改小，flag 被裁在畫面之外，但 IHDR 的 CRC 仍是用原始尺寸算出來的。本工具會檢查每個 chunk 的 CRC，暴力搜尋符合 CRC 的寬高，並用 IDAT 解壓後的資料量交叉驗證，修復後直接預覽與下載。",
    steps: ["拖放 PNG 檔，查看 IHDR 尺寸與每個 chunk 的 CRC 是否正確。", "若 IHDR CRC 錯誤，工具會自動填入暴力找到的正確寬高；也可以手動調整。", "按「修復並預覽」確認畫面完整，再下載修復後的 PNG。"],
    useCases: ["找回被改小高度、藏在畫面下方的 flag。", "修復 chunk CRC 錯誤導致看圖軟體無法開啟的 PNG。", "比對 IDAT 資料量，發現 CRC 也被重算過的竄改。"],
  } },
  { slug: "exif-viewer", name: "EXIF 與 GPS 中繼資料檢視", englishName: "EXIF, GPS & Metadata Viewer", description: "讀取 JPEG、PNG、TIFF、WebP 的 EXIF、GPS 座標、相機型號、XMP 與註解，並可移除 JPEG 中繼資料。", category: "鑑識與分析", icon: "GPS", tags: ["exif", "exif viewer", "gps", "metadata", "中繼資料", "osint", "xmp", "照片位置", "forensics", "ctf"], featured: true, status: "new", guide: {
    intro: "照片的 EXIF 可能記錄拍攝地點、時間、相機與軟體，是 OSINT 與 CTF Forensics 的重要線索，也是隱私外洩的常見來源。本工具在瀏覽器讀取 JPEG、PNG、TIFF 與 WebP 的 EXIF、GPS、XMP 與註解，並把 GPS 轉成可點擊的地圖座標。",
    steps: ["拖放照片或圖片檔，檔案不會上傳。", "查看 GPS 座標、相機型號、拍攝時間與 UserComment、XMP 等欄位。", "需要分享照片時，下載移除中繼資料的 JPEG 版本。"],
    useCases: ["OSINT 題從照片的 GPS 找出拍攝地點。", "找出藏在 ImageDescription、UserComment 或 XMP 裡的 flag。", "分享照片前確認並移除會洩漏位置的中繼資料。"],
  } },
  { slug: "audio-spectrogram", name: "音訊頻譜圖與 DTMF 解碼", englishName: "Audio Spectrogram & DTMF Decoder", description: "在瀏覽器畫出 WAV、MP3 等音訊的頻譜圖，找出藏在頻率裡的文字，並自動解碼 DTMF 電話撥號音。", category: "鑑識與分析", icon: "♫", tags: ["spectrogram", "頻譜圖", "audio steganography", "音訊隱寫", "dtmf", "sonic visualiser", "wav", "ctf"], featured: true, status: "new", guide: {
    intro: "音訊隱寫是 CTF Misc 的經典題型：把文字畫在頻譜圖上，或用電話撥號音（DTMF）傳遞數字。本工具像 Audacity、Sonic Visualiser 一樣在瀏覽器計算頻譜圖，並以 Goertzel 演算法自動辨識 DTMF 按鍵，音檔不會上傳。",
    steps: ["拖放 WAV、MP3、OGG 或 FLAC 音檔（上限 10 MB、10 分鐘）。", "觀察頻譜圖是否出現文字或圖案，可調整 FFT 大小與顯示頻率上限。", "若有撥號音，DTMF 解碼結果會直接顯示，可一鍵複製。"],
    useCases: ["找出 CTF 音檔頻譜圖中畫出的 flag 文字。", "把電話撥號音還原成按鍵數字。", "快速檢查音檔的主要頻率與取樣率。"],
  } },
];

export function findTool(slug: string) {
  return toolCatalog.find((tool) => tool.slug === slug);
}

export function relatedTools(tool: ToolDefinition, limit = 6) {
  const sameCategory = toolCatalog.filter((item) => item.category === tool.category && item.slug !== tool.slug);
  const sharedTags = toolCatalog
    .filter((item) => item.category !== tool.category && item.tags.some((tag) => tool.tags.includes(tag)));
  return [...sameCategory, ...sharedTags].slice(0, limit);
}
