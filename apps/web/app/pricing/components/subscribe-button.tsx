'use client';

import { useState } from 'react';

export const SubscribeButton = () => {
  const [loading, setLoading] = useState(false);
  
  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: process.env.NEXT_PUBLIC_CREEM_BASIC_PRODUCT_ID || '', // Replace with your product ID
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
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Buy Now - $30'}
      </button>
  );
}