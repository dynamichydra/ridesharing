import { env } from '../../config/env.js';
import { getSocketStats } from '../../sockets/index.js';

export async function socketTestRoutes(app) {
  // JSON diagnostics endpoint
  app.get('/socket-test', async (request, reply) => {
    const stats = getSocketStats();
    return {
      SUCCESS: true,
      MESSAGE: 'Socket.IO server is active',
      DATA: {
        server: 'RideShare Socket.IO',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        stats,
        namespaces: {
          '/': 'Default public namespace (supports ping/pong, echo)',
          '/test': 'Public test namespace for connection & echo verification',
          '/driver': 'Authenticated namespace for drivers (requires JWT with role: driver)',
          '/rider': 'Authenticated namespace for riders (requires JWT with role: rider)',
        },
        supportedTransports: ['polling', 'websocket'],
        usageInstructions: {
          clientConnectionExample: "const socket = io('https://rideshareapi.dokume.in/driver', { auth: { token: 'YOUR_JWT_TOKEN' }, transports: ['polling', 'websocket'] });",
          testToolUrl: `${request.protocol}://${request.hostname}/socket-test/ui`,
        },
      },
    };
  });

  // Interactive Web UI for live browser-based socket testing
  app.get('/socket-test/ui', async (request, reply) => {
    reply.type('text/html').send(renderSocketTestHtml());
  });
}

function renderSocketTestHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RideShare Socket.IO Live Test Console</title>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --border: #1e293b;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 24px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    .badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-disconnected { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .badge-connected { background: rgba(16, 185, 129, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-connecting { background: rgba(245, 158, 11, 0.2); color: var(--warning); border: 1px solid var(--warning); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #cbd5e1;
    }
    .form-group { margin-bottom: 14px; }
    label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
    input, select, textarea {
      width: 100%;
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--primary); }
    .btn-row { display: flex; gap: 10px; margin-top: 16px; }
    button {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
    }
    button:hover { background: var(--primary-hover); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    button.btn-danger { background: var(--danger); }
    button.btn-danger:hover { background: #dc2626; }
    button.btn-secondary { background: #1e293b; color: #e2e8f0; }
    button.btn-secondary:hover { background: #334155; }
    .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .quick-actions button { padding: 6px 12px; font-size: 12px; }
    .log-box {
      background: #06090e;
      border: 1px solid var(--border);
      border-radius: 8px;
      height: 480px;
      overflow-y: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .log-entry { display: flex; gap: 8px; word-break: break-all; }
    .log-time { color: var(--text-muted); flex-shrink: 0; }
    .log-tag { font-weight: bold; flex-shrink: 0; }
    .log-tag.INFO { color: var(--primary); }
    .log-tag.SUCCESS { color: var(--success); }
    .log-tag.ERROR { color: var(--danger); }
    .log-tag.EMIT { color: #a855f7; }
    .log-tag.RECV { color: #38bdf8; }
    .log-msg { color: #e2e8f0; }
    .status-bar {
      margin-top: 12px;
      padding: 8px 12px;
      background: #090d16;
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚡ RideShare Socket.IO Console</h1>
      <span id="connBadge" class="badge badge-disconnected">Disconnected</span>
    </header>

    <div class="grid">
      <!-- Left Column: Controls & Emission -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="card">
          <div class="card-title">1. Connection Settings</div>
          <div class="form-group">
            <label>Server URL</label>
            <input type="text" id="serverUrl" value="${'window.location.origin'}" placeholder="https://rideshareapi.dokume.in">
          </div>
          <div class="form-group">
            <label>Namespace</label>
            <select id="namespace">
              <option value="/">/ (Public Root - Ping/Pong/Echo)</option>
              <option value="/test">/test (Public Test Namespace)</option>
              <option value="/driver">/driver (Requires Driver JWT)</option>
              <option value="/rider">/rider (Requires Rider JWT)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Transport Mode</label>
            <select id="transportMode">
              <option value="all">Auto (Polling + WebSocket upgrade)</option>
              <option value="polling">Polling only (HTTP Long-Polling)</option>
              <option value="websocket">WebSocket only (Direct WS)</option>
            </select>
          </div>
          <div class="form-group">
            <label>JWT Token (Auth Header / Query)</label>
            <input type="text" id="jwtToken" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
          </div>
          <div class="btn-row">
            <button id="btnConnect" onclick="connectSocket()">Connect</button>
            <button id="btnDisconnect" class="btn-danger" onclick="disconnectSocket()" disabled>Disconnect</button>
          </div>
          <div class="status-bar">
            <span id="transportInfo">Transport: None</span>
            <span id="socketIdInfo">Socket ID: None</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">2. Send Event / Quick Actions</div>
          <div class="form-group">
            <label>Event Name</label>
            <input type="text" id="eventName" value="ping" placeholder="ping, location_update, ride:subscribe">
          </div>
          <div class="form-group">
            <label>Payload (JSON)</label>
            <textarea id="eventPayload" rows="3">{"message": "Hello Server", "timestamp": "${new Date().toISOString()}"}</textarea>
          </div>
          <div class="btn-row">
            <button id="btnSend" onclick="sendEvent()" disabled>Emit Event</button>
          </div>

          <label style="margin-top: 16px;">Quick Presets:</label>
          <div class="quick-actions">
            <button class="btn-secondary" onclick="preset('ping', {})">Ping</button>
            <button class="btn-secondary" onclick="preset('echo', { hello: 'world' })">Echo</button>
            <button class="btn-secondary" onclick="preset('go_online', { lat: 28.6139, lng: 77.2090 })">Driver: go_online</button>
            <button class="btn-secondary" onclick="preset('location_update', { lat: 28.6139, lng: 77.2090, accuracy: 5, speedKmh: 40 })">Driver: location_update</button>
            <button class="btn-secondary" onclick="preset('go_offline', {})">Driver: go_offline</button>
            <button class="btn-secondary" onclick="preset('ride:subscribe', { rideId: '123' })">Rider: ride:subscribe</button>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Console Logs -->
      <div class="card" style="display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title" style="margin-bottom: 0;">3. Live Event Log</div>
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="clearLogs()">Clear</button>
        </div>
        <div class="log-box" id="logBox">
          <div class="log-entry">
            <span class="log-time">[Init]</span>
            <span class="log-tag INFO">[INFO]</span>
            <span class="log-msg">Ready to test socket connection. Select namespace and click Connect.</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('serverUrl').value = window.location.origin;
    let socket = null;

    function log(type, msg, data = null) {
      const box = document.getElementById('logBox');
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      let payloadStr = data ? ' ' + (typeof data === 'object' ? JSON.stringify(data) : data) : '';
      entry.innerHTML = \`<span class="log-time">[\${time}]</span> <span class="log-tag \${type}">[\${type}]</span> <span class="log-msg">\${msg}\${payloadStr}</span>\`;
      box.appendChild(entry);
      box.scrollTop = box.scrollHeight;
    }

    function clearLogs() {
      document.getElementById('logBox').innerHTML = '';
    }

    function setUIState(state) {
      const badge = document.getElementById('connBadge');
      const btnConn = document.getElementById('btnConnect');
      const btnDisconn = document.getElementById('btnDisconnect');
      const btnSend = document.getElementById('btnSend');

      if (state === 'connected') {
        badge.className = 'badge badge-connected';
        badge.innerText = 'Connected';
        btnConn.disabled = true;
        btnDisconn.disabled = false;
        btnSend.disabled = false;
      } else if (state === 'connecting') {
        badge.className = 'badge badge-connecting';
        badge.innerText = 'Connecting...';
        btnConn.disabled = true;
        btnDisconn.disabled = false;
        btnSend.disabled = true;
      } else {
        badge.className = 'badge badge-disconnected';
        badge.innerText = 'Disconnected';
        btnConn.disabled = false;
        btnDisconn.disabled = true;
        btnSend.disabled = true;
        document.getElementById('transportInfo').innerText = 'Transport: None';
        document.getElementById('socketIdInfo').innerText = 'Socket ID: None';
      }
    }

    function connectSocket() {
      if (socket) socket.disconnect();

      const serverUrl = document.getElementById('serverUrl').value.trim();
      const ns = document.getElementById('namespace').value;
      const transportMode = document.getElementById('transportMode').value;
      const token = document.getElementById('jwtToken').value.trim();

      let transports = ['polling', 'websocket'];
      if (transportMode === 'polling') transports = ['polling'];
      if (transportMode === 'websocket') transports = ['websocket'];

      const fullUrl = serverUrl.replace(/\\/+$/, '') + (ns === '/' ? '' : ns);

      setUIState('connecting');
      log('INFO', \`Connecting to \${fullUrl} via [\${transports.join(', ')}]...\`);

      const opts = {
        transports,
        reconnection: false,
        timeout: 10000,
        auth: token ? { token } : {},
        query: token ? { token } : {}
      };

      try {
        socket = io(fullUrl, opts);

        socket.on('connect', () => {
          setUIState('connected');
          const activeTransport = socket.io.engine ? socket.io.engine.transport.name : 'unknown';
          document.getElementById('transportInfo').innerText = 'Transport: ' + activeTransport;
          document.getElementById('socketIdInfo').innerText = 'Socket ID: ' + socket.id;
          log('SUCCESS', \`Connected successfully! ID: \${socket.id} (Transport: \${activeTransport})\`);

          if (socket.io.engine) {
            socket.io.engine.on('upgrade', (t) => {
              log('INFO', \`Transport upgraded to: \${t.name}\`);
              document.getElementById('transportInfo').innerText = 'Transport: ' + t.name;
            });
          }
        });

        socket.onAny((event, ...args) => {
          log('RECV', \`Event "\${event}":\`, args.length === 1 ? args[0] : args);
        });

        socket.on('connect_error', (err) => {
          setUIState('disconnected');
          log('ERROR', \`Connection error: \${err.message}\`);
        });

        socket.on('disconnect', (reason) => {
          setUIState('disconnected');
          log('INFO', \`Disconnected: \${reason}\`);
        });

      } catch (err) {
        setUIState('disconnected');
        log('ERROR', \`Failed to initialize socket: \${err.message}\`);
      }
    }

    function disconnectSocket() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      setUIState('disconnected');
    }

    function sendEvent() {
      if (!socket || !socket.connected) {
        alert('Socket not connected!');
        return;
      }
      const eventName = document.getElementById('eventName').value.trim();
      const payloadStr = document.getElementById('eventPayload').value.trim();
      let payload = {};
      if (payloadStr) {
        try {
          payload = JSON.parse(payloadStr);
        } catch (e) {
          alert('Invalid JSON in payload: ' + e.message);
          return;
        }
      }
      log('EMIT', \`Emitting "\${eventName}":\`, payload);
      socket.emit(eventName, payload);
    }

    function preset(name, payload) {
      document.getElementById('eventName').value = name;
      document.getElementById('eventPayload').value = JSON.stringify(payload, null, 2);
    }
  </script>
</body>
</html>`;
}
