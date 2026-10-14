import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Business-rule error with a stable machine-readable `code`, so the UI can react
 * to e.g. DEADLINE_PASSED without parsing English sentences.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ statusCode: status, code, message, details }, status);
  }

  static conflict(code: string, message: string, details?: Record<string, unknown>) {
    return new AppException(HttpStatus.CONFLICT, code, message, details);
  }

  static forbidden(code: string, message: string) {
    return new AppException(HttpStatus.FORBIDDEN, code, message);
  }

  static notFound(message = 'Not found') {
    return new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static badRequest(code: string, message: string, details?: Record<string, unknown>) {
    return new AppException(HttpStatus.BAD_REQUEST, code, message, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppException(HttpStatus.UNAUTHORIZED, code, message);
  }
}
