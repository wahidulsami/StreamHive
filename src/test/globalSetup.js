import { MongoMemoryReplSet } from "mongodb-memory-server";
import fs from "fs";
import path from "path";

export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const uri = replSet.getUri();

  globalThis.__MONGOD__ = replSet;

  // Write URI to temp file so worker processes can read it
  fs.writeFileSync(
    path.join(process.cwd(), ".test-mongo-uri"),
    uri,
    "utf8"
  );
}
