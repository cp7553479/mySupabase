import { Badge } from "@/components/ui/badge";
import type { SubmittedInquiry } from "@/lib/inquiries/queries";

export function SubmittedInquiryList({
  inquiries,
  locale,
}: Readonly<{ inquiries: SubmittedInquiry[]; locale: string }>) {
  const copy =
    locale === "zh"
      ? { empty: "尚未提交询单。", title: "已提交询单", timeline: "进度记录" }
      : {
          empty: "No enquiries have been submitted yet.",
          title: "Submitted enquiries",
          timeline: "Progress history",
        };
  const statusLabel = (status: string) => {
    const labels =
      locale === "zh"
        ? {
            cancelled: "已取消",
            closed: "已结束",
            confirmed: "已确认",
            customer_review: "等待客户确认",
            quoting: "报价准备中",
            quoted: "报价已发送",
            reviewing: "审核中",
            submitted: "已提交",
          }
        : {
            cancelled: "Cancelled",
            closed: "Closed",
            confirmed: "Confirmed",
            customer_review: "Awaiting customer review",
            quoting: "Preparing quotation",
            quoted: "Quotation sent",
            reviewing: "In review",
            submitted: "Submitted",
          };
    return labels[status as keyof typeof labels] ?? status;
  };

  return (
    <section className="mt-12 space-y-4">
      <h2 className="text-2xl font-semibold">{copy.title}</h2>
      {inquiries.length ? (
        <div className="divide-y rounded-xl border">
          {inquiries.map((inquiry) => (
            <div className="space-y-4 p-4" key={inquiry.number}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{inquiry.number}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {inquiry.submittedAt?.slice(0, 10)}
                  </p>
                </div>
                <Badge variant="secondary">{statusLabel(inquiry.status)}</Badge>
              </div>
              {inquiry.history.length ? (
                <div className="border-t pt-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
                    {copy.timeline}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {inquiry.history.map((event) => (
                      <li
                        className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm"
                        key={`${event.createdAt}-${event.toStatus}`}
                      >
                        <span>{event.createdAt.slice(0, 10)}</span>
                        <span>{statusLabel(event.toStatus)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground leading-7">{copy.empty}</p>
      )}
    </section>
  );
}
