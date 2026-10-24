import Image from "next/image";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/server/adminAuth";
import s from "../admin.module.css";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  wrong: "That password isn't right. Try again.",
  rate: "Too many tries. Wait 15 minutes, then try again.",
};

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className={s.loginWrap}>
      <form className={s.login} method="post" action="/api/admin/login">
        <Image src="/brand/mcg-mark-color.png" alt="MCG" width={900} height={345} className={s.loginLogo} priority />
        <div>
          <h1 className={s.loginTitle}>Booth dashboard</h1>
          <p className={s.loginNote}>For the MCG team. Ask whoever runs the booth for the password.</p>
        </div>
        {adminConfigured() ? (
          <>
            <label className={s.field}>
              Password
              <input className={s.input} type="password" name="password" autoComplete="current-password" required autoFocus />
            </label>
            {error && ERRORS[error] && (
              <p className={s.error} role="alert">
                {ERRORS[error]}
              </p>
            )}
            <button className={s.submit} type="submit">
              Sign in
            </button>
          </>
        ) : (
          <p className={s.notice}>The admin area is off. Set ADMIN_PASSWORD in the server environment to turn it on.</p>
        )}
      </form>
    </main>
  );
}
