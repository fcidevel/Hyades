import { createTransaction } from "@/lib/database/transactions";
import { NextResponse } from "next/server";
import stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();

  const sig = request.headers.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  // Anything that is not a correctly signed Stripe event gets a 400 with no details, so Stripe
  // reports a failed delivery and a caller learns nothing.
  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch {
    console.warn("[stripe-webhook] signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  // Get the ID and type
  const eventType = event.type;

  // CREATE
  // Credits are added only once the money is in. A delayed payment method completes the Checkout
  // session with payment_status "unpaid"; Stripe then sends
  // checkout.session.async_payment_succeeded when the payment settles.
  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  ) {
    const { id, amount_total, metadata, payment_status } = event.data.object;

    if (payment_status !== "paid") {
      return new Response("", { status: 200 });
    }

    const transaction = {
      stripeId: id,
      amount: amount_total ? amount_total / 100 : 0,
      plan: metadata?.plan || "",
      credits: Number(metadata?.credits) || 0,
      buyerId: metadata?.buyerId || "",
      createdAt: new Date(),
    };

    const newTransaction = await createTransaction(transaction);
    
    return NextResponse.json({ message: "OK", transaction: newTransaction });
  }

  return new Response("", { status: 200 });
}