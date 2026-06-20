// server.ts
import express from "express";
import { handleYahooRequest } from "./src/server/yahooApi";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/api/yahoo", handleYahooRequest);

app.listen(PORT, () => {
  console.log(`Yahoo API server listening on http://localhost:${PORT}`);
});
