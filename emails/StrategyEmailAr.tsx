/** Arabic strategy email, right to left (design/reference/email-ar.html). */
import { SAMPLE_STRATEGY } from "../lib/services/mock";
import { EXAMPLES } from "../lib/examples";
import StrategyEmailBase, { type StrategyEmailProps } from "./StrategyEmailBase";

export default function StrategyEmailAr(props: StrategyEmailProps) {
  return <StrategyEmailBase lang="ar" {...props} />;
}

/** Bloom Coffee sample for `npm run email:preview`. */
StrategyEmailAr.PreviewProps = { strategy: SAMPLE_STRATEGY, brief: EXAMPLES.cafe, name: "سارة", appUrl: "http://localhost:3000" } satisfies StrategyEmailProps;
