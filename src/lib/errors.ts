import type { CheckResult } from "./domain/rules";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Raised when a proposal breaks one or more explicit kit rules. */
export class RuleViolationError extends HttpError {
  constructor(
    message: string,
    public checks: CheckResult[],
  ) {
    super(422, message, { checks });
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const forbidden = (why = "You don't have permission to do that") => new HttpError(403, why);
export const conflict = (why: string) => new HttpError(409, why);
export const badRequest = (why: string, details?: unknown) => new HttpError(400, why, details);
