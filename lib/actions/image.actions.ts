"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { AppError, toAppError } from "../errors";
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

// ADD IMAGE
export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await connectToDatabase();

    const author = await User.findById(userId);
    if (!author) {
      throw new AppError("User not found!", { code: "NOT_FOUND" });
    }

    const newImage = await Image.create({ ...image, author: author._id });

    revalidatePath(path);
    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    throw toAppError("addImage", error);
  }
}

// UPDATE IMAGE
export async function updateImage({ image, userId, path }: UpdateImageParams) {
  try {
    await connectToDatabase();

    const imageToUpdate = await Image.findById(image._id);
    if (!imageToUpdate) {
      throw new AppError("Image not found!", { code: "NOT_FOUND" });
    }

    if (imageToUpdate.author.toHexString() !== userId) {
      throw new AppError("Unauthorized user!", { code: "UNAUTHORIZED" });
    }

    const updateImage = await Image.findByIdAndUpdate(
      imageToUpdate._id,
      image,
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
    await connectToDatabase();
    await Image.findByIdAndDelete(imageId);
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

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    let expression = "folder=hyades";

    if (searchQuery) {
      expression += ` AND ${searchQuery}`;
    }

    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();

    const resourceIds = resources.map((resource: any) => resource.public_id);

    let query = {};

    if (searchQuery) {
      query = {
        publicId: {
          $in: resourceIds,
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
