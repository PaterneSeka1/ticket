import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const src = resolve(projectRoot, 'generated/prisma');
const dest = resolve(projectRoot, 'dist/generated/prisma');

try {
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
  console.log('Copied generated Prisma client to dist.');
} catch (error) {
  console.error('Failed to copy generated Prisma client:', error);
  process.exit(1);
}
