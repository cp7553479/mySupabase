"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[50svh] max-w-7xl items-center px-5 py-16 lg:px-8">
      <div className="max-w-xl space-y-5">
        <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
          Page unavailable
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          The page could not be loaded.
        </h1>
        <p className="text-muted-foreground leading-7">
          Please try again. If the issue continues, use the contact link in the
          footer.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </section>
  );
}
