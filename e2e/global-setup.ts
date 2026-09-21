import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/shop",
    PRODUCT_IMAGE_PATH: process.env.PRODUCT_IMAGE_PATH ?? "/tmp/product-images",
    NODE_ENV: process.env.NODE_ENV ?? "development",
  };
  execSync("npm run db:seed", { cwd: rootDir, stdio: "inherit", env });
}
