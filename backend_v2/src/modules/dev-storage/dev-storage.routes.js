import { saveLocalObject, readLocalObject, isValidLocalUploadSignature } from '../../utils/storage.js';

/**
 * Local disk-backed stand-in for S3, used only when S3 isn't configured (see
 * utils/storage.js). Mirrors the presigned-URL contract: clients PUT raw bytes to
 * `uploadUrl` and GET it back the same way. Only registered when `localStorageEnabled`
 * (config/env.js) — never in production unless ALLOW_LOCAL_STORAGE=true.
 *
 * Writes need either the signature from a server-issued upload URL or a valid bearer token
 * (the rider app uploads avatars here directly), so it can't be used as anonymous disk space.
 */
export async function devStorageRoutes(fastify) {
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  fastify.put('/*', { bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
    const key = request.params['*'];
    const { expires, signature } = request.query || {};
    if (!isValidLocalUploadSignature(key, expires, signature)) {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ SUCCESS: false, MESSAGE: 'Upload URL is invalid or expired' });
      }
    }
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      return reply.status(400).send({ SUCCESS: false, MESSAGE: 'Empty upload' });
    }

    await saveLocalObject(key, request.body);
    return reply.send({ SUCCESS: true, MESSAGE: 'Uploaded' });
  });

  fastify.get('/*', async (request, reply) => {
    const key = request.params['*'];
    const { buffer, contentType } = await readLocalObject(key);
    reply.header('Content-Type', contentType);
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.send(buffer);
  });
}
