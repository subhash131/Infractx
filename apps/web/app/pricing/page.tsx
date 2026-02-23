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
            price: item.price / 100, // price is in cents
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
          <p className="mt-1 text-[12px] text-white/30">
            Get 2 months free with annual billing
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