import s from "./GreetingDots.module.css";

/** Brand signature: orange, pink, cyan dots after a greeting ("Hello…"). Sized in em. */
export default function GreetingDots() {
  return (
    <span className={s.dots} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
