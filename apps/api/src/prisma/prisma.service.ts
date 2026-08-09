import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Thin injectable wrapper around PrismaClient. Every module's repository
 * layer depends on this, never on a raw `new PrismaClient()` — keeps
 * connection lifecycle centralized and makes it possible to swap in a
 * transaction-scoped client for multi-step domain operations (order
 * placement, payment confirmation) per Database Architecture, G.14.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
