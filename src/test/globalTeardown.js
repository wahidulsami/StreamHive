import fs from "fs";
import path from "path";

export default async function globalTeardown() {
  // Stop MongoMemoryServer
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }

  // Clean up temp URI file
  const uriFile = path.join(process.cwd(), ".test-mongo-uri");
  if (fs.existsSync(uriFile)) {
    fs.unlinkSync(uriFile);
  }
}
