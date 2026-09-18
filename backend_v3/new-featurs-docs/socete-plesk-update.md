# Plesk + Node.js + Socket.IO Production Setup

## `gameapi.dokume.in` and `rideshareapi.dokume.in`

This document explains how to configure, troubleshoot, and permanently fix Socket.IO WebSocket connections for Node.js applications running behind **Plesk + Nginx + Passenger**.

---

# 1. Architecture

The recommended architecture is:

```text
Frontend
   |
   | HTTPS
   v
Nginx / Plesk
   |
   | HTTP/1.1 + WebSocket Upgrade
   v
Node.js application
   |
   +---- REST API
   |
   +---- Socket.IO
```

For example:

```text
https://game.dokume.in
          |
          v
https://gameapi.dokume.in
          |
          v
Plesk / Nginx
          |
          v
Node.js + Socket.IO
```

And:

```text
Rideshare Frontend
          |
          v
https://rideshareapi.dokume.in
          |
          v
Plesk / Nginx
          |
          v
Node.js + Socket.IO
```

---

# 2. Important Rule: Never Depend on a Temporary Port

A common mistake is:

```text
Yesterday:
Node → :4000

Today:
Node → :8080
```

and Nginx still contains:

```nginx
proxy_pass http://127.0.0.1:4000;
```

Then:

```text
Browser
   |
   v
Nginx
   |
   v
127.0.0.1:4000
   |
   X
Connection refused
```

The correct approach is:

```text
Node application
       |
       | stable configured port
       v
Nginx Socket.IO proxy
```

For `gameapi.dokume.in`, the current application configuration is:

```env
NODE_ENV=development
PORT=8080
```

Therefore the Socket.IO proxy should target:

```text
127.0.0.1:8080
```

not the old `4000`.

---

# 3. Game API Configuration

Application:

```text
gameapi.dokume.in
```

Application directory:

```text
/var/www/vhosts/dokume.in/gameapi.dokume.in
```

Build output:

```text
dist/
```

Start command:

```bash
node dist/server.js
```

Package script:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js"
  }
}
```

Current `.env`:

```env
NODE_ENV=development
PORT=8080
CORS_ORIGIN=https://game.dokume.in,http://localhost:3000,http://localhost:5173,http://localhost:5174
```

---

# 4. Game API Socket.IO Nginx Configuration

Do NOT modify the generated Plesk Nginx configuration directly.

Do not edit:

```text
/var/www/vhosts/system/gameapi.dokume.in/conf/nginx.conf
```

because Plesk can regenerate it.

Instead use:

```text
/var/www/vhosts/system/gameapi.dokume.in/conf/vhost_nginx.conf
```

Put:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:8080;

    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 86400;
    proxy_send_timeout 86400;

    proxy_buffering off;
}
```

## Important

Prefer:

```nginx
proxy_pass http://127.0.0.1:8080;
```

instead of:

```nginx
proxy_pass http://127.0.0.1:8080/socket.io/;
```

This preserves the original URI:

```text
/socket.io/?EIO=4&transport=websocket
```

---

# 5. Apply Plesk Configuration

After editing:

```bash
/usr/local/psa/admin/sbin/httpdmng --reconfigure-domain gameapi.dokume.in
```

Then:

```bash
nginx -t
```

Expected:

```text
syntax is ok
test is successful
```

Then:

```bash
systemctl reload nginx
```

---

# 6. Test Node.js Directly

Always test the application before testing HTTPS.

For Game API:

```bash
curl -i "http://127.0.0.1:8080/socket.io/?EIO=4&transport=polling"
```

Expected:

```text
HTTP/1.1 200 OK
```

and:

```text
0{"sid":"...","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,...}
```

The important part is:

```json
"upgrades":["websocket"]
```

---

# 7. Test Direct WebSocket

Run:

```bash
curl -i \
  --http1.1 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==" \
  "http://127.0.0.1:8080/socket.io/?EIO=4&transport=websocket"
```

Expected:

```text
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: ...
```

If you receive:

```text
101 Switching Protocols
```

Node.js + Socket.IO is working.

---

# 8. Test HTTPS Polling

After direct Node testing succeeds:

```bash
curl -i "https://gameapi.dokume.in/socket.io/?EIO=4&transport=polling"
```

Expected:

```text
HTTP/2 200
```

and:

```text
"upgrades":["websocket"]
```

---

# 9. Test HTTPS WebSocket

Run:

```bash
curl -i \
  --http1.1 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==" \
  "https://gameapi.dokume.in/socket.io/?EIO=4&transport=websocket"
```

