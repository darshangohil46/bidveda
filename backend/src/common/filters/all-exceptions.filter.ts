import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorBody } from '../../types/common.types';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

/** One error shape for the whole API: { statusCode, code, message, details? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode: status, code: this.defaultCode(status), message: response };
      }
      const payload = response as Record<string, unknown>;
      return {
        statusCode: status,
        code: typeof payload.code === 'string' ? payload.code : this.defaultCode(status),
        message: (payload.message as string | string[]) ?? exception.message,
        details: payload.details,
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { driverError?: { code?: string } })
        .driverError;
      switch (driverError?.code) {
        case PG_UNIQUE_VIOLATION:
          return {
            statusCode: HttpStatus.CONFLICT,
            code: 'ALREADY_EXISTS',
            message: 'A record with the same unique value already exists.',
          };
        case PG_FK_VIOLATION:
          return {
            statusCode: HttpStatus.CONFLICT,
            code: 'REFERENCE_CONFLICT',
            message:
              'This record is referenced by other data, or points to a record that does not exist.',
          };
        case PG_CHECK_VIOLATION:
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'CONSTRAINT_FAILED',
            message: 'A value does not satisfy a database constraint.',
          };
        default:
          break;
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side.',
    };
  }

  private defaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_FAILED';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      default:
        return 'ERROR';
    }
  }
}
