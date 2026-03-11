import { NextRequest, NextResponse } from "next/server";
import {
  LoginDto,
  LoginPayload,
  MATRICULE_REGEX,
  buildLoginPayload,
  detectIdentifierType,
} from "@/app/dto/login.dto";

type ErrorBody = {
  error: string;
};

function validatePayload(payload: LoginPayload) {
  if (!payload.identifier.trim()) {
    return "L'identifiant est requis";
  }
  if (!payload.password.trim()) {
    return "Le mot de passe est requis";
  }
  if (payload.identifierType === "email" && !payload.identifier.includes("@")) {
    return "Veuillez saisir une adresse email valide";
  }
  if (payload.identifierType === "matricule" && !MATRICULE_REGEX.test(payload.identifier)) {
    return "Le matricule doit contenir uniquement des chiffres (5 à 10 caractères)";
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: LoginDto;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" } satisfies ErrorBody, { status: 400 });
  }

  const payload = buildLoginPayload(body);
  const errorMessage = validatePayload(payload);
  if (errorMessage) {
    return NextResponse.json({ error: errorMessage } satisfies ErrorBody, { status: 400 });
  }

  const identifierType = detectIdentifierType(payload.identifier);
  const responseBody = {
    success: true,
    message: `Connexion acceptée via ${identifierType}`,
    identifierType,
  };

  return NextResponse.json(responseBody);
}
