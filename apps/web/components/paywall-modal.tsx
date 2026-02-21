"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useRouter, usePathname } from "next/navigation";

export const PaywallModal = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (subscriptionStatus === undefined) return;

    // We only care about protecting routes other than /pricing and /
    if (pathname === '/pricing' || pathname === '/') return;

    if (subscriptionStatus.status === "no_subscription" || subscriptionStatus.status === "user_not_found") {
      // New user (or user not yet synced to Convex), push to pricing page
      router.push("/pricing");
    } else if (subscriptionStatus.status === "inactive") {
      // Existing user with lapsed subscription, show modal
      setIsOpen(true);
    } else {
        // Active subscription, ensure modal is closed
        setIsOpen(false);
    }
  }, [subscriptionStatus, router, pathname]);

  if (subscriptionStatus === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1f1f1f]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isOpen && subscriptionStatus.status !== "no_subscription" && subscriptionStatus.status !== "user_not_found") {
      return <>{children}</>;
  }

  // If `no_subscription` or `user_not_found`, the route push to `/pricing` is in flight, so just render null to avoid flashing projects
  if (subscriptionStatus.status === "no_subscription" || subscriptionStatus.status === "user_not_found") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1f1f1f] border border-gray-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center m-4">
        <div className="mb-6 flex justify-center">
             <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Subscription Expired</h2>
        <p className="text-gray-400 mb-8 text-lg">
          Your access to the architecture design tools has been paused. Please resubscribe to continue creating and managing your projects.
        </p>

        <a
          href={`/api/checkout?productId=${process.env.NEXT_PUBLIC_CREEM_BASIC_PRODUCT_ID || ""}`}
          className="block w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all rounded-xl font-bold text-white shadow-lg shadow-purple-500/25 text-lg"
        >
          Resubscribe Now
        </a>
        
        <button 
           onClick={() => router.push('/')}
           className="mt-6 text-gray-500 hover:text-white transition-colors underline"
        >
            Return to Home
        </button>
      </div>
    </div>
  );
};
