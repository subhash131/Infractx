"use client";

import React, { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@workspace/backend/_generated/api';    
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreemCheckout } from '@creem_io/nextjs';
import { SubscribeButton } from './components/subscribe-button';

const PricingPage = () => {
  const router = useRouter();
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);

  useEffect(() => {
    if (subscriptionStatus?.status === 'active' || subscriptionStatus?.hasPriorSubscription === true) {
        // If active, or they have a prior subscription (existing user fallback), go to dashboard
        router.push('/dashboard'); 
    }
  }, [subscriptionStatus, router]);

  if (subscriptionStatus === undefined) {
      return (
          <div className='flex flex-col items-center justify-center h-screen bg-[#1f1f1f]'>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
      );
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-[#1f1f1f] text-white p-4'>
        <div className="max-w-2xl text-center space-y-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r text-white">
                Unlock Professional Architecture Design
            </h1>
            <p className="text-gray-400 text-lg md:text-xl">
                Become the ultimate source of truth for your coding agents. Get full access to AI tools, architecture diagrams, and unlimited projects.
            </p>

            <div className="w-full max-w-md mx-auto bg-[#2a2a2a] rounded-2xl p-8 border border-gray-700 shadow-xl mt-12">
                 <h2 className="text-2xl font-semibold mb-4 text-white">Pro Plan</h2>
                 <p className="text-gray-400 mb-6">Start designing better software today.</p>
                 <div className="text-4xl font-bold mb-6">$30<span className="text-lg text-gray-500 font-normal">/month</span></div>
                 
                 <ul className="text-left space-y-4 mb-8 text-gray-300">
                     <li className="flex items-center">
                         <svg className="w-5 h-5 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                         Unlimited AI Generations
                     </li>
                     <li className="flex items-center">
                         <svg className="w-5 h-5 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                         Export to Cursor & Agents
                     </li>
                     <li className="flex items-center">
                         <svg className="w-5 h-5 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                         Unlimited Workspaces
                     </li>
                 </ul>

                {/* <CreemCheckout productId={process.env.NEXT_PUBLIC_CREEM_BASIC_PRODUCT_ID || ''}               >
                    Subscribe Now
                </CreemCheckout> */}
                <SubscribeButton />
            </div>
            <p className="text-sm text-gray-500 mt-4">Secure payment powered by Creem & Stripe</p>
        </div>
    </div>
  )
}

export default PricingPage