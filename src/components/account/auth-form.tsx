"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthFormProps = { locale: string };

export function AuthForm({ locale }: Readonly<AuthFormProps>) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          email: "邮箱",
          password: "密码",
          signIn: "登录",
          signUp: "注册",
          switchToSignIn: "已有账号？登录",
          switchToSignUp: "没有账号？注册",
        }
      : {
          email: "Email address",
          password: "Password",
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
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/${locale}/account`,
            },
          });

    setPending(false);
    setMessage(
      result.error
        ? result.error.message
        : mode === "signUp"
          ? locale === "zh"
            ? "请查收验证邮件，然后返回此页面登录。"
            : "Check your email to confirm the account, then sign in."
          : locale === "zh"
            ? "登录成功，正在刷新账户页面。"
            : "Signed in. Refreshing your account…",
    );

    if (!result.error && mode === "signIn") {
      window.location.reload();
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
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} type="submit">
        {mode === "signIn" ? copy.signIn : copy.signUp}
      </Button>
      <Button
        className="w-full"
        onClick={() =>
          setMode((current) => (current === "signIn" ? "signUp" : "signIn"))
        }
        type="button"
        variant="ghost"
      >
        {mode === "signIn" ? copy.switchToSignUp : copy.switchToSignIn}
      </Button>
    </form>
  );
}
