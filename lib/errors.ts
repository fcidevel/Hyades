import { unstable_rethrow } from "next/navigation";

/**
 * Copy shown to a user when we have nothing more specific to say. Deliberately
 * free of hostnames, driver internals and stack detail.
 */
export const GENERIC_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again.";

export const DB_UNAVAILABLE_MESSAGE =
  "We can't reach the image library right now. Please try again in a moment.";

export type AppErrorCode =
  | "DB_UNAVAILABLE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "UNKNOWN";

/**
 * An error whose `message` is written for a user to read. The underlying
 * failure is preserved on `cause` for the server log and never rendered.
 *
 * Note: Next.js redacts server-thrown error messages in production builds, so
 * treat this message as a development aid and a contract marker - the user
 * facing copy that actually renders lives in the error boundaries and toasts.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(
    message: string,
    options: { code?: AppErrorCode; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code ?? "UNKNOWN";
  }
}

/**
 * True for the failure modes that mean "the database is not reachable" rather
 * than "the query was wrong" - DNS resolution failures against the Atlas SRV
 * record, refused connections, and Mongoose server selection timeouts.
 */
const isDatabaseUnavailable = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;

  const { name, code, message } = error as {
    name?: string;
    code?: unknown;
    message?: string;
  };

  if (
    name === "MongooseServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoServerSelectionError"
  ) {
    return true;
  }

  const dnsCodes = ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"];
  if (typeof code === "string" && dnsCodes.includes(code)) return true;

  return typeof message === "string" && message.includes("querySrv");
};

/**
 * Logs the real failure, server side only. Separated from throwing so callers
 * can decide control flow themselves.
 */
export const logError = (context: string, error: unknown): void => {
  console.error(`[${context}]`, error);
};

/**
 * Converts an unknown thrown value into an `AppError` carrying user-safe copy,
 * after logging the original with its stack and cause chain intact.
 *
 * Next.js signals `redirect()` and `notFound()` by throwing; `unstable_rethrow`
 * lets those pass through untouched so navigation keeps working.
 *
 * Always use as `throw toAppError(...)` so control flow is visible at the call
 * site and the function's return type stays honest.
 */
export const toAppError = (context: string, error: unknown): AppError => {
  unstable_rethrow(error);

  logError(context, error);

  if (error instanceof AppError) return error;

  if (isDatabaseUnavailable(error)) {
    return new AppError(DB_UNAVAILABLE_MESSAGE, {
      code: "DB_UNAVAILABLE",
      cause: error,
    });
  }

  return new AppError(GENERIC_ERROR_MESSAGE, { code: "UNKNOWN", cause: error });
};
