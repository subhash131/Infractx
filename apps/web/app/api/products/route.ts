import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let url = process.env.NEXT_PUBLIC_CREEM_API_URL || "https://test-api.creem.io/v1/products/search";
    if (!url.includes('/v1/products/search')) {
      url += '/v1/products/search';
    }
    
    // Server-side fetch bypasses CORS and securely uses the API key
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": process.env.CREEM_API_KEY || "", 
      },
      // Revalidate every hour or keep it fresh as per Next.js cache semantics
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
       console.error("Creem API returned an error:", res.status, res.statusText);
       return NextResponse.json({ items: [] }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch products from Creem API:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
