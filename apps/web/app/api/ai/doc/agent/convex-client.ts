
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
}

export const convexClient = new ConvexHttpClient(convexUrl!);

export const getConvexClient = (token?: string) => {
    const client = new ConvexHttpClient(convexUrl!);
    if (token) {
        client.setAuth(token);
    }
    return client;
};
