import { Badge } from "@/components/ui/badge";

type OrganizationMember = {
  email: string | null;
  fullName: string | null;
  membershipRole: string;
  status: string;
};

export function OrganizationMembers({
  locale,
  members,
}: Readonly<{ locale: string; members: OrganizationMember[] }>) {
  const copy =
    locale === "zh"
      ? { title: "企业成员", empty: "当前企业暂无可显示成员。" }
      : {
          title: "Company members",
          empty: "No company members are available.",
        };
  const roleLabel = (role: string) => {
    const labels =
      locale === "zh"
        ? {
            admin: "管理员",
            buyer: "采购成员",
            member: "成员",
            owner: "所有者",
          }
        : {
            admin: "Administrator",
            buyer: "Buyer",
            member: "Member",
            owner: "Owner",
          };
    return labels[role as keyof typeof labels] ?? role;
  };

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      {members.length ? (
        <ul className="divide-y">
          {members.map((member) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3"
              key={`${member.email}-${member.membershipRole}`}
            >
              <div>
                <p className="font-medium">
                  {member.fullName || member.email || "—"}
                </p>
                {member.fullName && member.email ? (
                  <p className="text-muted-foreground text-sm">
                    {member.email}
                  </p>
                ) : null}
              </div>
              <Badge variant="secondary">
                {roleLabel(member.membershipRole)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{copy.empty}</p>
      )}
    </section>
  );
}
