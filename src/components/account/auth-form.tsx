"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthFormProps = { locale: string; nextPath: string };

export function AuthForm({ locale, nextPath }: Readonly<AuthFormProps>) {
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          email: "邮箱",
          password: "密码",
          reset: "发送重设密码邮件",
          resetLink: "忘记密码？",
          resetSent: "如该邮箱已注册，重设密码邮件已发送。",
          signIn: "登录",
          signUp: "注册",
          switchToSignIn: "已有账号？登录",
          switchToSignUp: "没有账号？注册",
        }
      : {
          email: "Email address",
          password: "Password",
          reset: "Send password reset email",
          resetLink: "Forgot password?",
          resetSent:
            "If this email is registered, a password reset email has been sent.",
          signIn: "Sign in",
          signUp: "Create account",
          switchToSignIn: "Already have an account? Sign in",
          switchToSignUp: "New here? Create an account",
        };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createBrowserSupabaseClient();
    const result =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : mode === "signUp"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/confirm?locale=${locale}&next=${encodeURIComponent(nextPath)}`,
              },
            })
          : await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/confirm?locale=${locale}&next=${encodeURIComponent(`/${locale}/account/reset-password`)}`,
            });

    setPending(false);
    setMessage(
      result.error
        ? result.error.message
        : mode === "signIn"
          ? locale === "zh"
            ? "登录成功，正在刷新账户页面。"
            : "Signed in. Refreshing your account…"
          : mode === "signUp"
            ? locale === "zh"
              ? "请查收验证邮件，然后返回此页面登录。"
              : "Check your email to confirm the account, then sign in."
            : copy.resetSent,
    );

    if (!result.error && mode === "signIn") {
      window.location.assign(nextPath);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{copy.email}</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          name="email"
          required
          type="email"
        />
      </label>
      {mode !== "reset" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium">{copy.password}</span>
          <input
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            minLength={6}
            name="password"
            required
            type="password"
          />
        </label>
      ) : null}
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {mode === "signIn"
          ? copy.signIn
          : mode === "signUp"
            ? copy.signUp
            : copy.reset}
      </Button>
      {mode === "signIn" ? (
        <Button
          className="w-full"
          onClick={() => setMode("reset")}
          type="button"
          variant="ghost"
        >
          {copy.resetLink}
        </Button>
      ) : null}
      <Button
        className="w-full"
        onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
        type="button"
        variant="ghost"
      >
        {mode === "signUp" ? copy.switchToSignIn : copy.switchToSignUp}
      </Button>
    </form>
  );
}
