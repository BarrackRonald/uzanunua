import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

function mockResponse() {
  const res: { statusCode?: number; body?: unknown; status: jest.Mock; json: jest.Mock } = {
    status: jest.fn(function (this: typeof res, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: typeof res, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  return res as unknown as { statusCode: number; body: unknown } & typeof res;
}

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let redis: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    redis = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it("reports ok when both database and redis are reachable", async () => {
    prisma.$queryRaw.mockResolvedValueOnce(1);
    redis.ping.mockResolvedValueOnce("PONG");

    const res = mockResponse();
    await controller.check(res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        dependencies: { database: "ok", redis: "ok" },
      }),
    );
  });

  it("reports degraded with 503 when the database is unreachable", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    redis.ping.mockResolvedValueOnce("PONG");

    const res = mockResponse();
    await controller.check(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        dependencies: { database: "unavailable", redis: "ok" },
      }),
    );
  });

  it("reports degraded with 503 when redis is unreachable", async () => {
    prisma.$queryRaw.mockResolvedValueOnce(1);
    redis.ping.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = mockResponse();
    await controller.check(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        dependencies: { database: "ok", redis: "unavailable" },
      }),
    );
  });

  it("liveness check never touches dependencies", () => {
    const result = controller.live();
    expect(result.status).toBe("ok");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(redis.ping).not.toHaveBeenCalled();
  });
});
