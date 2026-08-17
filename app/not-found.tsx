import Link from "next/link";
import { SiteHeader } from "@/components/site-shell";

export default function NotFound() {
  return <div className="page-shell"><SiteHeader compact /><main className="empty-state" style={{ margin: "80px auto", maxWidth: 720 }}><span>404</span><h1>這個工具不存在</h1><p>網址可能已變更，或工具還在開發中。</p><Link className="primary-button" href="/">返回工具庫</Link></main></div>;
}
