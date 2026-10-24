import type { ErrorState } from "../schemas";

/** A failed service call, mapped to an error state from design/reference/orb-states-and-errors.html. */
export class ServiceError extends Error {
  constructor(
    public state: ErrorState,
    public code: string,
    public retryAfter?: number,
  ) {
    super(code);
    this.name = "ServiceError";
  }
}
