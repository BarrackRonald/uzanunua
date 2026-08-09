import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

type DependencyStatus = "ok" | "unavailable";

interface HealthReport {
  status: "ok" | "degraded";
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  timestamp: string;
}

/**
 * Health endpoints check *real* dependency connectivity rather than
 * returning a static 200 (Infrastructure Architecture, L.5) — this is what
 * a load balancer / orchestrator actually needs to make failover decisions.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check(@Res() res: Response) {
    const report = await this.buildReport();
    const httpStatus = report.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(report);
  }

  @Get("live")
  live() {
    // Liveness: is the process itself responsive? No dependency checks.
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  async ready(@Res() res: Response) {
    const report = await this.buildReport();
    const httpStatus = report.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(report);
  }

  private async buildReport(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const status: HealthReport["status"] = database === "ok" && redis === "ok" ? "ok" : "degraded";
    return {
      status,
      dependencies: { database, redis },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "unavailable";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG" ? "ok" : "unavailable";
    } catch {
      return "unavailable";
    }
  }
}
