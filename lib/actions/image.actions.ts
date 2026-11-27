"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { AppError, logError, toAppError } from "../errors";
import { redirect } from "next/navigation";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { v2 as cloudinary } from "cloudinary";

const populateUser = (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName clerkId",
  });

// The signed-in user's record. Every export of a "use server" file can be called from the browser
// with any arguments, so the actions below take the user from the Clerk session instead.
async function getSignedInUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new AppError("Sign in first", { code: "UNAUTHORIZED" });

  await connectToDatabase();
  const user = await User.findOne({ clerkId });
  if (!user) throw new AppError("User not found!", { code: "NOT_FOUND" });

  return user;
}

// ADD IMAGE
export async function addImage({ image, path }: AddImageParams) {
  try {
    const author = await getSignedInUser();

    const newImage = await Image.create({ ...image, author: author._id });

    revalidatePath(path);
    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    throw toAppError("addImage", error);
  }
}

// UPDATE IMAGE
export async function updateImage({ image, path }: UpdateImageParams) {
  try {
    const user = await getSignedInUser();

    const imageToUpdate = await Image.findById(image._id);
    if (!imageToUpdate) {
      throw new AppError("Image not found!", { code: "NOT_FOUND" });
    }

    if (String(imageToUpdate.author) !== String(user._id)) {
      throw new AppError("Unauthorized user!", { code: "UNAUTHORIZED" });
    }

    // The stored author stays, whatever the request body says.
    const updateImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      { ...image, author: imageToUpdate.author },
      { new: true }
    );

    revalidatePath(path);
    return JSON.parse(JSON.stringify(updateImage));
  } catch (error) {
    throw toAppError("updateImage", error);
  }
}

// DELETE IMAGE
export async function deleteImage(imageId: string) {
  try {
    const user = await getSignedInUser();

    const image = await Image.findById(imageId);
    if (!image) throw new AppError("Image not found!", { code: "NOT_FOUND" });

    if (String(image.author) !== String(user._id)) {
      throw new AppError("Unauthorized user!", { code: "UNAUTHORIZED" });
    }

    await Image.findByIdAndDelete(image._id);
  } catch (error) {
    throw toAppError("deleteImage", error);
  }

  // redirect() signals by throwing. Inside `finally` it overrode the error
  // raised in `catch`, so a failed delete still navigated home as though it
  // had succeeded. It has to run only on the success path.
  redirect("/");
}

// GET IMAGE
export async function getImageById(imageId: string) {
  try {
    await connectToDatabase();

    const image = await populateUser(Image.findById(imageId));

    if (!image)
      throw new AppError("Image not found!", { code: "NOT_FOUND" });

    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    throw toAppError("getImageById", error);
  }
}

// Cloudinary's search belongs to its rate-limited Admin API (500 requests an hour on the Free
// plan), so the home page calls it only for an actual search, and a failed search finds nothing
// instead of taking the page down.
async function searchPublicIds(searchQuery: string): Promise<string[]> {
  try {
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const { resources } = await cloudinary.search
      .expression(`folder=hyades AND ${searchQuery}`)
      .execute();

    return resources.map((resource: any) => resource.public_id);
  } catch (error) {
    logError("getAllImages:search", error);
    return [];
  }
}

// GET ALL IMAGES
export async function getAllImages({
  limit = 9,
  page = 1,
  searchQuery = "",
}: {
  limit?: number;
  page: number;
  searchQuery?: string;
}) {
  try {
    await connectToDatabase();

    let query = {};

    if (searchQuery) {
      query = {
        publicId: {
          $in: await searchPublicIds(searchQuery),
        },
      };
    }

    const skipAmount = (Number(page) - 1) * limit;
    const images = await populateUser(Image.find(query))
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find(query).countDocuments();
    const savedImages = await Image.find().countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPage: Math.ceil(totalImages / limit),
      savedImages,
    };
  } catch (error) {
    throw toAppError("getAllImages", error);
  }
}

// GET IMAGES BY USER
export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;

    const images = await populateUser(Image.find({ author: userId }))
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find({ author: userId }).countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    throw toAppError("getUserImages", error);
  }
}
