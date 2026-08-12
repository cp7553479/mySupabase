import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AdminShellProps = {
  children: ReactNode;
  locale: string;
};

/** Shared administration layout; feature pages are added only when their permission is implemented. */
export function AdminShell({ children, locale }: Readonly<AdminShellProps>) {
  const copy =
    locale === "zh"
      ? { account: "返回账户", title: "网站管理" }
      : { account: "Back to account", title: "Site administration" };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          {copy.title}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/account`}>{copy.account}</Link>
        </Button>
      </header>
      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={copy.title} className="rounded-xl border p-4">
          <p className="text-muted-foreground text-sm leading-6">
            {locale === "zh"
              ? "已授权的管理功能会在这里显示。"
              : "Management areas appear here when they are authorized."}
          </p>
        </nav>
        <div>{children}</div>
      </div>
    </section>
  );
}
