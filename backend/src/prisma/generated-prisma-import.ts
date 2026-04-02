import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDirectory = dirname(new URL(import.meta.url).pathname);
const candidateBases = [
  resolve(process.cwd(), 'generated/prisma'),
  resolve(process.cwd(), 'dist/generated/prisma'),
  resolve(process.cwd(), '../generated/prisma'),
  resolve(scriptDirectory, '../../generated/prisma'),
];

export async function importGeneratedPrismaModule<T>(fileName: string): Promise<T> {
  let lastError: unknown;
  for (const base of candidateBases) {
    const targetPath = resolve(base, fileName);
    try {
      return (await import(pathToFileURL(targetPath).href)) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Impossible de charger ${fileName} généré par Prisma.`);
}
