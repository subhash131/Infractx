import { Checkout } from '@creem_io/nextjs';

export const GET = Checkout({
  apiKey: process.env.CREEM_API_KEY!,
  testMode: true,
  defaultSuccessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
});