import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "firebase-config.json");
if (!fs.existsSync(configPath)) {
  console.error("firebase-config.json not found!");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const databaseURL = "https://gen-lang-client-0592253886-default-rtdb.asia-southeast1.firebasedatabase.app";

console.log("Initializing Firebase Admin with Project:", config.projectId);
const app = initializeApp({
  projectId: config.projectId,
  databaseURL
});

const db = getDatabase(app);

async function uploadFile(localPath: string, dbPath: string) {
  const fullPath = path.join(process.cwd(), localPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${localPath}, skipping.`);
    return;
  }

  console.log(`Reading ${localPath}...`);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    console.log(`Uploading to Realtime Database at /${dbPath}...`);
    await db.ref(dbPath).set(data);
    console.log(`Successfully uploaded ${localPath} to /${dbPath}!`);
  } catch (err) {
    console.error(`Failed to upload ${localPath}:`, err);
  }
}

async function run() {
  console.log("Starting upload of all scraped/scanned data to Firebase Realtime Database...");
  
  // 1. Upload scan results
  await uploadFile("data/idx80_scan.json", "engine/idx_data");

  // 2. Upload live market indicators
  await uploadFile("data/live_market.json", "engine/live_market");

  // 3. Upload regime history
  await uploadFile("data/regime_history.json", "engine/regime_history");

  // 4. Upload fundamentals data (if exists)
  await uploadFile("data/idx_fundamentals_all.json", "engine/idx_fundamentals");

  // 5. Upload engine state (portfolio, watchlist, cash)
  await uploadFile("data/engine_state.json", "engine/state");

  console.log("All uploads completed successfully!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("Upload process crashed:", err);
  process.exit(1);
});