Expected:

```text
HTTP/1.1 101 Switching Protocols
```

If you get:

```text
400 Bad Request
```

check Nginx and Passenger routing.

---

# 10. Important Socket.IO Application Configuration

Your Socket.IO server should allow both transports:

```ts
transports: ["polling", "websocket"]
```

Example:

```ts
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },

    transports: ["polling", "websocket"],
});
```

Do not configure only:

```ts
transports: ["websocket"]
```

unless you specifically need that behavior.

---

# 11. CORS

For Game API:

```env
CORS_ORIGIN=https://game.dokume.in,http://localhost:3000,http://localhost:5173,http://localhost:5174
```

The frontend origin is what matters.

For example:

```text
Frontend:
https://game.dokume.in

API:
https://gameapi.dokume.in
```

The CORS origin should contain:

```text
https://game.dokume.in
```

It does not need to contain:

```text
https://gameapi.dokume.in
```

just because that is the API server.

---

# 12. Rideshare API

Application:

```text
rideshareapi.dokume.in
```

Application directory:

```text
/var/www/vhosts/dokume.in/rideshareapi.dokume.in
```

Your Rideshare application uses Fastify + Socket.IO.

The Socket.IO initialization is attached to Fastify's underlying HTTP server:

```js
initSocketIO(app.server, app);
```

This is the correct architecture.

Do NOT create a second HTTP server for Socket.IO if Socket.IO is already attached to:

```js
app.server
```

---

# 13. Rideshare Port

Before configuring Nginx, determine the actual Node.js listening port.

Run:

```bash
ss -lntp | grep node
```

For example:

```text
LISTEN 0 511 0.0.0.0:3010 ... node
```

Then test:

```bash
curl -i http://127.0.0.1:3010/health
```

If:

```text
HTTP/1.1 200 OK
```

then `3010` is the correct application port.

---

# 14. Rideshare Socket.IO Direct Test

If Rideshare is running on port `3010`:

```bash
curl -i "http://127.0.0.1:3010/socket.io/?EIO=4&transport=polling"
```

Expected:

```text
HTTP/1.1 200 OK
```

However, if your Rideshare Socket.IO implementation uses another endpoint or namespace, verify the Socket.IO configuration before changing Nginx.

---

# 15. Rideshare Nginx Configuration

Use:

```text
/var/www/vhosts/system/rideshareapi.dokume.in/conf/vhost_nginx.conf
```

Example:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:3010;

    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 86400;
    proxy_send_timeout 86400;

    proxy_buffering off;
}
```

Replace `3010` with the actual stable port used by the Rideshare application.

---

# 16. Apply Rideshare Configuration

```bash
/usr/local/psa/admin/sbin/httpdmng --reconfigure-domain rideshareapi.dokume.in
```

Then:

```bash
nginx -t
```

Then:

```bash
systemctl reload nginx
```

---

# 17. Check Which Process Owns a Port

For example:

```bash
ss -lntp | grep ':8080'
```

or:

```bash
ss -lntp | grep ':3010'
```

You may see:

```text
users:(("node",pid=4076003,fd=19))
```

Then inspect it:

```bash
ps -fp 4076003
```

Check its working directory:

```bash
readlink -f /proc/4076003/cwd
```

Check its command:

```bash
tr '\0' ' ' < /proc/4076003/cmdline
```

---

# 18. Find All Node Applications

```bash
pgrep -af "node"
```

Or:

```bash
ss -lntp | grep node
```

This is useful when multiple applications exist on the same server.

Example:

```text
3001 → Node application
3002 → Node application
3010 → Rideshare
4000 → old process
4040 → Game API
8050 → Game API
8080 → Game API
```

Do not assume a port is permanent just because it worked yesterday.

Always identify the current application owner.

---

# 19. If a Port Suddenly Disappears

Example:

Yesterday:

```text
:4000 → node PID 2356310
```

Today:

```text
:4000 → nothing
```

Check:

```bash
pgrep -af "dist/server.js"
```

Then:

```bash
ss -lntp | grep node
```

Then:

```bash
tail -200 /var/www/vhosts/system/gameapi.dokume.in/logs/error_log
```

And:

```bash
tail -200 /var/www/vhosts/system/gameapi.dokume.in/logs/proxy_error_log
```

Also check:

```bash
journalctl --since "24 hours ago" | grep -iE "oom|out of memory|killed process|node|SIGTERM|SIGKILL"
```

---

# 20. Do Not Start Old Ports Manually

Avoid doing this as a permanent solution:

```bash
PORT=4000 node dist/server.js
```

or:

```bash
node dist/server.js
```

from a random terminal and leaving it running.

This can create:

```text
Plesk Passenger → 8080
Manual Node → 4000
```

and later the manual process may disappear after:

* server reboot
* process crash
* deployment
* Plesk restart
* terminal/session termination
* configuration regeneration

Then Socket.IO breaks again.

---

# 21. Correct Production Process

Use one process manager/hosting mechanism.

For Plesk:

```text
Plesk Passenger
        |
        v
