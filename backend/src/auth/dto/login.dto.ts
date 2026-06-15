import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  @IsString()
  @MaxLength(254)
  @EmailOrMatricule()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  matricule?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  passwordHash!: string;
}

function EmailOrMatricule(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'EmailOrMatricule',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const value = args.object as LoginDto;
          return Boolean(value.email?.trim() || value.matricule?.trim());
        },
        defaultMessage() {
          return 'Vous devez fournir soit un email valide, soit un matricule.';
        },
      },
    });
  };
}
