"use client";

import { HeartIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type FavoriteButtonProps = {
  initiallySaved?: boolean;
  locale: string;
  productId: string;
};

export function FavoriteButton({
  initiallySaved = false,
  locale,
  productId,
}: Readonly<FavoriteButtonProps>) {
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? { remove: "取消收藏", save: "收藏商品", signIn: "请先登录后收藏商品。" }
      : {
          remove: "Remove saved product",
          save: "Save product",
          signIn: "Sign in to save products.",
        };

  async function toggleFavorite() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/favorites", {
      body: JSON.stringify({ productId }),
      headers: { "Content-Type": "application/json" },
      method: saved ? "DELETE" : "POST",
    });

    if (response.status === 401) {
      setMessage(copy.signIn);
    } else if (response.ok) {
      setSaved((current) => !current);
    } else {
      setMessage(
        locale === "zh"
          ? "暂时无法更新收藏。"
          : "Could not update saved products.",
      );
    }

    setPending(false);
  }

  return (
    <div className="space-y-2">
      <Button
        aria-pressed={saved}
        disabled={pending}
        onClick={toggleFavorite}
        type="button"
        variant="outline"
      >
        <HeartIcon className={saved ? "fill-current" : undefined} />
        {saved ? copy.remove : copy.save}
      </Button>
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
    </div>
  );
}
