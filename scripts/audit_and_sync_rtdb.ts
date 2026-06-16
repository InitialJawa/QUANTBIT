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

console.log("Initializing Firebase Admin for Audit...");
const app = initializeApp({
  projectId: config.projectId,
  databaseURL
});

const db = getDatabase(app);

const FILES_TO_AUDIT = [
  { localPath: "data/idx80_scan.json", dbPath: "engine/idx_data", name: "IDX80 Scanner Results" },
  { localPath: "data/live_market.json", dbPath: "engine/live_market", name: "Live Market Indicators" },
  { localPath: "data/regime_history.json", dbPath: "engine/regime_history", name: "Market Regime History" },
  { localPath: "data/idx_fundamentals_all.json", dbPath: "engine/idx_fundamentals", name: "IDX Fundamentals Statistics" },
  { localPath: "data/engine_state.json", dbPath: "engine/state", name: "Quantbit Engine State" }
];

interface AuditReport {
  name: string;
  dbPath: string;
  localPath: string;
  localExists: boolean;
  dbExists: boolean;
  status: "MISSING_IN_DB" | "OUTDATED_IN_DB" | "UP_TO_DATE" | "MISSING_LOCALLY";
  actionTaken: string;
}

async function auditAndSync() {
  console.log("\n=======================================================");
  console.log("STARTING COMPREHENSIVE FIREBASE RTDB AUDIT & SYNC");
  console.log("=======================================================\n");

  const reports: AuditReport[] = [];

  for (const item of FILES_TO_AUDIT) {
    const fullLocalPath = path.join(process.cwd(), item.localPath);
    const localExists = fs.existsSync(fullLocalPath);
    
    let dbExists = false;
    let dbData: any = null;
    
    // Check if path exists in Realtime Database
    try {
      const snapshot = await db.ref(item.dbPath).once("value");
      dbExists = snapshot.exists();
      if (dbExists) {
        dbData = snapshot.val();
      }
    } catch (err) {
      console.error(`Error reading db path /${item.dbPath}:`, err);
    }

    if (!localExists) {
      reports.push({
        name: item.name,
        dbPath: item.dbPath,
        localPath: item.localPath,
        localExists,
        dbExists,
        status: "MISSING_LOCALLY",
        actionTaken: "Skipped (no local file to sync)"
      });
      continue;
    }

    const localRaw = fs.readFileSync(fullLocalPath, "utf-8");
    let localData: any = null;
    try {
      localData = JSON.parse(localRaw);
    } catch (err) {
      console.error(`Error parsing JSON for ${item.localPath}:`, err);
    }

    if (!dbExists) {
      // Missing in database
      console.log(`[AUDIT] /${item.dbPath} is missing in RTDB. Syncing...`);
      try {
        await db.ref(item.dbPath).set(localData);
        reports.push({
          name: item.name,
          dbPath: item.dbPath,
          localPath: item.localPath,
          localExists,
          dbExists,
          status: "MISSING_IN_DB",
          actionTaken: "Uploaded successfully"
        });
      } catch (err) {
        reports.push({
          name: item.name,
          dbPath: item.dbPath,
          localPath: item.localPath,
          localExists,
          dbExists,
          status: "MISSING_IN_DB",
          actionTaken: `Upload failed: ${err.message}`
        });
      }
    } else {
      // Compare content timestamps or lengths
      let isOutdated = false;
      let reason = "";

      const localUpdated = localData.lastUpdated || localData.last_update || null;
      const dbUpdated = dbData.lastUpdated || dbData.last_update || null;

      if (localUpdated && dbUpdated) {
        if (new Date(localUpdated) > new Date(dbUpdated)) {
          isOutdated = true;
          reason = `Local timestamp (${localUpdated}) is newer than DB (${dbUpdated})`;
        }
      } else {
        // Fallback to structure/checksum comparison
        const localLen = JSON.stringify(localData).length;
        const dbLen = JSON.stringify(dbData).length;
        if (localLen !== dbLen) {
          isOutdated = true;
          reason = `Data size differs (Local: ${localLen} chars, DB: ${dbLen} chars)`;
        }
      }

      if (isOutdated) {
        console.log(`[AUDIT] /${item.dbPath} is outdated in RTDB. Reason: ${reason}. Updating...`);
        try {
          await db.ref(item.dbPath).set(localData);
          reports.push({
            name: item.name,
            dbPath: item.dbPath,
            localPath: item.localPath,
            localExists,
            dbExists,
            status: "OUTDATED_IN_DB",
            actionTaken: `Updated successfully (${reason})`
          });
        } catch (err) {
          reports.push({
            name: item.name,
            dbPath: item.dbPath,
            localPath: item.localPath,
            localExists,
            dbExists,
            status: "OUTDATED_IN_DB",
            actionTaken: `Update failed: ${err.message}`
          });
        }
      } else {
        console.log(`[AUDIT] /${item.dbPath} is UP-TO-DATE.`);
        reports.push({
          name: item.name,
          dbPath: item.dbPath,
          localPath: item.localPath,
          localExists,
          dbExists,
          status: "UP_TO_DATE",
          actionTaken: "None (already up-to-date)"
        });
      }
    }
  }

  // Print Summary Table
  console.log("\n=======================================================");
  console.log("AUDIT RESULTS SUMMARY");
  console.log("=======================================================\n");
  console.table(reports.map(r => ({
    "Data Name": r.name,
    "RTDB Path": `/${r.dbPath}`,
    "Local File": r.localPath,
    "Audit Status": r.status,
    "Action Taken": r.actionTaken
  })));
  console.log("\n=======================================================\n");
}

auditAndSync().then(() => process.exit(0)).catch(err => {
  console.error("Audit process crashed:", err);
  process.exit(1);
});
