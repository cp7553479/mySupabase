"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type Member = {
  email: string | null;
  fullName: string | null;
  membershipRole: "owner" | "admin" | "buyer" | "member";
  status: "active" | "invited" | "left" | "suspended";
  userId: string;
};

type Organization = { id: string; members: Member[]; name: string };

const roles = ["admin", "buyer", "member"] as const;

/** Admin-only member controls. Supabase sends invitation emails; this form never creates links or passwords. */
export function OrganizationMemberManager({
  locale,
  organizations,
}: Readonly<{ locale: string; organizations: Organization[] }>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          add: "添加企业成员",
          added: "成员已加入企业。",
          company: "企业",
          email: "成员邮箱",
          failed: "操作未完成，请稍后重试。",
          invite: "发送邀请",
          invited: "邀请邮件已发送。",
          member: "成员",
          remove: "移除",
          role: "企业内角色",
          status: "状态",
          suspend: "停用",
          activate: "启用",
          title: "企业成员管理",
        }
      : {
          add: "Add company member",
          added: "The member was added to the company.",
          company: "Company",
          email: "Member email",
          failed: "The action could not be completed. Please try again.",
          invite: "Send invitation",
          invited: "The invitation email was sent.",
          member: "Member",
          remove: "Remove",
          role: "Company role",
          status: "Status",
          suspend: "Suspend",
          activate: "Activate",
          title: "Company member management",
        };

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/organization-members", {
      body: JSON.stringify({
        email: form.get("email"),
        locale,
        membershipRole: form.get("membershipRole"),
        organizationId: form.get("organizationId"),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      outcome?: "added" | "invited";
    } | null;
    setPending(false);
    setMessage(
      response.ok
        ? body?.outcome === "added"
          ? copy.added
          : copy.invited
        : (body?.error ?? copy.failed),
    );
    if (response.ok) event.currentTarget.reset();
  }

  async function updateMember(
    organizationId: string,
    userId: string,
    change: Record<string, string>,
  ) {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/organization-members", {
      body: JSON.stringify({ organizationId, userId, ...change }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    setPending(false);
    setMessage(response.ok ? null : copy.failed);
    if (response.ok) window.location.reload();
  }

  async function removeMember(organizationId: string, userId: string) {
    setPending(true);
    setMessage(null);
    const query = new URLSearchParams({ organizationId, userId });
    const response = await fetch(`/api/admin/organization-members?${query}`, {
      method: "DELETE",
    });
    setPending(false);
    setMessage(response.ok ? null : copy.failed);
    if (response.ok) window.location.reload();
  }

  return (
    <div className="space-y-8">
      <form className="space-y-4 rounded-xl border p-5" onSubmit={invite}>
        <h2 className="text-xl font-semibold">{copy.add}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2 text-sm font-medium">
            {copy.email}
            <input
              className="border-input h-9 w-full rounded-md border px-3"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            {copy.company}
            <select
              className="border-input h-9 w-full rounded-md border px-3"
              name="organizationId"
              required
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            {copy.role}
            <select
              className="border-input h-9 w-full rounded-md border px-3"
              defaultValue="member"
              name="membershipRole"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button disabled={pending || organizations.length === 0} type="submit">
          {copy.invite}
        </Button>
        {message ? <p role="status">{message}</p> : null}
      </form>

      <section className="space-y-5">
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        {organizations.map((organization) => (
          <section
            className="overflow-hidden rounded-xl border"
            key={organization.id}
          >
            <h3 className="border-b px-5 py-4 font-semibold">
              {organization.name}
            </h3>
            {organization.members.length ? (
              <ul className="divide-y">
                {organization.members.map((member) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                    key={member.userId}
                  >
                    <div>
                      <p className="font-medium">
                        {member.fullName || member.email || copy.member}
                      </p>
                      {member.email ? (
                        <p className="text-muted-foreground text-sm">
                          {member.email}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {member.status}
                      </span>
                      {member.membershipRole === "owner" ? (
                        <span className="text-sm">owner</span>
                      ) : (
                        <select
                          aria-label={`${copy.role}: ${member.email ?? member.userId}`}
                          className="border-input h-9 rounded-md border px-2 text-sm"
                          defaultValue={member.membershipRole}
                          disabled={pending}
                          onChange={(event) =>
                            updateMember(organization.id, member.userId, {
                              membershipRole: event.target.value,
                            })
                          }
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                      <Button
                        disabled={pending || member.membershipRole === "owner"}
                        onClick={() =>
                          updateMember(organization.id, member.userId, {
                            status:
                              member.status === "suspended"
                                ? "active"
                                : "suspended",
                          })
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {member.status === "suspended"
                          ? copy.activate
                          : copy.suspend}
                      </Button>
                      <Button
                        disabled={pending || member.membershipRole === "owner"}
                        onClick={() =>
                          removeMember(organization.id, member.userId)
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {copy.remove}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground px-5 py-4 text-sm">—</p>
            )}
          </section>
        ))}
      </section>
    </div>
  );
}
