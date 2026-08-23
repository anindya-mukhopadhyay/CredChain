import { loadEnv } from "./config/env.js";
import { buildApp } from "./http/app.js";

const env = loadEnv();
const app = await buildApp();

try {
  await app.listen({
    host: "0.0.0.0",
    port: env.BACKEND_PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

