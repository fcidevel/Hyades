import "server-only";

import { revalidatePath } from "next/cache";
import User from "./models/user.model";
import { connectToDatabase } from "./mongoose";
import { AppError, toAppError } from "../errors";

// User records kept in sync with Clerk. Deliberately not Server Actions (no "use server"): only the
// Clerk webhook, after it has verified the Svix signature, may call these.

// CREATE
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();

    const newUser = await User.create(user);

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    throw toAppError("createUser", error);
  }
}

// UPDATE
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    if (!updatedUser)
      throw new AppError("User update failed", { code: "NOT_FOUND" });

    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    throw toAppError("updateUser", error);
  }
}

// DELETE
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new AppError("User not found", { code: "NOT_FOUND" });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    throw toAppError("deleteUser", error);
  }
}
