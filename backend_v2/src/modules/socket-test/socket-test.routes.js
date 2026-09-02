import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';
import { getSocketStats } from '../../sockets/index.js';
import { db } from '../../config/db.js';
import { drivers, users } from '../../../drizzle/schema/index.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTAL_DIR = path.resolve(__dirname, '../../../portal');

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
        portals: {
          driverPortal: `${request.protocol}://${request.hostname}/portal/driver`,
          riderPortal: `${request.protocol}://${request.hostname}/portal/rider`,
          multiDriverSimulator: `${request.protocol}://${request.hostname}/portal/simulator`,
        },
      },
    };
  });

  // Quick dev token generator for testing sockets
  app.get('/socket-test/quick-auth', async (request, reply) => {
    const role = request.query.role || 'driver';
    const index = parseInt(request.query.index || '1', 10);

    try {
      if (role === 'driver') {
        const driverList = await db.select({
          id: drivers.id,
          name: drivers.name,
          phone: drivers.phone,
          status: drivers.status,
          approvalStatus: drivers.approvalStatus,
        }).from(drivers).limit(10);

        const driver = driverList[index - 1] || driverList[0] || { id: '77ea5a35-eea2-436e-9e5f-c62492273189', name: `Driver ${index}` };
        const token = app.jwt.sign({ id: driver.id, role: 'driver', name: driver.name });

        return {
          SUCCESS: true,
          DATA: {
            token,
            user: { id: driver.id, name: driver.name, role: 'driver', index },
          },
        };
      } else {
        const [rider] = await db.select({
          id: users.id,
          name: users.name,
          phone: users.phone,
        }).from(users).limit(1);

        const riderUser = rider || { id: '00000000-0000-0000-0000-000000000001', name: 'Test Rider' };
        const token = app.jwt.sign({ id: riderUser.id, role: 'rider', name: riderUser.name });

        return {
          SUCCESS: true,
          DATA: {
            token,
            user: { id: riderUser.id, name: riderUser.name, role: 'rider' },
          },
        };
      }
    } catch (err) {
      // Fallback
      const dummyId = role === 'driver' ? '77ea5a35-eea2-436e-9e5f-c62492273189' : '00000000-0000-0000-0000-000000000001';
      const token = app.jwt.sign({ id: dummyId, role });
      return {
        SUCCESS: true,
        DATA: { token, user: { id: dummyId, role } },
      };
    }
  });

  // ── Serve Portals ──────────────────────────────────────────────────────────
  app.get('/portal/driver', async (request, reply) => {
    const htmlPath = path.join(PORTAL_DIR, 'driver-portal.html');
    if (fs.existsSync(htmlPath)) {
      reply.type('text/html').send(fs.readFileSync(htmlPath, 'utf8'));
    } else {
      reply.status(404).send('Driver portal file not found');
    }
  });

  app.get('/portal/rider', async (request, reply) => {
    const htmlPath = path.join(PORTAL_DIR, 'rider-portal.html');
    if (fs.existsSync(htmlPath)) {
      reply.type('text/html').send(fs.readFileSync(htmlPath, 'utf8'));
    } else {
      reply.status(404).send('Rider portal file not found');
    }
  });

  app.get('/portal/simulator', async (request, reply) => {
    const htmlPath = path.join(PORTAL_DIR, 'simulator.html');
    if (fs.existsSync(htmlPath)) {
      reply.type('text/html').send(fs.readFileSync(htmlPath, 'utf8'));
    } else {
      reply.status(404).send('Simulator file not found');
    }
  });

  // Fallback for legacy UI route
  app.get('/socket-test/ui', async (request, reply) => {
    const htmlPath = path.join(PORTAL_DIR, 'simulator.html');
    if (fs.existsSync(htmlPath)) {
      reply.type('text/html').send(fs.readFileSync(htmlPath, 'utf8'));
    } else {
      reply.redirect('/portal/simulator');
    }
  });
}
