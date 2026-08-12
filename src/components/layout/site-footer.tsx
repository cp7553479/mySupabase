import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { getCopy, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const prefix = `/${locale}`;

  return (
    <footer className="bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="flex max-w-sm flex-col gap-4">
          <Image
            alt={copy.logoAlt}
            className="h-8 w-auto"
            height={55}
            src="/brand/logopress-black.png"
            width={180}
          />
          <p className="text-muted-foreground text-sm leading-6">
            {copy.footerDescription}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold">{copy.products}</p>
          <Link
            className="text-muted-foreground hover:text-foreground"
            href={`${prefix}/products`}
          >
            {copy.browseProducts}
          </Link>
          <Link
            className="text-muted-foreground hover:text-foreground"
            href={`${prefix}/inquiry`}
          >
            {copy.inquire}
          </Link>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold">LogoPress</p>
          <Link
            className="text-muted-foreground hover:text-foreground"
            href={`${prefix}/about`}
          >
            {copy.about}
          </Link>
          <Link
            className="text-muted-foreground hover:text-foreground"
            href={`${prefix}/contact`}
          >
            {copy.contact}
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Separator />
        <p className="text-muted-foreground py-5 text-xs">
          © {new Date().getFullYear()} LogoPress. {copy.trustLine}
        </p>
      </div>
    </footer>
  );
}
