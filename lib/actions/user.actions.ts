"use server";

import { auth } from "@clerk/nextjs/server";
import { creditFee } from "@/constants";
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { AppError, toAppError } from "../errors";

// READ
export async function getUserById(userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });

    if (!user) throw new AppError("User not found", { code: "NOT_FOUND" });

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    throw toAppError("getUserById", error);
  }
}

// USE CREDITS
// Every export of a "use server" file can be called from the browser with any arguments, so this
// action takes none: the user comes from the Clerk session and the fee from `creditFee`. Purchased
// credits are added only by the Stripe webhook, through `lib/database/transactions.ts`.
export async function chargeCreditFee() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new AppError("Sign in to use credits", { code: "UNAUTHORIZED" });
  }

  try {
    await connectToDatabase();

    const fee = Math.abs(creditFee);
    const user = await User.findOneAndUpdate(
      { clerkId, creditBalance: { $gte: fee } },
      { $inc: { creditBalance: -fee } },
      { returnDocument: "after" }
    );

    if (!user) throw new AppError("Not enough credits");

    return { creditBalance: user.creditBalance as number };
  } catch (error) {
    throw toAppError("chargeCreditFee", error);
  }
}
