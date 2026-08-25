import { io } from 'socket.io-client';

console.log('Testing Socket.io connection to https://rideshareapi.dokume.in ...\n');

async function testNamespace(name, path, transports, auth) {
  return new Promise((resolve) => {
    console.log(`[TEST] Connecting to ${path} with transports: [${transports.join(', ')}] ...`);
    const socket = io(`https://rideshareapi.dokume.in${path}`, {
      transports,
      auth,
      reconnection: false,
      timeout: 8000,
    });

    socket.on('connect', () => {
      console.log(`✅ [${name}] Connected successfully! socket.id:`, socket.id);
      socket.disconnect();
      resolve({ success: true, transport: socket.io.engine.transport.name });
    });

    socket.on('connect_error', (err) => {
      console.log(`❌ [${name}] Connect error:`, err.message);
      socket.disconnect();
      resolve({ success: false, error: err.message });
    });

    setTimeout(() => {
      if (socket.connected) return;
      console.log(`⏳ [${name}] Timeout`);
      socket.disconnect();
      resolve({ success: false, error: 'Timeout' });
    }, 9000);
  });
}

async function run() {
  console.log('1. Testing Root (/) with Polling:');
  await testNamespace('Root-Polling', '/', ['polling'], {});

  console.log('\n2. Testing Root (/) with WebSocket:');
  await testNamespace('Root-WebSocket', '/', ['websocket'], {});

  console.log('\n3. Testing /driver without token (should get Unauthorized error from middleware):');
  await testNamespace('Driver-NoAuth', '/driver', ['polling'], {});

  console.log('\n4. Testing /rider without token (should get Unauthorized error from middleware):');
  await testNamespace('Rider-NoAuth', '/rider', ['polling'], {});

  process.exit(0);
}

run();
