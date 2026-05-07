import 'dotenv/config';
import { MongoClient } from 'mongodb';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant.');
  process.exit(1);
}

const client = new MongoClient(url, { maxPoolSize: 5 });

const pad = (value, length = 3) => value.toString().padStart(length, '0');

const formatDatePart = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`;

async function main() {
  await client.connect();
  const db = client.db();
  const collection = db.collection('Ticket');

  const cursor = collection.find({}, { projection: { ticketNumber: 1 } });
  const existingNumbers = new Set();
  const duplicates = [];
  const missing = [];

  while (await cursor.hasNext()) {
    const entry = await cursor.next();
    if (!entry) continue;
    const number = typeof entry.ticketNumber === 'string' ? entry.ticketNumber.trim() : null;
    if (!number) {
      missing.push(entry);
      continue;
    }
    if (existingNumbers.has(number)) {
      duplicates.push(entry);
      continue;
    }
    existingNumbers.add(number);
  }

  const nextNumber = (() => {
    const now = new Date();
    const pre = `TK-${formatDatePart(now)}`;
    const prefixWithSeparator = `${pre}-`;
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
        candidate = `${pre}-${pad(counter++)}`;
      } while (existingNumbers.has(candidate));
      existingNumbers.add(candidate);
      return candidate;
    };
  })();

  const update = async (doc) => {
    const ticketNumber = nextNumber();
    await collection.updateOne({ _id: doc._id }, { $set: { ticketNumber } });
    console.error(`🚑 Ticket ${doc._id.toString()} => ${ticketNumber}`);
  };

  for (const doc of duplicates) {
    await update(doc);
  }
  for (const doc of missing) {
    await update(doc);
  }

  console.error(`✨ Doublons traités: ${duplicates.length}, manquants: ${missing.length}`);
  await client.close();
}

main().catch((err) => {
  console.error('Erreur:', err);
  void client.close();
  process.exit(1);
});
