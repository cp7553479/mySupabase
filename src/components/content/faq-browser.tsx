"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PublishedArticle } from "@/lib/content/queries";

export function FaqBrowser({
  entries,
  locale,
}: Readonly<{ entries: PublishedArticle[]; locale: string }>) {
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(
    () =>
      [
        ...new Map(
          entries
            .flatMap((entry) => entry.topics)
            .map((item) => [item.slug, item]),
        ).values(),
      ].sort((left, right) => left.name.localeCompare(right.name, locale)),
    [entries, locale],
  );
  const visibleEntries = entries.filter(
    (entry) =>
      !topic || entry.topics.some((entryTopic) => entryTopic.slug === topic),
  );
  const copy =
    locale === "zh"
      ? { all: "全部问题", empty: "当前分类下暂无常见问题。" }
      : {
          all: "All questions",
          empty: "No questions are available for this topic.",
        };

  return (
    <div className="space-y-5">
      {topics.length ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="FAQ topics"
        >
          <Button
            onClick={() => setTopic(null)}
            type="button"
            variant={topic === null ? "default" : "outline"}
          >
            {copy.all}
          </Button>
          {topics.map((item) => (
            <Button
              key={item.slug}
              onClick={() => setTopic(item.slug)}
              type="button"
              variant={topic === item.slug ? "default" : "outline"}
            >
              {item.name}
            </Button>
          ))}
        </div>
      ) : null}
      {visibleEntries.length ? (
        <div className="divide-y rounded-xl border">
          {visibleEntries.map((entry) => (
            <details className="group px-5 py-1" key={entry.id}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-base font-semibold marker:hidden">
                {entry.title}
                <span
                  aria-hidden="true"
                  className="text-muted-foreground text-xl transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="text-muted-foreground pb-5 leading-7 whitespace-pre-line">
                {entry.body || entry.excerpt}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{copy.empty}</p>
      )}
    </div>
  );
}
