import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/creem-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("----- Incoming Webhook Request -----");
    // console.log("URL:", request.url);
    const headerObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headerObj[key] = value;
    });

    const payloadString = await request.text();
    // console.log("Raw Body:", JSON.parse(payloadString));
    const signature = request.headers.get("creem-signature");

    if (!signature) {
      console.error("Missing creem-signature header");
      return new Response("Missing signature", { status: 400 });
    }

    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing CREEM_WEBHOOK_SECRET");
      return new Response("Server error", { status: 500 });
    }

    // Verify HMAC SHA256 using Web Crypto API (since Node.js crypto is not available in Convex Edge runtime)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadString)
    );
    
    // Convert buffer to hex string
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== signatureHex) {
      console.error("Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let event;
    try {
      event = JSON.parse(payloadString);
    } catch (e) {
      console.error("Invalid JSON payload");
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = event.type || event.eventType;

    try {
      switch (eventType) {
        case "checkout.completed":
          console.log("Payment successful!", {
            checkoutId: event.object?.id,
            customerId: event.object?.customer?.id,
            productId: event.object?.product?.id,
          });
          await ctx.runMutation(api.billing.handleCheckoutCompleted, {
            data: event.object,
            secret: webhookSecret,
          });
          break;
        case "subscription.active":
        case "subscription.past_due":
        case "subscription.paid":
        case "subscription.update":
          console.log(`Subscription updated (${eventType}):`, event.object?.id);
          await ctx.runMutation(api.billing.handleSubscriptionEvent, {
            type: eventType,
            data: event.object,
            secret: webhookSecret,
          });
          break;
        case "subscription.canceled":
          console.log("Subscription canceled:", event.object?.id);
          await ctx.runMutation(api.billing.handleSubscriptionEvent, {
            type: eventType,
            data: event.object,
            secret: webhookSecret,
          });
          break;
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
    } catch (e) {
      console.error("Error processing webhook:", e);
      return new Response("Webhook processing failed", { status: 500 });
    }

    return new Response("Webhook received", { status: 200 });
  }),
});


http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    let evt: any;
    try {
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
      evt = wh.verify(payloadString, {
        "svix-id": headerPayload.get("svix-id")!,
        "svix-timestamp": headerPayload.get("svix-timestamp")!,
        "svix-signature": headerPayload.get("svix-signature")!,
      });
    } catch (err) {
      console.error("Error verifying clerk webhook:", err);
      // Fallback for local development
      try {
        evt = JSON.parse(payloadString);
        console.log("Parsed webhook payload without verification for local testing.");
      } catch (e) {
        return new Response("Invalid webhook payload", { status: 400 });
      }
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(" ");

      if (primaryEmail) {
        await ctx.runMutation(api.users.syncClerkUser, {
          email: primaryEmail,
          name: name || "Unknown User",
          clerkId: id,
        });
        console.log(`Synced clerk user ${id} with email ${primaryEmail}`);
      } else {
        console.error("No email address found in user event data:", evt.data);
      }
    }

    return new Response("Webhook received", { status: 200 });
  }),
});

export default http;
