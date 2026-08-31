import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

// Bound how long the driver hunts for a reachable node. The default is 30s;
// a failing request was observed taking 8.6s before this was set, which is a
// long time to hold a request open only to render an error state.
const SERVER_SELECTION_TIMEOUT_MS = 5000;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Cached on globalThis so dev-mode module reloading and serverless warm starts
// reuse a single pool instead of opening one per request. Typed via a widened
// globalThis rather than `global as any`.
const globalForMongoose = globalThis as typeof globalThis & {
  __hyadesMongoose?: MongooseConnection;
};

const cached: MongooseConnection = (globalForMongoose.__hyadesMongoose ??= {
  conn: null,
  promise: null,
});

export const connectToDatabase = async (): Promise<Mongoose> => {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URL) throw new Error("MONGODB_URL is not defined");

  cached.promise ??= mongoose.connect(MONGODB_URL, {
    dbName: "hyades_dev",
    bufferCommands: false,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Drop the rejected promise. Without this the same failure is handed to
    // every later request for the life of the process, so the app stays broken
    // even after the outage (e.g. a DNS resolver coming back) is over.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
};
