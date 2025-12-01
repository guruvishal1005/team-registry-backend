import { MongoClient, Db } from "mongodb";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;
const options = {};

if (!uri) {
  throw new Error("Please define the MONGODB_URI env var");
}

let clientPromise: Promise<MongoClient>;

if (!global.__mongoClientPromise) {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
  global.__mongoClientPromise = clientPromise;
} else {
  clientPromise = global.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const dbName = process.env.DATABASE_NAME || "test";
  return client.db(dbName);
}
