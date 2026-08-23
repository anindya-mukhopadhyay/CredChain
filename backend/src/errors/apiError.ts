export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function notFound(resource: string): ApiError {
  return new ApiError(404, "NOT_FOUND", `${resource} not found`);
}

export function badRequest(message: string, code = "BAD_REQUEST"): ApiError {
  return new ApiError(400, code, message);
}

export function unauthorized(message = "Unauthorized", code = "UNAUTHORIZED"): ApiError {
  return new ApiError(401, code, message);
}

export function forbidden(message = "Forbidden", code = "FORBIDDEN"): ApiError {
  return new ApiError(403, code, message);
}

export function conflict(message: string, code = "CONFLICT"): ApiError {
  return new ApiError(409, code, message);
}
