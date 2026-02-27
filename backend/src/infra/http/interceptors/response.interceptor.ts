import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isPaginatedResponse(response: unknown): boolean {
  return (
    response !== null &&
    typeof response === 'object' &&
    'data' in (response as object) &&
    'meta' in (response as object) &&
    Array.isArray((response as Record<string, unknown>).data)
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((response) => {
        if (isPaginatedResponse(response)) return response;
        return { data: response ?? null };
      }),
    );
  }
}
