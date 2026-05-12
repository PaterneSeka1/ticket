import type { User } from '../../generated/prisma/client.js';
import { UserDto } from './dto/user.dto.js';

export function toUserDto(user: User): UserDto {
  const { passwordHash, plainPassword, ...rest } = user;
  void passwordHash;
  void plainPassword;
  return rest as UserDto;
}
