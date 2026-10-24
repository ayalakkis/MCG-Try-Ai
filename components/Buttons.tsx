import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import s from "./Buttons.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean; children: ReactNode };

export const PrimaryButton = forwardRef<HTMLButtonElement, Props>(function PrimaryButton(
  { className, pressed, type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={[s.primary, pressed ? s.pressed : "", className].filter(Boolean).join(" ")} {...rest} />;
});

export const SecondaryButton = forwardRef<HTMLButtonElement, Props>(function SecondaryButton(
  { className, pressed: _pressed, type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={[s.secondary, className].filter(Boolean).join(" ")} {...rest} />;
});
