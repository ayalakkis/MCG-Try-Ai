import type { Metadata } from "next";
import s from "./admin.module.css";

/** Admin area: not linked from the booth app and kept out of search engines. */
export const metadata: Metadata = { title: "Admin · MCG Try AI", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.page}>{children}</div>;
}