Node.js
        |
        v
Socket.IO
```

Nginx should proxy to the port actually used by the Plesk-managed application.

Avoid running another duplicate instance manually.

---

# 22. Check Passenger

Your Game API response showed:

```text
X-Powered-By: Phusion Passenger(R) 6.1.3
```

That indicates Passenger is involved.

Therefore, after deployments/restarts, verify that Passenger starts the application correctly.

Check:

```bash
ps aux | grep '[n]ode'
```

and:

```bash
ss -lntp | grep node
```

---

# 23. Nginx Error Log

Game API:

```bash
tail -100 \
/var/www/vhosts/system/gameapi.dokume.in/logs/proxy_error_log
```

Rideshare:

```bash
tail -100 \
/var/www/vhosts/system/rideshareapi.dokume.in/logs/proxy_error_log
```

A particularly important error is:

```text
upstream prematurely closed connection while reading response header from upstream
```

Also inspect the upstream:

```text
upstream: "http://127.0.0.1:8080/..."
```

This tells you which Node port Nginx is actually trying to reach.

---

# 24. Very Important Nginx Debugging Rule

If the error says:

```text
upstream: "http://127.0.0.1:4000/..."
```

Nginx is using port:

```text
4000
```

If the actual application is on:

```text
8080
```

you have a configuration mismatch.

The solution is to update:

```nginx
proxy_pass
```

to the correct application port.

---

# 25. Do Not Edit Generated Nginx Files

Plesk generated files may contain:

```text
DO NOT MODIFY THIS FILE BECAUSE IT WAS GENERATED AUTOMATICALLY
```

Do not permanently edit those files.

Use:

```text
vhost_nginx.conf
```

for custom Nginx directives.

Afterward:

```bash
/usr/local/psa/admin/sbin/httpdmng --reconfigure-domain DOMAIN
```

---

# 26. Socket.IO Testing Checklist

Always test in this order.

## Step 1 — Node port

```bash
ss -lntp | grep ':PORT'
```

## Step 2 — Health

```bash
curl -i http://127.0.0.1:PORT/health
```

## Step 3 — Socket.IO polling

```bash
curl -i \
"http://127.0.0.1:PORT/socket.io/?EIO=4&transport=polling"
```

## Step 4 — Direct WebSocket

```bash
curl -i \
--http1.1 \
-H "Connection: Upgrade" \
-H "Upgrade: websocket" \
-H "Sec-WebSocket-Version: 13" \
-H "Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==" \
"http://127.0.0.1:PORT/socket.io/?EIO=4&transport=websocket"
```

Expected:

```text
101 Switching Protocols
```

## Step 5 — HTTPS polling

```bash
curl -i \
"https://DOMAIN/socket.io/?EIO=4&transport=polling"
```

## Step 6 — HTTPS WebSocket

```bash
curl -i \
--http1.1 \
-H "Connection: Upgrade" \
-H "Upgrade: websocket" \
-H "Sec-WebSocket-Version: 13" \
-H "Sec-WebSocket-Key: SGVsbG9Xb3JsZDEyMzQ1Ng==" \
"https://DOMAIN/socket.io/?EIO=4&transport=websocket"
```

---

# 27. Expected Results

Healthy system:

```text
Node HTTP
    ↓
200 OK

Socket.IO polling
    ↓
200 OK

Direct WebSocket
    ↓
101 Switching Protocols

HTTPS polling
    ↓
200 OK

HTTPS WebSocket
    ↓
101 Switching Protocols
```

---

# 28. Meaning of Common Errors

## Connection refused

```text
curl: (7) Failed to connect
```

Usually means:

```text
Nothing is listening on that port
```

Check:

```bash
ss -lntp | grep ':PORT'
```

---

## 502 Bad Gateway

Usually means:

```text
Nginx
   ↓
upstream
   ↓
