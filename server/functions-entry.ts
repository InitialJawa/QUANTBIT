import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { app } from "./server";
import { runIdx80Scan } from "../src/engine/sync_engine";

// HTTPS Function wrapping the Express API server
export const api = onRequest({
  cors: true,
  memory: "512MiB",
  timeoutSeconds: 300,
}, app);

// Scheduled Function running the scan engine every 15 minutes
export const scannerCron = onSchedule({
  schedule: "every 15 minutes",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  console.log("Starting scheduled scan...");
  try {
    await runIdx80Scan();
    console.log("Scheduled scan finished successfully.");
  } catch (err: any) {
    console.error("Scheduled scan failed:", err);
  }
});

