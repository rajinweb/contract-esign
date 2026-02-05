import mongoose from 'mongoose';

type MongoMemoryServerType = {
  getUri: () => string;
  stop: () => Promise<void>;
};

let mongo: MongoMemoryServerType | null = null;
let MongoMemoryServerCtor: { create: () => Promise<MongoMemoryServerType> } | null = null;

async function loadMongoMemoryServer() {
  if (MongoMemoryServerCtor) return MongoMemoryServerCtor;
  try {
    const mod = await import('mongodb-memory-server');
    MongoMemoryServerCtor = mod.MongoMemoryServer;
    return MongoMemoryServerCtor;
  } catch (err) {
    throw new Error(
      'mongodb-memory-server is not installed. Run `npm install -D mongodb-memory-server` and retry.'
    );
  }
}

export async function connectTestDb() {
  if (mongo) return;
  const testUri = process.env.TEST_MONGODB_URI;
  if (testUri) {
    process.env.MONGODB_URI = testUri;
    await mongoose.connect(testUri);
    return;
  }

  const MongoMemoryServer = await loadMongoMemoryServer();
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
}

export async function resetTestDb() {
  if (!mongoose.connection.db) return;
  await mongoose.connection.dropDatabase();
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
}
