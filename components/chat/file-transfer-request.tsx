import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useChatStore } from '@/stores/chat-store';
import { socketManager } from '@/lib/socket';

interface FileTransferRequestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    fileName: string;
    size: number;
    sender: string;
  } | null;
}

interface FtpInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  root: string;
  url: string;
}

export function FileTransferRequest({ open, onOpenChange, request }: FileTransferRequestProps) {
  const [accepted, setAccepted] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);
  const [ftpInfo, setFtpInfo] = React.useState<FtpInfo | null>(null);
  const [progress, setProgress] = React.useState<number>(0);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const currentUsername = useChatStore((s) => s.currentUsername);

  const handleAccept = async () => {
    setAccepted(true);
    setRejected(false);
    setError(null);
    // Notify sender via Socket.IO
    const socket = socketManager.getSocket();
    if (socket && request) {
      socket.emit('file-transfer-approval-response', {
        sender: request.sender,
        recipient: currentUsername,
        fileName: request.fileName,
        accepted: true,
      });
    }
    // Fetch FTP info
    try {
      const res = await fetch(`/api/ftp?username=${encodeURIComponent(currentUsername || '')}`);
      const info: FtpInfo = await res.json();
      setFtpInfo(info);
    } catch {
      setError('Failed to get FTP info');
    }
  };

  const handleReject = () => {
    setAccepted(false);
    setRejected(true);
    onOpenChange(false);
    // Notify sender via Socket.IO
    const socket = socketManager.getSocket();
    if (socket && request) {
      socket.emit('file-transfer-approval-response', {
        sender: request.sender,
        recipient: currentUsername,
        fileName: request.fileName,
        accepted: false,
      });
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setError(null);
    try {
      const res = await fetch(`/api/file/download?sender=${encodeURIComponent(request?.sender || '')}&recipient=${encodeURIComponent(currentUsername || '')}&file=${encodeURIComponent(request?.fileName || '')}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error('Download failed or file not found');
      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : undefined;
      const reader = res.body?.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (total) setProgress((received / total) * 100);
          }
        }
        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = request?.fileName || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setDownloading(false);
        setProgress(100);
      } else {
        // fallback for browsers without stream support
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = request?.fileName || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setDownloading(false);
        setProgress(100);
      }
    } catch {
      setDownloading(false);
      setError('Download failed or file not found');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Incoming File Transfer</DialogTitle>
        </DialogHeader>
        {request && (
          <div className="space-y-2">
            <div><b>From:</b> {request.sender}</div>
            <div><b>File:</b> {request.fileName}</div>
            <div><b>Size:</b> {(request.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        )}
        {accepted && !rejected && (
          <div className="text-green-600 text-sm mb-2">File transfer accepted. You can now download the file.</div>
        )}
        {rejected && (
          <div className="text-red-600 text-sm mb-2">File transfer rejected.</div>
        )}
        {accepted && ftpInfo && (
          <div className="bg-muted p-2 rounded text-xs">
            <div><b>FTP Info:</b></div>
            <div>Host: {ftpInfo.host}</div>
            <div>Port: {ftpInfo.port}</div>
            <div>Username: {ftpInfo.username}</div>
            <div>Password: {ftpInfo.password}</div>
            <div>Path: {ftpInfo.root}/{request?.sender}/{currentUsername}/{request?.fileName}</div>
          </div>
        )}
        {accepted && !rejected && (
          <Button onClick={handleDownload} disabled={downloading} className="mt-2">
            Download
          </Button>
        )}
        {downloading && <Progress value={progress} className="w-full" />}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {!accepted && !rejected && (
          <DialogFooter>
            <Button onClick={handleAccept}>Accept</Button>
            <Button variant="outline" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 