import 'dotenv/config';
import { MongoClient } from 'mongodb';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const client = new MongoClient(url);

async function main() {
  await client.connect();
  const db = client.db();
  const collections = await db.listCollections().toArray();

  for (const coll of collections) {
    console.error(`Suppression de la collection ${coll.name}...`);
    await db.collection(coll.name).drop().catch(() => undefined);
  }

  console.error('Suppression de la base complète...');
  await db.dropDatabase();
  console.error('Base réinitialisée.');
}

main()
  .catch((err) => {
    console.error('Erreur lors du reset :', err);
    process.exit(1);
  })
  .finally(() => {
    void client.close();
  });
