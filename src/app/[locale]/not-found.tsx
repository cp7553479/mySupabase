import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LocaleNotFound() {
  return (
    <section className="mx-auto flex min-h-[50svh] max-w-7xl items-center px-5 py-16 lg:px-8">
      <div className="max-w-xl space-y-5">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          Page not found
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          This page is not available.
        </h1>
        <p className="text-muted-foreground leading-7">
          Return to the catalogue to continue exploring LogoPress.
        </p>
        <Button asChild>
          <Link href="/en">Return to home</Link>
        </Button>
      </div>
    </section>
  );
}
