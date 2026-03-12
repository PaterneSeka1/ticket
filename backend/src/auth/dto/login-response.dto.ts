import { AuthenticatedUserDto } from './authenticated-user.dto.js';

export class LoginResponseDto {
  user!: AuthenticatedUserDto;
  authenticatedAt!: Date;
  accessToken!: string;
}
