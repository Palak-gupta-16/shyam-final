/**
 * Utility functions for handling API errors
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: ValidationError[];
}

/**
 * Extract error message and validation errors from API response
 */
export const extractApiError = (error: any): { 
  message: string; 
  fieldErrors: Record<string, string>;
} => {
  const defaultMessage = 'An unexpected error occurred';
  
  // Check if it's an axios error with response
  if (error.response?.data) {
    const data = error.response.data as ApiErrorResponse;
    const message = data.message || defaultMessage;
    const fieldErrors: Record<string, string> = {};
    
    // Extract field-specific errors if available
    if (data.errors && Array.isArray(data.errors)) {
      data.errors.forEach((err: ValidationError) => {
        fieldErrors[err.field] = err.message;
      });
    }
    
    return { message, fieldErrors };
  }
  
  // Network error or other issues
  if (error.message) {
    return { message: error.message, fieldErrors: {} };
  }
  
  return { message: defaultMessage, fieldErrors: {} };
};

/**
 * Format validation errors as a list of strings
 */
export const formatValidationErrors = (fieldErrors: Record<string, string>): string[] => {
  return Object.entries(fieldErrors).map(([field, message]) => `${field}: ${message}`);
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: any): boolean => {
  return error.response?.data?.errors && Array.isArray(error.response.data.errors);
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: any, defaultMsg: string = 'Operation failed'): string => {
  const { message } = extractApiError(error);
  return message || defaultMsg;
};
