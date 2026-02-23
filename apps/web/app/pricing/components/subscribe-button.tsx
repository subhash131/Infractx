'use client';

import { useState } from 'react';

interface SubscribeButtonProps {
  productId: string;
  featured?: boolean;
}

export const SubscribeButton = ({ productId, featured = false }: SubscribeButtonProps) => {
  const [loading, setLoading] = useState(false);
  
  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
        }),
      });
      
      const { checkoutUrl } = await response.json();
      
      // Redirect to Creem checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`
          w-full mt-5 py-[13px] rounded-xl text-sm font-semibold transition-all duration-200
          ${
            featured
              ? "bg-white text-[#0a0a0a] hover:bg-white/90"
              : "bg-transparent text-white border border-white/[0.15] hover:bg-white/[0.06]"
          } disabled:opacity-50
        `}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {loading ? 'Processing...' : 'Get Started'}
      </button>
  );
}