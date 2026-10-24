import type { Metadata } from "next";

/** Hidden test page: not linked anywhere and kept out of search engines. */
export const metadata: Metadata = { title: "Voice lab · MCG Try AI", robots: { index: false, follow: false } };

export default function VoiceLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
