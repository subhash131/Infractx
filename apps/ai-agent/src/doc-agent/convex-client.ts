
import { ConvexHttpClient } from "convex/browser";
import { CONVEX_URL } from "../config";

if (!CONVEX_URL) {
  throw new Error("CONVEX_URL is not defined");
}

export const convexClient = new ConvexHttpClient(CONVEX_URL);

export const getConvexClient = (token?: string) => {
    const client = new ConvexHttpClient(CONVEX_URL);
    if (token) {
        client.setAuth(token);
    }
    return client;
};
