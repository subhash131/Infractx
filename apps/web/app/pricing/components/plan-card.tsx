import type { ReactNode } from "react";
import { SubscribeButton } from "./subscribe-button";

export type BillingCycle = "monthly" | "annually";

export interface Plan {
  id: string;
  name: string;
  desc: string;
  price: number | null;
  billingPeriod: string;
  freeLabel?: string;
  featured: boolean;
  features: string[];
}

function CheckCircle() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <path
        d="M5 8l2 2 4-4"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanIconBadge({ featured }: { featured: boolean }) {
  return (
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center mb-5 ${
        featured
          ? "bg-white/10 border border-white/25"
          : "bg-white/[0.06] border border-white/10"
      }`}
    >
      <div className="w-[14px] h-[14px] rounded-full border-2 border-white flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-white" />
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  billing: BillingCycle;
}

export function PlanCard({ plan, billing }: PlanCardProps) {
  const { id, name, desc, price, billingPeriod, freeLabel, featured, features } = plan;

  const displayPrice = price;

  return (
    <div
      className={`
        relative flex flex-col w-[300px] translate-y-0 rounded-2xl p-7 transition-transform duration-300
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50
        ${
          featured
            ? "bg-white/[0.07] border border-white/[0.15]"
            : "bg-white/[0.03] border border-white/[0.07]"
        }
      `}
    >
      <PlanIconBadge featured={featured} />

      {/* Plan name + desc */}
      <p
        className="text-[19px] font-bold text-white mb-1"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {name}
      </p>
      <p className="text-[13px] text-white/40 mb-6">{desc}</p>

      {/* Price */}
      <div className="mb-1">
        {freeLabel ? (
          <span
            className="text-[46px] font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {freeLabel}
          </span>
        ) : (
          <span className="flex items-end gap-1">
            <span
              className="text-[46px] font-extrabold text-white tracking-tight leading-none"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              ${displayPrice}
            </span>
            <span className="text-[13px] text-white/40 mb-2">/ {billingPeriod === "every-year" ? "per year" : "per month"}</span>
          </span>
        )}
      </div>

      {/* CTA */}
      <SubscribeButton productId={id} featured={featured} />

      {/* Divider */}
      <hr className="my-6 border-white/[0.08]" />

      {/* Features */}
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4">
        What you will get
      </p>
      <ul className="flex flex-col gap-[10px]">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-[10px] text-[13px] text-white/60">
            <CheckCircle />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
