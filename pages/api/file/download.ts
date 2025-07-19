import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { sender, recipient, file } = req.query;
  if (
    !sender ||
    !recipient ||
    !file ||
    typeof sender !== "string" ||
    typeof recipient !== "string" ||
    typeof file !== "string"
  ) {
    return res.status(400).json({ error: "Missing params" });
  }
  const filePath = path.join(
    process.cwd(),
    "public/ftp",
    sender,
    recipient,
    file,
  );
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
