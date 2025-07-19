# Chat-app

A modern real-time chat application built with Next.js, Socket.IO, and React. Features include admin controls, persistent IP banning, curse word filtering, and a responsive UI.

---

## Features

### For All Users

- Real-time chat with instant message delivery
- Username selection (with persistence via localStorage)
- Responsive, modern UI
- Message pinning (view only)
- System messages for joins, leaves, bans, and announcements
- Automatic reconnection and join error handling

### For Admins

- **Admin login**: Use username `noobokay` and password `noobokay` to access admin features
- **Admin commands (type in chat input):**
  - `/ban <username>`: Ban a user for 2 minutes (by IP, persistent)
  - `/unban <username>`: Unban a user (removes IP ban)
  - `/kick <username>`: Force disconnect a user
  - `/clear`: Clear all chat messages
  - `/announce <message>`: Broadcast a system announcement
  - `/approve <username>`: Approve a user to send large files (over 100MB)
  - `/users`: List all current users
- **Pin/unpin messages**: Pin any message for all users

### Banning System

- **Admin bans**: When an admin bans a user, their IP is banned for the specified duration. Ban persists across reconnects, refreshes, and username changes.
- **Curse word bans**: If a user sends a message containing a banned word (see `bannedWords.json`), their IP is banned for 2 minutes.
- **Persistent bans**: All IP bans are stored in `bannedIps.json` and persist across server restarts.
- **Unbanning**: Admins can unban users, which removes their IP from the ban list.
- **Ban enforcement**: Banned users are immediately disconnected and cannot rejoin until the ban expires.

---

## Setup & Development

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd Chat-app
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```

3. **Run the development server**

   ```bash
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```

4. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## File Structure

- `pages/api/socket.ts` — Main Socket.IO server logic, admin commands, ban logic
- `bannedIps.json` — Persistent storage for banned IPs (auto-created)
- `bannedWords.json` — List of banned words for curse word filtering
- `components/` — All React components (chat UI, admin controls, etc.)
- `stores/` — Zustand store for chat state
- `lib/socket.ts` — Socket.IO client manager

---

## Admin Usage

1. **Login as admin**: Enter username `noobokay` and password `noobokay` on the join screen.
2. **Use admin commands**: Type commands directly into the chat input (see above for list).
3. **Ban/unban/kick**: Use `/ban`, `/unban`, `/kick` followed by the username (case-insensitive).
4. **Announcements**: Use `/announce <message>` to send a system-wide message.
5. **Clear chat**: Use `/clear` to remove all messages for everyone.

---

## Client Usage

- **Join chat**: Enter a username (max 20 chars) and join.
- **Send messages**: Type and send messages (max 500 chars).
- **See pinned messages**: If an admin pins a message, it will be highlighted.
- **See system messages**: Join/leave, bans, and announcements are shown as system messages.
- **Banned?**: If you are banned (by admin or for using a banned word), you will be disconnected and cannot rejoin until the ban expires.

---

## Deployment Notes

- **Persistent bans**: The app uses `bannedIps.json` for persistent IP bans. Ensure your deployment allows file read/write in the project root.
- **Proxies**: The app uses the `x-forwarded-for` header to get the real client IP. If deploying behind a proxy (e.g., Vercel, Nginx), make sure this header is forwarded.
- **Hosting**: Can be hosted on any Node.js-compatible platform (Vercel, Heroku, DigitalOcean, etc.).
- **Scaling**: For multi-instance deployments, consider using a shared database or cache for bans instead of the local file.

---

## Customization

- **Banned words**: Edit `bannedWords.json` to add/remove words.
- **Ban duration**: Change the duration in the admin ban or curse word ban logic in `pages/api/socket.ts`.
- **UI**: Customize components in `components/` for your branding or features.

---

## License

MIT
