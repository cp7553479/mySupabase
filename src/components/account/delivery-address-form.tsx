"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type DeliveryAddress = {
  city: string;
  contactName: string;
  countryCode: string;
  line1: string;
  line2: string;
  phone: string;
  postalCode: string;
  stateRegion: string;
};

export function DeliveryAddressForm({
  address,
  locale,
}: Readonly<{ address: DeliveryAddress; locale: string }>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy =
    locale === "zh"
      ? {
          city: "城市",
          contact: "收货联系人",
          country: "国家或地区（ISO 两位代码）",
          line1: "地址第一行",
          line2: "地址第二行",
          phone: "联系电话",
          postal: "邮政编码",
          save: "保存常用收货地址",
          saved: "常用收货地址已保存。",
          state: "省、州或地区",
          title: "常用收货地址",
        }
      : {
          city: "City",
          contact: "Delivery contact",
          country: "Country or region (2-letter ISO code)",
          line1: "Address line 1",
          line2: "Address line 2",
          phone: "Phone",
          postal: "Postal code",
          save: "Save delivery address",
          saved: "Default delivery address saved.",
          state: "State or region",
          title: "Default delivery address",
        };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/organization-address", {
      body: JSON.stringify(Object.fromEntries(form)),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setPending(false);
    setMessage(
      response.ok
        ? copy.saved
        : locale === "zh"
          ? "暂时无法保存常用收货地址。"
          : "Could not save the delivery address.",
    );
  }

  return (
    <form className="space-y-4 rounded-xl border p-5" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium">
          {copy.contact}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.contactName}
            name="contactName"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {copy.phone}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.phone}
            name="phone"
          />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        {copy.line1}
        <input
          className="border-input h-9 w-full rounded-md border px-3"
          defaultValue={address.line1}
          name="line1"
          required
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        {copy.line2}
        <input
          className="border-input h-9 w-full rounded-md border px-3"
          defaultValue={address.line2}
          name="line2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium">
          {copy.city}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.city}
            name="city"
            required
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {copy.state}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.stateRegion}
            name="stateRegion"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-medium">
          {copy.postal}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.postalCode}
            name="postalCode"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          {copy.country}
          <input
            className="border-input h-9 w-full rounded-md border px-3"
            defaultValue={address.countryCode}
            maxLength={2}
            name="countryCode"
            pattern="[A-Za-z]{2}"
            required
          />
        </label>
      </div>
      <Button disabled={pending} type="submit">
        {copy.save}
      </Button>
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
