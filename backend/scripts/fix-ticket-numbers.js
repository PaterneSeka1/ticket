import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient();

const pad = (value, length = 3) => value.toString().padStart(length, '0');

const formatDatePart = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const buildGenerator = (existingNumbers) => {
  const now = new Date();
  const prefix = `TK-${formatDatePart(now)}`;
  const prefixWithSeparator = `${prefix}-`;
  let counter =
    Array.from(existingNumbers).reduce((highest, number) => {
      if (typeof number !== 'string' || !number.startsWith(prefixWithSeparator)) {
        return highest;
      }
      const suffix = number.slice(prefixWithSeparator.length);
      if (!/^\d+$/.test(suffix)) return highest;
      return Math.max(highest, Number(suffix));
    }, 0) + 1;
  return () => {
    let candidate;
    do {
      candidate = `${prefix}-${pad(counter++)}`;
    } while (existingNumbers.has(candidate));
    existingNumbers.add(candidate);
    return candidate;
  };
};

async function main() {
  console.error('🧹 Nettoyage des ticketNumber en cours...');
  const tickets = await prisma.ticket.findMany({ select: { id: true, ticketNumber: true } });

  const existingNumbers = new Set();
  const duplicates = [];
  const missing = [];

  for (const ticket of tickets) {
    const number = ticket.ticketNumber?.trim();
    if (!number) {
      missing.push(ticket);
      continue;
    }
    if (existingNumbers.has(number)) {
      duplicates.push(ticket);
      continue;
    }
    existingNumbers.add(number);
  }

  const nextNumber = buildGenerator(existingNumbers);

  for (const ticket of duplicates) {
    const ticketNumber = nextNumber();
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ticketNumber } });
    console.error(`⚠️  Ticket ${ticket.id} dupliqué renommé en ${ticketNumber}`);
  }

  for (const ticket of missing) {
    const ticketNumber = nextNumber();
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ticketNumber } });
    console.error(`✅ Ticket ${ticket.id} mis à jour avec ${ticketNumber}`);
  }

  if (!duplicates.length && !missing.length) {
    console.error('✅ Aucun ticket à corriger.');
  } else {
    console.error(`✨ ${duplicates.length} doublons, ${missing.length} manquants traités.`);
  }
}

main()
  .catch((error) => {
    console.error('Erreur lors du nettoyage :', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
