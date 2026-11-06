/**
 * The strategy email. It shows exactly what the visitor saw on the PREVIEW screen, so it is
 * valuable on its own and leaves the next step to the MCG team:
 * logo bar, greeting, a navy banner with the strategy line, its facts and the Kuwait skyline,
 * one section per department with its line icon (the result screen's illustrations as PNG,
 * see scripts/make-email-art.mjs), dark CTA, footer.
 * Email-safe: tables for layout, inline styles only, no SVG, no CSS grid/flex, solid-colour
 * fallbacks wherever the design uses gradients (Gmail drops background-clip text).
 */
import { Body, Column, Container, Head, Html, Img, Link, Preview, Row, Section } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { config } from "../lib/config";
import { t as dict, type Lang } from "../lib/i18n";
import type { Brief, Localized, Strategy } from "../lib/services/types";

export interface StrategyEmailProps {
  strategy: Strategy;
  brief: Brief;
  /** Visitor's name (optional on screen 06). */
  name?: string;
  /**
   * Public origin for images, e.g. https://try.mcg.com.kw (logo: /brand/mcg-logo-color.png).
   * "cid:" embeds them instead (see EMAIL_IMAGES), for when there is no public URL yet.
   */
  appUrl: string;
}

/** Images the email uses (paths under public/) and their content ids when embedded. */
export const EMAIL_IMAGES: Record<string, string> = {
  "brand/mcg-logo-color.png": "mcg-logo",
  "email/whatsapp-ink.png": "icon-whatsapp",
  "email/instagram-white.png": "icon-instagram",
  "email/art/skyline.png": "art-skyline",
  "email/art/marketing.png": "art-marketing",
  "email/art/social.png": "art-social",
  "email/art/influencers.png": "art-influencers",
  "email/art/event.png": "art-event",
  "email/art/activation.png": "art-activation",
};

/** Per-language type scale: the Arabic reference uses larger sizes and taller lines. */
const TYPE = {
  en: { font: "'Montserrat',Helvetica,Arial,sans-serif", lbl: { fontSize: 12, letterSpacing: ".09em", textTransform: "uppercase" as const }, hello: 24, h1Line: 1.15, body: 15.5, bodyLine: 1.6, small: 13.5, line: 1.5, tight: "-0.02em", foot: 12.5, footLine: 1.6, top: 13 },
  ar: { font: "'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif", lbl: { fontSize: 14 }, hello: 26, h1Line: 1.4, body: 16.5, bodyLine: 1.85, small: 14.5, line: 1.75, tight: "0", foot: 13.5, footLine: 1.8, top: 14 },
};

const C = {
  ink: "#144074",
  blue: "#125D99",
  cyan: "#2694CF",
  muted: "#4E5F78",
  tint: "#E8F2FB",
  soft: "#F4F8FC",
  border: "#E3EAF2",
  rule: "#EBF0F5",
  orange: "#EF8E0A",
  pink: "#E5418C",
  dot: "#1EA5E0",
};

