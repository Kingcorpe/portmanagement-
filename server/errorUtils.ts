// HIGH PRIORITY FIX #8: Error sanitization utility
import { log } from './logger';

export interface SanitizedError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Sanitize error for client response
 * Prevents information disclosure in production
 */
export function sanitizeError(error: any, isProduction: boolean): SanitizedError {
  // Log the full error server-side
  log.error("Error occurred", error);
  
  if (!isProduction) {
    // Development: Show full error details
    return {
      message: error?.message || "An error occurred",
      status: error?.status || error?.statusCode || 500,
      details: error,
    };
  }
  
  // Production: Sanitize error messages
  const status = error?.status || error?.statusCode || 500;
  
  // Database errors
  if (error?.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return {
          message: "A record with this information already exists",
          status: 409,
        };
      case '23503': // Foreign key violation
        return {
          message: "Referenced record does not exist",
          status: 400,
        };
      case '23502': // Not null violation
        return {
          message: "Required field is missing",
          status: 400,
        };
      case '23514': // Check violation
        return {
          message: "Invalid data provided",
          status: 400,
        };
      case '42P01': // Undefined table
        return {
          message: "Database configuration error",
          status: 500,
        };
      default:
        // Unknown database error
        return {
          message: "Database error occurred",
          status: status >= 500 ? 500 : status,
        };
    }
  }
  
  // Validation errors (Zod)
  if (error?.name === 'ZodError') {
    return {
      message: "Invalid request data",
      status: 400,
      details: {
        errors: error.errors?.map((e: any) => ({
          path: e.path?.join('.'),
          message: e.message,
        })),
      },
    };
  }
  
  // HTTP errors
  if (status >= 400 && status < 500) {
    // Client errors: can show message but sanitize
    return {
      message: error?.message || "Invalid request",
      status,
    };
  }
  
  // Server errors (500+): Generic message only
  return {
    message: "An error occurred processing your request",
    status: 500,
  };
}

/**
 * Create error response handler
 */
export function createErrorHandler(isProduction: boolean) {
  return (err: any, req: any, res: any, next: any) => {
    // Always log the raw error for debugging
    console.error("[ERROR_HANDLER] Caught error on", req.method, req.path);
    console.error("[ERROR_HANDLER] Error:", err?.message || err);
    console.error("[ERROR_HANDLER] Stack:", err?.stack?.slice(0, 500));
    
    const sanitized = sanitizeError(err, isProduction);
    res.status(sanitized.status || 500).json({
      message: sanitized.message,
      ...(sanitized.details ? { details: sanitized.details } : {}),
    });
  };
}




