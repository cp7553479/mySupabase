"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const cookieName = "logopress_cookie_consent";

export function CookieConsent({ locale }: Readonly<{ locale: string }>) {
  const [visible, setVisible] = useState(false);
  const copy =
    locale === "zh"
      ? {
          allow: "允许分析 Cookie",
          body: "必要 Cookie 用于网站运行和语言偏好。你可以选择是否允许分析 Cookie。",
          necessary: "仅必要 Cookie",
        }
      : {
          allow: "Allow analytics cookies",
          body: "Necessary cookies support the site and language preference. You can choose whether to allow analytics cookies.",
          necessary: "Use necessary cookies only",
        };
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(!document.cookie.includes(`${cookieName}=`));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  function choose(value: "analytics" | "necessary") {
    document.cookie = `${cookieName}=${value}; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
  }
  return (
    <aside
      aria-label="Cookie consent"
      className="bg-background fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border p-5 shadow-lg"
    >
      <p className="text-sm leading-6">{copy.body}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => choose("analytics")} type="button">
          {copy.allow}
        </Button>
        <Button
          onClick={() => choose("necessary")}
          type="button"
          variant="outline"
        >
          {copy.necessary}
        </Button>
      </div>
    </aside>
  );
}
