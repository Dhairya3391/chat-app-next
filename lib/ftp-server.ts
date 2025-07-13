import { FtpSrv, FileSystem } from 'ftp-srv';
import path from 'path';
import fs from 'fs';

export interface FtpUser {
  username: string;
  password: string;
  root: string;
}

let ftpServer: FtpSrv | null = null;
const users: Record<string, FtpUser> = {};
const FTP_PORT = 2121;
const FTP_HOST = '127.0.0.1';
const FTP_ROOT = path.resolve(process.cwd(), 'public/ftp');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function startFtpServer() {
  if (ftpServer) return;
  ensureDir(FTP_ROOT);
  ftpServer = new FtpSrv({
    url: `ftp://${FTP_HOST}:${FTP_PORT}`,
    anonymous: false,
    pasv_url: FTP_HOST,
    greeting: ['Welcome to the chat FTP server!']
  });

  ftpServer.on('login', ({ username, password }, resolve, reject) => {
    const user = users[username];
    if (!user || user.password !== password) {
      return reject(new Error('Invalid credentials'));
    }
    ensureDir(user.root);
    resolve({ root: user.root } as FileSystem);
  });

  await ftpServer.listen();
}

export async function stopFtpServer() {
  if (ftpServer) {
    await ftpServer.close();
    ftpServer = null;
  }
  // Delete all files in FTP_ROOT
  if (fs.existsSync(FTP_ROOT)) {
    fs.rmSync(FTP_ROOT, { recursive: true, force: true });
  }
  Object.keys(users).forEach((u) => delete users[u]);
}

export function addFtpUser(username: string, password: string, subdir: string) {
  const userRoot = path.join(FTP_ROOT, subdir);
  ensureDir(userRoot);
  users[username] = { username, password, root: userRoot };
}

export function removeFtpUser(username: string) {
  delete users[username];
}

export function getFtpInfo(username: string) {
  const user = users[username];
  if (!user) return null;
  return {
    host: FTP_HOST,
    port: FTP_PORT,
    username: user.username,
    password: user.password,
    root: user.root.replace(process.cwd(), ''),
    url: `ftp://${FTP_HOST}:${FTP_PORT}`,
  };
} 