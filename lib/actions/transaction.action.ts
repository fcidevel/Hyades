"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { plans } from "@/constants";
import { AppError } from "../errors";
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";

// The browser sends only the plan's id. The price and the credits come from `plans` and the
// buyer from the Clerk session, because the Stripe webhook credits whatever this session says.
export async function checkoutCredits(planId: number) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new AppError("Sign in to buy credits", { code: "UNAUTHORIZED" });
  }

  const plan = plans.find((p) => p._id === planId);
  if (!plan || plan.price <= 0) {
    throw new AppError("Unknown plan", { code: "NOT_FOUND" });
  }

  await connectToDatabase();
  const buyer = await User.findOne({ clerkId });
  if (!buyer) throw new AppError("User not found", { code: "NOT_FOUND" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: plan.price * 100,
          product_data: {
            name: plan.name,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      plan: plan.name,
      credits: plan.credits,
      buyerId: String(buyer._id),
    },
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/profile`,
    cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
  });

  redirect(session.url!);
}
