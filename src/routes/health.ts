import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { botState } from "../bot";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    service: "yupicraft-discord-bot",
    discord: {
      started: botState.started,
      ready: botState.ready,
      username: botState.username,
    },
    commandCount: botState.commandCount,
  });
});

export default router;
