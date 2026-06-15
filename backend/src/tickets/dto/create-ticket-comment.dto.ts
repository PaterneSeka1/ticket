import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTicketCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content!: string;
}
