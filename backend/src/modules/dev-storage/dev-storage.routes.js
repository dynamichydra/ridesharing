import { isS3Configured } from '../../config/env.js';
import { saveLocalObject, readLocalObject } from '../../utils/storage.js';

/**
 * Local disk-backed stand-in for S3, used only when S3 isn't configured (see
 * utils/storage.js). Mirrors the presigned-URL contract: clients PUT raw bytes to
 * `uploadUrl` and GET it back the same way. Always 404s once S3 is configured, so it
 * can't become a stray write-to-disk endpoint in a properly configured deployment.
 */
export async function devStorageRoutes(fastify) {
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  fastify.put('/*', { bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
    if (isS3Configured) return reply.status(404).send({ SUCCESS: false, MESSAGE: 'Not found' });

    const key = request.params['*'];
    await saveLocalObject(key, request.body);
    return reply.send({ SUCCESS: true, MESSAGE: 'Uploaded' });
  });

  fastify.get('/*', async (request, reply) => {
    if (isS3Configured) return reply.status(404).send({ SUCCESS: false, MESSAGE: 'Not found' });

    const key = request.params['*'];
    const { buffer, contentType } = await readLocalObject(key);
    reply.header('Content-Type', contentType);
    return reply.send(buffer);
  });
}