failed
```

Check:

```bash
tail -100 /var/www/vhosts/system/DOMAIN/logs/proxy_error_log
```

---

## Socket.IO 404

Example:

```json
{
  "message": "Route GET:/socket.io/... not found"
}
```

Possible causes:

* Socket.IO is not attached to the HTTP server
* wrong application port
* request reached Fastify/Express instead of Socket.IO
* incorrect Socket.IO path

---

## 400 Bad Request

Example:

```json
{
  "code": 3,
  "message": "Bad request"
}
```

Possible causes:

* WebSocket upgrade not reaching Socket.IO
* Nginx/Passenger path rewriting
* incorrect proxy configuration
* malformed WebSocket request
* incorrect Socket.IO endpoint/path

Check the Nginx error log.

---

## 101 Switching Protocols

This is the desired result:

```text
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

It means the WebSocket upgrade succeeded.

---

# 29. Browser Socket.IO Client

Example:

```js
import { io } from "socket.io-client";

const socket = io("https://gameapi.dokume.in", {
    transports: ["polling", "websocket"],
    withCredentials: true,
});

socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
});

socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
});
```

If using namespaces, for example:

```text
/games/aviator
```

connect using:

```js
const socket = io(
    "https://gameapi.dokume.in/games/aviator",
    {
        transports: ["polling", "websocket"],
        withCredentials: true,
    }
);
```

The exact namespace must match your server configuration.

---

# 30. Game API Namespace Architecture

Your application uses game-specific namespaces.

Conceptually:

```text
Socket.IO
   |
   +-- /games/aviator
   |
   +-- /games/andar-bahar
   |
   +-- /games/roulette
   |
   +-- /games/lucky-seven
   |
   +-- /games/horse-racing
```

Nginx still only needs to proxy:

```text
/socket.io/
```

It does not need a separate Nginx location for every namespace.

---

# 31. Deployment Checklist

After deploying a new version:

```bash
cd /var/www/vhosts/dokume.in/gameapi.dokume.in
```

Build:

```bash
npm run build
```

Verify:

```bash
ls -la dist/
```

Then verify the running application:

```bash
ss -lntp | grep node
```

Verify Socket.IO:

```bash
curl -i \
"http://127.0.0.1:8080/socket.io/?EIO=4&transport=polling"
```

Then verify HTTPS:

```bash
curl -i \
"https://gameapi.dokume.in/socket.io/?EIO=4&transport=polling"
```

---

# 32. Final Recommended Configuration

## Game API

```text
Domain:
gameapi.dokume.in

Frontend:
game.dokume.in

Node:
Plesk Passenger

Application:
node dist/server.js

Port:
8080

Socket.IO:
enabled

Nginx:
proxy /socket.io/ → 127.0.0.1:8080
```

## Rideshare API

```text
Domain:
rideshareapi.dokume.in

Node:
Plesk/Node application

Application:
src/server.js / configured server entry

Port:
Use the port currently assigned to the Plesk application

Socket.IO:
enabled

Nginx:
proxy /socket.io/ → actual application port
```

---

# 33. Golden Rule

When Socket.IO stops working, **do not immediately change Socket.IO code**.

Check these three things first:

```bash
ss -lntp | grep node
```

```bash
curl -i "http://127.0.0.1:PORT/socket.io/?EIO=4&transport=polling"
```

```bash
tail -100 /var/www/vhosts/system/DOMAIN/logs/proxy_error_log
```

The debugging flow is:

```text
Is Node running?
       |
       +-- NO → fix Node/Plesk/Passenger
       |
       YES
       |
       v
Does localhost Socket.IO work?
       |
       +-- NO → fix Node/Socket.IO
       |
       YES
       |
       v
Does HTTPS polling work?
       |
       +-- NO → fix Nginx/Plesk proxy
       |
       YES
       |
       v
Does HTTPS WebSocket return 101?
       |
       +-- NO → fix WebSocket upgrade proxy
       |
       YES
       |
       v
Socket.IO production connection works
```

---

# 34. Most Important Lessons From the Incident

### Problem

An old Socket.IO configuration used:

```nginx
proxy_pass http://127.0.0.1:4000/socket.io/;
```

but the Node process on `4000` disappeared.

### Current application

The Game API `.env` says:

```env
PORT=8080
```

and Node is listening on:

```text
*:8080
```

### Permanent solution

Use:

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:8080;

    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 86400;
    proxy_send_timeout 86400;

    proxy_buffering off;
}
```

Then let Plesk manage the Node application.

You should **not need to change the port every day**.

The port and Nginx proxy should remain aligned permanently.
