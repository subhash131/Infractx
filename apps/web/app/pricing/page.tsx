"use client";

import { useEffect, useState } from "react";
import { PlanCard, type BillingCycle, type Plan } from "./components/plan-card";

// ─── Data ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        const items = data.items || [];
        
        const mappedPlans: Plan[] = items.map((item: any) => {
          return {
            id: item.id,
            name: item.name,
            desc: item.description || "Simple description for this plan.",
            price: item.price / 100, // Assuming price is in cents
            billingPeriod: item.billing_period || "every-month",
            featured: item.metadata?.featured === "true" || false,
            features: item.metadata?.features ? item.metadata.features.split(",") : ["Standard Feature 1", "Standard Feature 2"],
          };
        });
        
        // Sort mapped plans by price ascending
        setPlans(mappedPlans.sort((a, b) => (a.price || 0) - (b.price || 0)));
      } catch (error) {
        console.error("Failed to fetch plans from Creem:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return (
    <>
      <div
        className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div
          className="pointer-events-none fixed top-[8%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] z-0"
          style={{
            background:
              "radial-gradient(ellipse, rgba(90,90,90,0.22) 0%, transparent 70%)",
          }}
        />

       

        {/* ── Hero ── */}
        <section className="relative z-10 flex flex-col items-center text-center pt-20 pb-14 px-6">
          {/* Badge */}
          <span className="inline-block border border-white/20 rounded-full px-4 py-[5px] text-[12px] text-white/50 mb-7 backdrop-blur-sm">
            Software architecture for AI and Humans
          </span>

          {/* Heading */}
          <h1
            className="text-[clamp(44px,6vw,70px)] font-extrabold leading-[1.04] tracking-[-2.5px] mb-6"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
           Get your architecture companion
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] text-white/45 max-w-[420px] leading-relaxed mb-10">
            Select from best plan, ensuring a perfect match. Need more or less?
            Customize your subscription for a seamless fit!
          </p>

          {/* Billing toggle */}
          <div className="flex items-center bg-white/[0.05] border border-white/[0.09] rounded-full p-[4px] gap-[3px]">
            {(["monthly", "annually"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle} 
                onClick={() => setBilling(cycle)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 capitalize ${
                  billing === cycle
                    ? "bg-white/[0.12] text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {cycle === "annually" ? "Annually" : "Monthly"}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-white/30">
            Save 20% with annual billing
          </p>
        </section>

        {/* ── Cards ── */}
        <section className="relative z-10 flex flex-wrap justify-center gap-4 px-10 pb-24 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center w-full mt-20">
              <p className="text-white/50 text-lg">Loading plans...</p>
            </div>
          ) : (
            plans
              .filter((plan) => plan.billingPeriod === (billing === "monthly" ? "every-month" : "every-year"))
              .map((plan) => (
                <PlanCard key={plan.id} plan={plan} billing={billing} />
              ))
          )}
        </section>
      </div>
    </>
  );
}