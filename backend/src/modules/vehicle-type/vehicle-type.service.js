import { eq, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listAll(onlyActive = true) {
  const where = onlyActive ? eq(vehicleTypes.isActive, true) : undefined;
  return db.select().from(vehicleTypes).where(where).orderBy(asc(vehicleTypes.sortOrder));
}

export async function listPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(vehicleTypes);
  const rows = await db.select().from(vehicleTypes).orderBy(asc(vehicleTypes.sortOrder)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, id)).limit(1);
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };
  return vt;
}

export async function create(data, adminId) {
  const slug = data.name.toLowerCase().replace(/\s+/g, '-');
  const [vt] = await db.insert(vehicleTypes).values({ ...data, slug, createdBy: adminId }).returning();
  return vt;
}

export async function update(id, data) {
  if (data.name) data.slug = data.name.toLowerCase().replace(/\s+/g, '-');
  data.updatedAt = new Date();
  const [vt] = await db.update(vehicleTypes).set(data).where(eq(vehicleTypes.id, id)).returning();
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };
  return vt;
}

export async function remove(id) {
  // Soft delete
  const [vt] = await db.update(vehicleTypes).set({ isActive: false, updatedAt: new Date() })
    .where(eq(vehicleTypes.id, id)).returning();
  if (!vt) throw { statusCode: 404, message: 'Vehicle type not found' };
  return { deleted: true };
}
