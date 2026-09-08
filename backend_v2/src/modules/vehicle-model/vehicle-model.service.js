import { eq, and, or, ilike, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { vehicleModels, vehicleTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

function toSlug(brand, name) {
  return `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-');
}

export async function listAll(onlyActive = true, vehicleTypeId, search = null) {
  const conditions = [];
  if (onlyActive) conditions.push(eq(vehicleModels.isActive, true));
  if (vehicleTypeId) conditions.push(eq(vehicleModels.vehicleTypeId, vehicleTypeId));
  if (search) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(vehicleModels.name, term), ilike(vehicleModels.brand, term)));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  return db
    .select({
      id: vehicleModels.id,
      vehicleTypeId: vehicleModels.vehicleTypeId,
      brand: vehicleModels.brand,
      name: vehicleModels.name,
      slug: vehicleModels.slug,
      sortOrder: vehicleModels.sortOrder,
      isActive: vehicleModels.isActive,
      vehicleType: {
        id: vehicleTypes.id,
        name: vehicleTypes.name,
        icon: vehicleTypes.icon,
        capacity: vehicleTypes.capacity,
      },
    })
    .from(vehicleModels)
    .leftJoin(vehicleTypes, eq(vehicleModels.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.brand), asc(vehicleModels.name));
}

export async function listPaginated(page, limit, offset, vehicleTypeId, search = null) {
  const conditions = [];
  if (vehicleTypeId) conditions.push(eq(vehicleModels.vehicleTypeId, vehicleTypeId));
  if (search) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(vehicleModels.name, term), ilike(vehicleModels.brand, term)));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(vehicleModels).where(where);
  const rows = await db
    .select({
      id: vehicleModels.id,
      vehicleTypeId: vehicleModels.vehicleTypeId,
      brand: vehicleModels.brand,
      name: vehicleModels.name,
      slug: vehicleModels.slug,
      sortOrder: vehicleModels.sortOrder,
      isActive: vehicleModels.isActive,
      vehicleType: {
        id: vehicleTypes.id,
        name: vehicleTypes.name,
        icon: vehicleTypes.icon,
        capacity: vehicleTypes.capacity,
      },
    })
    .from(vehicleModels)
    .leftJoin(vehicleTypes, eq(vehicleModels.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.brand), asc(vehicleModels.name))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [vm] = await db
    .select({
      id: vehicleModels.id,
      vehicleTypeId: vehicleModels.vehicleTypeId,
      brand: vehicleModels.brand,
      name: vehicleModels.name,
      slug: vehicleModels.slug,
      sortOrder: vehicleModels.sortOrder,
      isActive: vehicleModels.isActive,
      vehicleType: {
        id: vehicleTypes.id,
        name: vehicleTypes.name,
        icon: vehicleTypes.icon,
        capacity: vehicleTypes.capacity,
      },
    })
    .from(vehicleModels)
    .leftJoin(vehicleTypes, eq(vehicleModels.vehicleTypeId, vehicleTypes.id))
    .where(eq(vehicleModels.id, id))
    .limit(1);

  if (!vm) throw { statusCode: 404, message: 'Vehicle model not found' };
  return vm;
}

export async function create(data, adminId) {
  const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, data.vehicleTypeId)).limit(1);
  if (!vt || !vt.isActive) throw { statusCode: 400, message: 'Invalid vehicle type' };

  const slug = toSlug(data.brand, data.name);
  const [vm] = await db.insert(vehicleModels)
    .values({ vehicleTypeId: data.vehicleTypeId, brand: data.brand, name: data.name, sortOrder: data.sortOrder, slug, createdBy: adminId })
    .returning();
  return vm;
}

export async function update(id, data) {
  const updates = { updatedAt: new Date() };
  if (data.vehicleTypeId) {
    const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, data.vehicleTypeId)).limit(1);
    if (!vt || !vt.isActive) throw { statusCode: 400, message: 'Invalid vehicle type' };
    updates.vehicleTypeId = data.vehicleTypeId;
  }
  if (data.brand) updates.brand = data.brand;
  if (data.name) updates.name = data.name;
  if (data.sortOrder != null) updates.sortOrder = data.sortOrder;
  if (updates.brand || updates.name) {
    const [current] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, id)).limit(1);
    if (!current) throw { statusCode: 404, message: 'Vehicle model not found' };
    updates.slug = toSlug(updates.brand ?? current.brand, updates.name ?? current.name);
  }

  const [vm] = await db.update(vehicleModels).set(updates).where(eq(vehicleModels.id, id)).returning();
  if (!vm) throw { statusCode: 404, message: 'Vehicle model not found' };
  return vm;
}

export async function setActive(id, isActive, adminId) {
  const [vm] = await db.update(vehicleModels).set({ isActive, updatedAt: new Date() })
    .where(eq(vehicleModels.id, id)).returning();
  if (!vm) throw { statusCode: 404, message: 'Vehicle model not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'VEHICLE_MODEL_ENABLED' : 'VEHICLE_MODEL_DISABLED',
    entityType: 'vehicle_model', entityId: id,
  });
  return vm;
}
