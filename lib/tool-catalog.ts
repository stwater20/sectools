export type ToolCategory = "編碼與雜湊" | "威脅分析" | "網路與風險" | "密碼與驗證";

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
};

export const categories: Array<{ name: ToolCategory; label: string }> = [
  { name: "編碼與雜湊", label: "ENCODE" },
  { name: "威脅分析", label: "THREAT INTEL" },
  { name: "網路與風險", label: "NETWORK" },
  { name: "密碼與驗證", label: "AUTH" },
];

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
];

export function findTool(slug: string) {
  return toolCatalog.find((tool) => tool.slug === slug);
}
