import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useChatStore } from '@/stores/chat-store';
import { socketManager } from '@/lib/socket';

interface ShareFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareFileDialog({ open, onOpenChange }: ShareFileDialogProps) {
  const users = useChatStore((s) => s.users);
  const currentUsername = useChatStore((s) => s.currentUsername);
  const [file, setFile] = React.useState<File | null>(null);
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState<number>(0);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRecipientChange = (username: string) => {
    setRecipients((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const handleSend = async () => {
    if (!file || recipients.length === 0 || !currentUsername) return;
    setUploading(true);
    setError(null);
    try {
      // Upload file to backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender', currentUsername);
      formData.append('recipients', JSON.stringify(recipients));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/file/upload', true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          // Notify recipients via Socket.IO
          const socket = socketManager.getSocket();
          if (socket) {
            socket.emit('file-transfer-request', {
              fileName: file.name,
              size: file.size,
              sender: currentUsername,
              recipients,
            });
          }
          onOpenChange(false);
        } else {
          setError(xhr.responseText || 'Upload failed');
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        setError('Upload failed');
      };
      xhr.send(formData);
    } catch (err: unknown) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input type="file" onChange={handleFileChange} disabled={uploading} />
          <div>
            <div className="font-medium mb-2">Select Recipients</div>
            <div className="flex flex-wrap gap-2">
              {users
                .filter((u) => u.username !== currentUsername)
                .map((u) => (
                  <Button
                    key={u.username}
                    variant={recipients.includes(u.username) ? 'default' : 'outline'}
                    onClick={() => handleRecipientChange(u.username)}
                    size="sm"
                    disabled={uploading}
                  >
                    {u.username}
                  </Button>
                ))}
              <Button
                variant={recipients.includes('ALL') ? 'default' : 'outline'}
                onClick={() => setRecipients(['ALL'])}
                size="sm"
                disabled={uploading}
              >
                All
              </Button>
            </div>
          </div>
          {uploading && <Progress value={progress} className="w-full" />}
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={!file || recipients.length === 0 || uploading}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 