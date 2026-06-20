// src/server/yahooApi.ts
import type { Request, Response } from "express";
import { fetchYahooData } from "../data/yahoo/fetchYahooData";

export async function handleYahooRequest(req: Request, res: Response) {
  const ticker = (req.query.ticker as string | undefined)?.toUpperCase();
  if (!ticker) {
    res.status(400).json({ error: "Missing ticker query parameter" });
    return;
  }
  const data = await fetchYahooData(ticker);
  if (!data) {
    res.status(404).json({ error: "Yahoo data not found for ticker " + ticker });
    return;
  }
  res.json(data);
}
