import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, cities, countries } from '../../../drizzle/schema/index.js';
import { countryFromCoordinates } from '../auth/rider-region.service.js';

/**
 * A driver can only go live in the country they registered in: an Indian driver can't go
 * online in a Canadian service area and vice versa.
 *
 * The driver's country is drivers.country_id (falling back to their registered city's
 * country). The location's country is the matched service city's country; when no service
 * cities are configured (fresh dev DB) it's the reverse-geocoded country of the coordinates.
 */
export async function assertDriverInHomeCountry(driverId, { lat, lng, serviceCity = null }) {
  const [row] = await db.select({
    countryId: drivers.countryId,
    cityCountryId: cities.countryId,
  })
    .from(drivers)
    .leftJoin(cities, eq(drivers.cityId, cities.id))
    .where(eq(drivers.id, driverId))
    .limit(1);

  const homeCountryId = row?.countryId || row?.cityCountryId || null;
  if (!homeCountryId) {
    throw {
      statusCode: 409,
      code: 'DRIVER_COUNTRY_MISSING',
      message: 'Your account has no registered country. Please contact support.',
    };
  }

  const [home] = await db.select({ id: countries.id, iso: countries.isoCode, name: countries.name })
    .from(countries).where(eq(countries.id, homeCountryId)).limit(1);
  if (!home) return; // country row deleted — nothing to compare against

  if (serviceCity?.countryId) {
    if (serviceCity.countryId !== home.id) throw outsideHomeCountry(home);
    return;
  }

  const iso = await countryFromCoordinates(Number(lat), Number(lng));
  if (!iso) {
    throw {
      statusCode: 503,
      code: 'LOCATION_UNRESOLVED',
      message: "We couldn't verify your location. Please try again.",
    };
  }
  if (String(iso).toUpperCase() !== String(home.iso).toUpperCase()) throw outsideHomeCountry(home);
}

function outsideHomeCountry(home) {
  return {
    statusCode: 403,
    code: 'DRIVER_OUTSIDE_HOME_COUNTRY',
    message: `Your account is registered in ${home.name}. You can only go online in ${home.name}.`,
  };
}
