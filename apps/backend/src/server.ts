import { createApp } from "./app.js";
import { env } from "./config/env.js";

async function bootstrap() {
  const app = await createApp();
  app.listen(env.port, () => {
    console.log(`Backend listening on ${env.port}`);
  });
}

bootstrap();
