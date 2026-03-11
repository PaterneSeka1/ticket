export type IdentifierType = "email" | "matricule";

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface LoginPayload extends LoginDto {
  identifierType: IdentifierType;
}

export const MATRICULE_REGEX = /^\d{5,10}$/;

export function detectIdentifierType(identifier: string): IdentifierType {
  const normalized = identifier.trim();
  if (normalized.includes("@")) {
    return "email";
  }
  return MATRICULE_REGEX.test(normalized) ? "matricule" : "email";
}

export function buildLoginPayload(dto: LoginDto): LoginPayload {
  return {
    ...dto,
    identifierType: detectIdentifierType(dto.identifier),
  };
}
