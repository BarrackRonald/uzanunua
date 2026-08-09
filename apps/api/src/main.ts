import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  // Every DTO across every module is validated at the boundary — nothing
  // reaches a domain service unvalidated (Technical Architecture, F.4).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api/v1");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("UzaNunua API")
    .setDescription(
      "UzaNunua platform API. See docs/architecture/04-api-architecture.md for the full domain map.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`UzaNunua API listening on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
