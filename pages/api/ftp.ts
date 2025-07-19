import type { NextApiRequest, NextApiResponse } from "next";
import { startFtpServer, addFtpUser, getFtpInfo } from "@/lib/ftp-server";

// For demo: use username from query, password is username reversed
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { username } = req.query;
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username" });
  }
  await startFtpServer();
  const password = username.split("").reverse().join("");
  addFtpUser(username, password, username);
  const info = getFtpInfo(username);
  if (!info) return res.status(500).json({ error: "Failed to get FTP info" });
  res.status(200).json(info);
}
