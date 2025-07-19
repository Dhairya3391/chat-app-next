import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File } from "formidable";
import fs from "fs";
import path from "path";
import { startFtpServer } from "@/lib/ftp-server";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function getSingleField(
  field: string | string[] | undefined,
): string | undefined {
  if (typeof field === "string") return field;
  if (Array.isArray(field)) return field[0];
  return undefined;
}

function getSingleFile(file: File | File[] | undefined): File | undefined {
  if (!file) return undefined;
  if (Array.isArray(file)) return file[0];
  return file;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();
  await startFtpServer();
  const form = new IncomingForm({ maxFileSize: MAX_SIZE });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const sender = getSingleField(fields.sender);
    const recipientsRaw = getSingleField(fields.recipients);
    const file = getSingleFile(files.file);
    if (!sender || !recipientsRaw || !file) {
      return res.status(400).json({ error: "Missing fields" });
    }
    let recipientsArr: string[] = [];
    try {
      recipientsArr = JSON.parse(recipientsRaw);
    } catch {
      return res.status(400).json({ error: "Invalid recipients" });
    }
    if (file.size > MAX_SIZE) {
      return res.status(413).json({ error: "File too large" });
    }
    // Save file to FTP dir for each recipient
    for (const recipient of recipientsArr) {
      const userDir = path.join(process.cwd(), "public/ftp", sender, recipient);
      fs.mkdirSync(userDir, { recursive: true });
      const dest = path.join(
        userDir,
        file.originalFilename || file.newFilename,
      );
      fs.copyFileSync(file.filepath, dest);
    }
    res.status(200).json({ ok: true });
  });
}
