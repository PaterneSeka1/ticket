import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  @IsString()
  @EmailOrMatricule()
  email?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsNotEmpty()
  @IsString()
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
