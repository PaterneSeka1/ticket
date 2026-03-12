import type { User } from '../../generated/prisma/client.js';
import { UserDto } from './dto/user.dto.js';

export function toUserDto(user: User): UserDto {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest as UserDto;
}
