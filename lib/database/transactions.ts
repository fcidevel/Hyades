import "server-only";

import { AppError, toAppError } from "../errors";
import Transaction from "./models/transaction.model";
import User from "./models/user.model";
import { connectToDatabase } from "./mongoose";

// Records a completed Stripe Checkout session and adds the purchased credits to the buyer.
// Deliberately not a Server Action (no "use server"): only the Stripe webhook, after it has
// verified the event signature, may call it.
export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    await connectToDatabase();

    const newTransaction = await Transaction.create({
      ...transaction,
      buyer: transaction.buyerId,
    });

    const buyer = await User.findOneAndUpdate(
      { _id: transaction.buyerId },
      { $inc: { creditBalance: transaction.credits } }
    );

    if (!buyer)
      throw new AppError("User credits update failed", { code: "NOT_FOUND" });

    return JSON.parse(JSON.stringify(newTransaction));
  } catch (error) {
    throw toAppError("createTransaction", error);
  }
}
