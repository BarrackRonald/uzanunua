import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    // Phase 4+: CatalogueModule, SearchModule, CartModule, CheckoutModule,
    // PaymentsModule, OrdersModule, SellersModule, etc. are added here one
    // per phase, per the roadmap in
    // docs/architecture/07-infrastructure-roadmap-risks.md — not stubbed
    // in advance, per the "no placeholder architecture" rule (Section 81).
  ],
})
export class AppModule {}
