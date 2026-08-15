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
      ? {
          account: "返回账户",
          members: "企业成员",
          overview: "业务概览",
          title: "网站管理",
        }
      : {
          account: "Back to account",
          members: "Company members",
          overview: "Overview",
          title: "Site administration",
        };

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
          <div className="space-y-1 text-sm">
            <Link
              className="hover:bg-muted block rounded-md px-3 py-2"
              href={`/${locale}/admin`}
            >
              {copy.overview}
            </Link>
            <Link
              className="hover:bg-muted block rounded-md px-3 py-2"
              href={`/${locale}/admin/members`}
            >
              {copy.members}
            </Link>
          </div>
        </nav>
        <div>{children}</div>
      </div>
    </section>
  );
}
