import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUserDto } from '../dto/authenticated-user.dto.js';

export const CurrentUser = createParamDecorator<
  AuthenticatedUserDto | null,
  unknown
>((_data, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{
    user?: AuthenticatedUserDto;
  }>();
  return request.user ?? null;
});