export default function StrategyEmailBase({ lang, strategy, brief, name = "", appUrl }: StrategyEmailProps & { lang: Lang }) {
  const t = dict(lang);
  const m = t.mail;
  const p = t.preview;
  const T = TYPE[lang];
  const rtl = lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const start = rtl ? "right" : "left";
  const L = (x: Localized | undefined) => x?.[lang] ?? "";
  const src = (path: string) => (appUrl === "cid:" ? `cid:${EMAIL_IMAGES[path]}` : `${appUrl.replace(/\/+$/, "")}/${path}`);

  const sec: CSSProperties = { padding: "30px 44px", borderTop: `1px solid ${C.rule}` };
  const lblStyle: CSSProperties = { ...T.lbl, fontWeight: 700, color: C.blue, margin: "0 0 10px", lineHeight: 1.4 };
  const pinkDot = (
    <span style={{ display: "inline-block", width: "0.75em", height: "0.75em", borderRadius: "50%", background: C.pink, verticalAlign: "-0.06em", [rtl ? "marginLeft" : "marginRight"]: "0.5em" }} />
  );
  const label = (children: ReactNode) => (
    <p style={lblStyle}>
      {pinkDot}
      {children}
    </p>
  );
  const para = (text: string) => <p style={{ margin: "0 0 12px", fontSize: T.body, lineHeight: T.bodyLine, color: C.ink }}>{text}</p>;
  const bullets = (items: Localized[]) => (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
      <tbody>
        {items.map((x, i) => (
          <tr key={i}>
            <td width="18" style={{ width: 18, verticalAlign: "top", paddingTop: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: C.pink }} />
            </td>
            <td style={{ fontSize: T.small + 0.5, lineHeight: T.line, color: C.ink, paddingBottom: 6, textAlign: start }}>{L(x)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const tag = (label: string, value: string) => (
    <p style={{ margin: "0 0 12px", fontSize: T.small, color: C.ink }}>
      <span style={{ display: "inline-block", backgroundColor: C.tint, color: C.blue, fontWeight: 700, fontSize: 12, borderRadius: 999, padding: "3px 10px", [rtl ? "marginLeft" : "marginRight"]: 8 }}>{label}</span>
      <b>{value}</b>
    </p>
  );
  const icon = (file: string) => (
    <Img src={src(`email/${file}`)} width="20" height="20" alt="" style={{ display: "inline-block", verticalAlign: "-4px", border: 0, [rtl ? "marginLeft" : "marginRight"]: 10 }} />
  );
  const ctaBtn: CSSProperties = { display: "inline-block", borderRadius: 999, fontWeight: 700, textDecoration: "none", padding: "18px 28px", fontSize: 16, lineHeight: "20px", margin: "6px" };

  const params: [string, string][] = [
    [p.params.business, [brief.brandName, L(brief.business)].filter(Boolean).join(" · ") || "–"],
    [p.params.area, L(brief.location) || "–"],
    [p.params.objective, L(strategy.objective)],
    [p.params.focus, L(strategy.funnelStage)],
  ];
  /** One department: its line icon beside the label and title, then the idea and details full width (fits a phone). */
  const dept = (art: string, labelText: string, titleText: string, idea: string, details: ReactNode) => (
    <Section className="sec" style={sec}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", marginBottom: 12 }}>
        <tbody>
          <tr>
            <td width="76" style={{ width: 76, verticalAlign: "middle" }}>
              <Img src={src(`email/art/${art}.png`)} width="64" height="53" alt="" style={{ display: "block", border: 0 }} />
            </td>
            <td style={{ verticalAlign: "middle", textAlign: start }}>
              {label(labelText)}
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: T.tight, lineHeight: rtl ? 1.4 : 1.25, color: C.ink }}>{titleText}</h2>
            </td>
          </tr>
        </tbody>
      </table>
      {para(idea)}
      {details}
    </Section>
  );

  return (
    <Html lang={rtl ? "ar" : "en"} dir={dir}>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${rtl ? "IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=" : ""}Montserrat:wght@400;500;600;700&display=swap');
@media only screen and (max-width: 620px) {
  .outer { padding: 12px 0 !important; }
  .card { border-radius: 20px !important; }
  .sec { padding: 24px 20px !important; }
  .greet { padding: 28px 20px 20px !important; }
  .bannerWrap { padding: 0 12px !important; }
  .bannerPad { padding-left: 22px !important; padding-right: 22px !important; }
  .hl { font-size: 24px !important; }
  .cta { padding: 32px 20px !important; }
}`}</style>
      </Head>
      <Preview>{L(strategy.headline)}</Preview>
      <Body dir={dir} style={{ margin: 0, padding: 0, backgroundColor: "#E9F1F9", backgroundImage: "linear-gradient(180deg,#E4EEF8 0%,#F0F6FB 50%,#E4EEF8 100%)", fontFamily: T.font, color: C.ink }}>
        <Container className="outer" style={{ width: "100%", maxWidth: 680, padding: "40px 0" }}>
          {/* Logo bar */}
          <Section style={{ padding: "0 8px 20px" }}>
            <Row>
              <Column style={{ textAlign: start }}>
                <Img src={src("brand/mcg-logo-color.png")} width="150" height="60" alt={m.logoAlt} style={{ display: "block", border: 0 }} />
              </Column>
              <Column style={{ textAlign: rtl ? "left" : "right", fontSize: T.top, color: C.muted }}>{m.topRight}</Column>
            </Row>
          </Section>

          <Section className="card" style={{ backgroundColor: "#ffffff", borderRadius: 28, boxShadow: "0 20px 60px rgba(10,30,70,.12)", overflow: "hidden" }}>
            {/* Greeting */}
            <Section className="greet" style={{ padding: "40px 44px 26px" }}>
              <p style={{ margin: "0 0 6px", fontSize: T.hello, fontWeight: 600, color: C.cyan, lineHeight: 1.3 }}>{m.hello(name)}</p>
              <p style={{ margin: 0, fontSize: T.small, color: C.muted, lineHeight: T.line }}>{m.intro}</p>
            </Section>

            {/* Banner (one column, so it reads the same on a phone): the strategy line, its facts as a
                2×2 summary, and the Kuwait skyline at the bottom corner. */}
            <Section className="bannerWrap" style={{ padding: "0 24px" }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} bgcolor={C.ink} style={{ borderCollapse: "separate", backgroundColor: C.ink, borderRadius: 24 }}>
                <tbody>
                  <tr>
                    <td className="bannerPad" style={{ padding: "30px 32px 0", textAlign: start }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, letterSpacing: rtl ? 0 : ".1em", textTransform: "uppercase", color: "#8CCAEE" }}>{m.headline(brief.brandName ?? "")}</p>
                      <h1 className="hl" style={{ margin: "0 0 20px", fontSize: 30, lineHeight: T.h1Line, fontWeight: 700, letterSpacing: T.tight, color: "#ffffff" }}>{L(strategy.headline)}</h1>
                      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", borderTop: "1px solid #2E5E93" }}>
                        <tbody>
                          {[params.slice(0, 2), params.slice(2, 4)].map((pair, r) => (
                            <tr key={r}>
                              {pair.map(([k, v], c) => (
                                <td key={k} width="50%" style={{ width: "50%", verticalAlign: "top", padding: c === 0 ? (rtl ? "14px 0 0 12px" : "14px 12px 0 0") : rtl ? "14px 12px 0 0" : "14px 0 0 12px", textAlign: start }}>
                                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, letterSpacing: rtl ? 0 : ".1em", textTransform: "uppercase", color: "#8CCAEE" }}>{k}</p>
                                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, color: "#ffffff" }}>{v}</p>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align={rtl ? "left" : "right"} style={{ padding: rtl ? "6px 20px 0 0" : "6px 0 0 20px", textAlign: rtl ? "left" : "right", lineHeight: 0, fontSize: 0 }}>
                      <Img src={src("email/art/skyline.png")} width="130" height="126" alt="" style={{ display: "inline-block", border: 0, borderBottomRightRadius: rtl ? 0 : 24, borderBottomLeftRadius: rtl ? 24 : 0, ...(rtl ? { transform: "scaleX(-1)" } : {}) }} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={{ height: 14, lineHeight: "14px", fontSize: 0 }}>&nbsp;</Section>

            {dept("marketing", p.depts.marketing, L(strategy.marketing.title), L(strategy.marketing.idea), bullets(strategy.marketing.points))}

            {dept(
              "social",
              p.depts.socialMedia,
              L(strategy.socialMedia.title),
              L(strategy.socialMedia.idea),
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                <tbody>
                  {strategy.socialMedia.platforms.map((x, i, all) => (
                    <tr key={i}>
                      <td width="140" style={{ width: 140, padding: "10px 0", borderBottom: i === all.length - 1 ? "none" : `1px solid ${C.rule}`, verticalAlign: "top", fontWeight: 700, color: C.blue, fontSize: T.small, textAlign: start }}>{L(x.name)}</td>
                      <td style={{ padding: "10px 0", borderBottom: i === all.length - 1 ? "none" : `1px solid ${C.rule}`, verticalAlign: "top", fontSize: T.small, lineHeight: T.line, color: C.ink, textAlign: start }}>{L(x.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>,
            )}

            {dept(
              "influencers",
              p.depts.influencers,
              L(strategy.influencers.title),
              L(strategy.influencers.idea),
              <>
                {tag(p.creators, L(strategy.influencers.mix))}
                {bullets(strategy.influencers.points)}
              </>,
            )}

            {dept(
              "event",
              p.depts.event,
              L(strategy.event.title),
              L(strategy.event.idea),
              <>
                {tag(p.when, L(strategy.event.when))}
                {bullets(strategy.event.points)}
              </>,
            )}

            {dept(
              "activation",
              p.depts.activation,
              L(strategy.activation.title),
              L(strategy.activation.idea),
              <>
                <p style={{ margin: "0 0 8px", fontSize: 12.5, fontWeight: 700, color: C.blue }}>{p.howItRuns}</p>
                {bullets(strategy.activation.points)}
                <p style={{ margin: "0 0 8px", fontSize: 12.5, fontWeight: 700, color: C.blue }}>{p.offers}</p>
                {bullets(strategy.activation.offers)}
              </>,
            )}

            {/* CTA */}
            <Section style={{ padding: "8px 24px 24px" }}>
              <Section className="cta" style={{ backgroundColor: C.ink, borderRadius: 24, padding: "44px 34px", textAlign: "center", color: "#ffffff" }}>
                <p style={{ margin: "0 0 18px", lineHeight: "12px", fontSize: 0 }}>
                  {[C.orange, C.pink, C.dot].map((c) => (
                    <span key={c} style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", backgroundColor: c, margin: "0 3px" }} />
                  ))}
                </p>
                <h2 style={{ margin: "0 0 12px", fontSize: 28, lineHeight: rtl ? 1.4 : 1.15, fontWeight: 700, letterSpacing: rtl ? 0 : "-0.02em", color: "#ffffff" }}>
                  {m.ctaTitle[0]}
                  <br />
                  {m.ctaTitle[1]}
                </h2>
                <p style={{ margin: "0 auto 6px", maxWidth: 460, fontSize: T.body, lineHeight: T.bodyLine, color: "#ffffff" }}>{L(strategy.nextStep)}</p>
                <p style={{ margin: "0 auto", maxWidth: 440, fontSize: T.small, lineHeight: T.line, color: "rgba(255,255,255,.75)" }}>{m.ctaBody}</p>
                <p style={{ margin: "18px 0 0" }}>
                  <Link href={config.links.whatsapp} style={{ ...ctaBtn, backgroundColor: "#ffffff", color: C.ink }}>
                    {icon("whatsapp-ink.png")}
                    {m.whatsapp}
                  </Link>
                  <Link href={config.links.instagram} style={{ ...ctaBtn, color: "#ffffff", border: "1.5px solid rgba(255,255,255,.55)", padding: "16.5px 26.5px" }}>
                    {icon("instagram-white.png")}
                    {m.instagram}
                  </Link>
                </p>
                <p style={{ margin: "16px 0 0", fontSize: T.small }}>
                  <Link href={config.links.website} style={{ color: "#ffffff", textDecoration: "underline", fontWeight: 600 }}>
                    {m.website}
                  </Link>
                </p>
              </Section>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 16px 0", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: T.foot + 1.5, fontWeight: 700, color: C.ink }}>{m.footerBrand}</p>
            <p style={{ margin: "0 0 8px", fontSize: T.foot, lineHeight: T.footLine, color: C.muted }}>{m.footerNote(config.event[lang])}</p>
            <p style={{ margin: 0, fontSize: T.foot }}>
              <Link href={config.links.website} style={{ color: C.blue, textDecoration: "underline" }}>
                mcgmasters.com
              </Link>
              {" · "}
              <Link href={config.links.unsubscribe} style={{ color: C.blue, textDecoration: "underline" }}>
                {m.unsubscribe}
              </Link>
            </p>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
