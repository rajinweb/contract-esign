import mongoose from 'mongoose';

type MongoMemoryServerConstructor = (typeof import('mongodb-memory-server'))['MongoMemoryServer'];
type MongoMemoryServerType = InstanceType<MongoMemoryServerConstructor>;

let mongo: MongoMemoryServerType | null = null;
let MongoMemoryServerCtor: MongoMemoryServerConstructor | undefined;

async function loadMongoMemoryServer(): Promise<MongoMemoryServerConstructor> {
  if (MongoMemoryServerCtor) return MongoMemoryServerCtor;
  try {
    const mod = await import('mongodb-memory-server');
    MongoMemoryServerCtor = mod.MongoMemoryServer;
    return MongoMemoryServerCtor;
  } catch {
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
  const parsedPort = Number.parseInt(process.env.TEST_MONGODB_PORT || '', 10);
  const instancePort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 27018;
  mongo = await MongoMemoryServer.create({
    instance: {
      ip: process.env.TEST_MONGODB_IP || '127.0.0.1',
      port: instancePort,
      dbName: process.env.TEST_MONGODB_DB_NAME || 'sample_mflix',
    },
  });
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
