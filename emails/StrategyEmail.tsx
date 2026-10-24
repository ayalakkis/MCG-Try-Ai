/** English strategy email (design/reference/email-en.html). */
import { SAMPLE_STRATEGY } from "../lib/services/mock";
import { EXAMPLES } from "../lib/examples";
import StrategyEmailBase, { type StrategyEmailProps } from "./StrategyEmailBase";

export default function StrategyEmail(props: StrategyEmailProps) {
  return <StrategyEmailBase lang="en" {...props} />;
}

/** Bloom Coffee sample for `npm run email:preview`. */
StrategyEmail.PreviewProps = { strategy: SAMPLE_STRATEGY, brief: EXAMPLES.cafe, name: "Sara", appUrl: "http://localhost:3000" } satisfies StrategyEmailProps;
