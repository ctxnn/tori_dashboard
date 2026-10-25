"use client";
import { useMemo, useState } from "react";
import PayButton from "./PayButton";
import { pincodeInfo } from "@/store/lib/geo";

export default function CheckoutForm({ total, count, defaults }: { total: number; count: number; defaults: { name: string; address: string; pincode: string } }) {
  const [name, setName] = useState(defaults.name);
  const [address, setAddress] = useState(defaults.address);
  const [pincode, setPincode] = useState(defaults.pincode);
  const info = useMemo(() => pincodeInfo(pincode), [pincode]);
  const ready = name.trim().length > 1 && address.trim().length >= 8 && info.valid;
  return (
    <div className="space-y-4">
      <h1 className="h-title">Where should it go?</h1>
      <div className="card space-y-3 p-4">
        <label className="block"><span className="label mb-1 block">Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="block"><span className="label mb-1 block">Address</span><textarea className="input min-h-[80px]" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no., street, area, landmark" autoComplete="street-address" /></label>
        <label className="block"><span className="label mb-1 block">Pincode</span>
          <input className="input" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 151001" autoComplete="postal-code" />
        </label>
        {pincode.length === 6 && (info.valid
          ? <div className="rounded-xl border border-accent/25 bg-accentsoft px-3 py-2.5 text-[14px] font-semibold text-accent">Delivers to {info.city ? `the ${info.city} area, ` : ""}{info.state}, by {info.eta}</div>
          : <div className="text-[14px] font-semibold text-bad">That pincode doesn't look right. Check the six digits.</div>)}
      </div>
      <div className="card flex items-center justify-between p-4 font-bold"><span>{count} item{count > 1 ? "s" : ""}, free delivery</span><span className="price text-[22px]">₹{total.toLocaleString("en-IN")}</span></div>
      <PayButton purpose="order" className="btn-primary w-full text-[16px]" payload={{ name, address, pincode }} disabled={!ready} onSuccess={(r) => { location.href = `/store/orders/${r.orderId}?new=1`; }}>
        Pay ₹{total.toLocaleString("en-IN")} with UPI
      </PayButton>
    </div>
  );
}
