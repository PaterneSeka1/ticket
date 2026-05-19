export type PrismaKnownRequestErrorLike = {
  code: string;
  meta?: Record<string, unknown>;
  name?: string;
  clientVersion?: string;
};

export function isPrismaKnownRequestError(
  error: unknown,
  code?: string,
): error is PrismaKnownRequestErrorLike {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Partial<PrismaKnownRequestErrorLike>;
  const hasPrismaKnownErrorShape =
    candidate.name === 'PrismaClientKnownRequestError' ||
    typeof candidate.clientVersion === 'string';

  return (
    hasPrismaKnownErrorShape &&
    typeof candidate.code === 'string' &&
    (code === undefined || candidate.code === code)
  );
}
