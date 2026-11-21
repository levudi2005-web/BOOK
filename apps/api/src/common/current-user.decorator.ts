import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Param decorator that returns the authenticated `user_id` attached by
 * `SessionAuthGuard` (or `AdminSessionAuthGuard` via `request.adminId`).
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    return request['userId'] as number;
  },
);
