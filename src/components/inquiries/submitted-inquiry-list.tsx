import { Badge } from "@/components/ui/badge";
import type { SubmittedInquiry } from "@/lib/inquiries/queries";

export function SubmittedInquiryList({
  inquiries,
  locale,
}: Readonly<{ inquiries: SubmittedInquiry[]; locale: string }>) {
  const copy =
    locale === "zh"
      ? { empty: "尚未提交询单。", title: "已提交询单" }
      : {
          empty: "No enquiries have been submitted yet.",
          title: "Submitted enquiries",
        };

  return (
    <section className="mt-12 space-y-4">
      <h2 className="text-2xl font-semibold">{copy.title}</h2>
      {inquiries.length ? (
        <div className="divide-y rounded-xl border">
          {inquiries.map((inquiry) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-4"
              key={inquiry.number}
            >
              <div>
                <p className="font-medium">{inquiry.number}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {inquiry.submittedAt?.slice(0, 10)}
                </p>
              </div>
              <Badge variant="secondary">{inquiry.status}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground leading-7">{copy.empty}</p>
      )}
    </section>
  );
}
