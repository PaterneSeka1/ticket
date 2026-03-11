import type { User } from '../../generated/prisma/client.js';
import { UserDto } from './dto/user.dto.js';

export function toUserDto(user: User): UserDto {
  const { password, ...rest } = user;
  void password;
  return rest as UserDto;
}
