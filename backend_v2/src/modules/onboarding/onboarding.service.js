import { eq, and, asc, inArray, count, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  onboardingQuestions, onboardingQuestionOptions, driverOnboardingAnswers,
  translations, legalDocuments, driverLegalAcceptances, drivers,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { resolveVisibleQuestionIds } from './condition.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import * as geoService from '../geo/geo.service.js';
import * as documentsService from '../documents/documents.service.js';
import * as vehicleTypeService from '../vehicle-type/vehicle-type.service.js';

// ── Translations (generic helper, reused by other admin-configurable entities) ──

export async function getTranslationsFor(entityType, entityIds, languageCode) {
  if (!entityIds.length) return {};
  const rows = await db.select().from(translations).where(
    and(
      eq(translations.entityType, entityType),
      inArray(translations.entityId, entityIds),
      eq(translations.languageCode, languageCode),
    ),
  );
  const map = {};
  for (const r of rows) {
    map[r.entityId] ??= {};
    map[r.entityId][r.fieldName] = r.value;
  }
  return map;
}

export async function setTranslations(entityType, entityId, items) {
  // items: [{ fieldName, languageCode, value }]
  const results = [];
  for (const { fieldName, languageCode, value } of items) {
    const [existing] = await db.select().from(translations).where(and(
      eq(translations.entityType, entityType), eq(translations.entityId, entityId),
      eq(translations.fieldName, fieldName), eq(translations.languageCode, languageCode),
    )).limit(1);

    if (existing) {
      const [row] = await db.update(translations).set({ value, updatedAt: new Date() })
        .where(eq(translations.id, existing.id)).returning();
      results.push(row);
    } else {
      const [row] = await db.insert(translations).values({ entityType, entityId, fieldName, languageCode, value }).returning();
      results.push(row);
    }
  }
  return results;
}

export async function getDriverCountryId(driverId) {
  const [driver] = await db.select({ countryId: drivers.countryId }).from(drivers).where(eq(drivers.id, driverId)).limit(1);
  return driver?.countryId ?? null;
}

// ── Onboarding questions (admin) ─────────────────────────────────────────────────

export async function listQuestionsPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(onboardingQuestions);
  const rows = await db.select().from(onboardingQuestions).orderBy(asc(onboardingQuestions.sortOrder)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createQuestion(data) {
  const [row] = await db.insert(onboardingQuestions).values(data).returning();
  return row;
}

export async function updateQuestion(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(onboardingQuestions).set(data).where(eq(onboardingQuestions.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Question not found' };
  return row;
}

export async function reorderQuestions(orderedIds) {
  await Promise.all(orderedIds.map((id, index) =>
    db.update(onboardingQuestions).set({ sortOrder: index }).where(eq(onboardingQuestions.id, id))));
  return { reordered: true };
}

export async function listOptions(questionId) {
  return db.select().from(onboardingQuestionOptions)
    .where(eq(onboardingQuestionOptions.questionId, questionId))
    .orderBy(asc(onboardingQuestionOptions.sortOrder));
}

export async function createOption(questionId, data) {
  const [row] = await db.insert(onboardingQuestionOptions).values({ ...data, questionId }).returning();
  return row;
}

export async function updateOption(id, data) {
  const [row] = await db.update(onboardingQuestionOptions).set(data).where(eq(onboardingQuestionOptions.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Option not found' };
  return row;
}

export async function removeOption(id) {
  await db.delete(onboardingQuestionOptions).where(eq(onboardingQuestionOptions.id, id));
  return { deleted: true };
}

// ── Onboarding questions (driver-facing, localized) ──────────────────────────────

export async function getActiveQuestionnaire(countryId, languageCode = 'en') {
  const all = await db.select().from(onboardingQuestions)
    .where(eq(onboardingQuestions.isActive, true)).orderBy(asc(onboardingQuestions.sortOrder));
  const questions = all.filter((q) => !q.countryId || q.countryId === countryId);

  const questionIds = questions.map((q) => q.id);
  const options = questionIds.length
    ? await db.select().from(onboardingQuestionOptions)
        .where(and(inArray(onboardingQuestionOptions.questionId, questionIds), eq(onboardingQuestionOptions.isActive, true)))
        .orderBy(asc(onboardingQuestionOptions.sortOrder))
    : [];

  const qLabels = await getTranslationsFor('onboarding_question', questionIds, languageCode);
  const optIds = options.map((o) => o.id);
  const oLabels = await getTranslationsFor('onboarding_question_option', optIds, languageCode);

  return questions.map((q) => ({
    id: q.id,
    code: q.code,
    type: q.questionType,
    required: q.isRequired,
    sortOrder: q.sortOrder,
    minValue: q.minValue,
    maxValue: q.maxValue,
    label: qLabels[q.id]?.label ?? q.code,
    description: qLabels[q.id]?.description,
    dependsOn: q.dependsOnQuestionId
      ? { questionId: q.dependsOnQuestionId, operator: q.dependsOnOperator, value: q.dependsOnValue }
      : null,
    options: options.filter((o) => o.questionId === q.id).map((o) => ({
      id: o.id, code: o.code, label: oLabels[o.id]?.label ?? o.code,
    })),
  }));
}

// ── Driver answers ────────────────────────────────────────────────────────────

export async function submitAnswers(driverId, countryId, answers) {
  // answers: [{ questionId, value }]
  const activeQuestions = await db.select().from(onboardingQuestions)
    .where(eq(onboardingQuestions.isActive, true));
  const scoped = activeQuestions.filter((q) => !q.countryId || q.countryId === countryId);
  const byId = Object.fromEntries(scoped.map((q) => [q.id, q]));

  const submittedMap = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));
  // Merge with previously stored answers so dependency evaluation sees the full picture.
  const stored = await db.select().from(driverOnboardingAnswers).where(eq(driverOnboardingAnswers.driverId, driverId));
  const mergedMap = { ...Object.fromEntries(stored.map((s) => [s.questionId, s.answerValue])), ...submittedMap };

  const visibleIds = resolveVisibleQuestionIds(scoped, mergedMap);

  for (const { questionId } of answers) {
    if (!byId[questionId]) throw { statusCode: 400, message: `Unknown or inactive question: ${questionId}` };
    if (!visibleIds.has(questionId)) {
      throw { statusCode: 422, code: 'INCOMPLETE_REQUIRED_FIELDS', message: `Question ${questionId} is not currently visible based on prior answers` };
    }
  }

  const results = [];
  for (const { questionId, value } of answers) {
    const [existing] = await db.select().from(driverOnboardingAnswers)
      .where(and(eq(driverOnboardingAnswers.driverId, driverId), eq(driverOnboardingAnswers.questionId, questionId))).limit(1);
    if (existing) {
      const [row] = await db.update(driverOnboardingAnswers).set({ answerValue: value, answeredAt: new Date() })
        .where(eq(driverOnboardingAnswers.id, existing.id)).returning();
      results.push(row);
    } else {
      const [row] = await db.insert(driverOnboardingAnswers).values({ driverId, questionId, answerValue: value }).returning();
      results.push(row);
    }
  }
  await advanceRegistration(driverId, REGISTRATION_STEP.QUESTIONNAIRE);
  return results;
}

export async function getMyAnswers(driverId) {
  return db.select().from(driverOnboardingAnswers).where(eq(driverOnboardingAnswers.driverId, driverId));
}

/** Used by the registration-completeness check (submit-application) — required+visible questions must all be answered. */
export async function getMissingRequiredAnswers(driverId, countryId) {
  const activeQuestions = await db.select().from(onboardingQuestions).where(eq(onboardingQuestions.isActive, true));
  const scoped = activeQuestions.filter((q) => !q.countryId || q.countryId === countryId);
  const stored = await db.select().from(driverOnboardingAnswers).where(eq(driverOnboardingAnswers.driverId, driverId));
  const answeredMap = Object.fromEntries(stored.map((s) => [s.questionId, s.answerValue]));

  const visibleIds = resolveVisibleQuestionIds(scoped, answeredMap);
  return scoped
    .filter((q) => q.isRequired && visibleIds.has(q.id) && answeredMap[q.id] === undefined)
    .map((q) => q.code);
}

// ── Legal documents ───────────────────────────────────────────────────────────

export async function listLegalDocumentsPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(legalDocuments);
  const rows = await db.select().from(legalDocuments).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function publishLegalDocument(data) {
  // Publishing a new active version supersedes the prior active one for the same type+country scope.
  if (data.isActive !== false) {
    await db.update(legalDocuments).set({ isActive: false }).where(and(
      eq(legalDocuments.type, data.type),
      data.countryId ? eq(legalDocuments.countryId, data.countryId) : isNull(legalDocuments.countryId),
    ));
  }
  const [row] = await db.insert(legalDocuments).values(data).returning();
  return row;
}

export async function getActiveLegalDocument(type, countryId) {
  const rows = await db.select().from(legalDocuments)
    .where(and(eq(legalDocuments.type, type), eq(legalDocuments.isActive, true)));
  return rows.find((r) => r.countryId === countryId) ?? rows.find((r) => !r.countryId) ?? null;
}

export async function acceptLegalDocument(driverId, legalDocumentId, ip, userAgent) {
  const [doc] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, legalDocumentId)).limit(1);
  if (!doc) throw { statusCode: 404, message: 'Legal document not found' };

  const [existing] = await db.select().from(driverLegalAcceptances)
    .where(and(eq(driverLegalAcceptances.driverId, driverId), eq(driverLegalAcceptances.legalDocumentId, legalDocumentId))).limit(1);
  if (existing) return existing;

  const [row] = await db.insert(driverLegalAcceptances).values({ driverId, legalDocumentId, ip, userAgent }).returning();
  await advanceRegistration(driverId, REGISTRATION_STEP.LEGAL);
  return row;
}

// ── One-shot onboarding bundle (drives the "no app update needed" dynamic forms) ─

export async function getOnboardingConfig(driver, languageCode = driver.preferredLanguageCode || 'en') {
  const [countries, questionnaire, documentRequirements, vehicleTypesList, terms, privacyPolicy] = await Promise.all([
    geoService.listCountries(true),
    getActiveQuestionnaire(driver.countryId, languageCode),
    documentsService.getRequiredDocumentTypesFor(driver.countryId, driver.cityId, driver.vehicleTypeId),
    vehicleTypeService.listAll(true),
    getActiveLegalDocument('terms', driver.countryId),
    getActiveLegalDocument('privacy_policy', driver.countryId),
  ]);

  return {
    countries, questionnaire, documentRequirements, vehicleTypes: vehicleTypesList,
    legalDocuments: { terms, privacyPolicy },
  };
}

export async function getOnboardingState(driver) {
  return {
    registrationStatus: driver.registrationStatus,
    registrationStep: driver.registrationStep,
    pendingLegalAcceptance: await hasPendingLegalAcceptance(driver.id, driver.countryId),
  };
}

export async function hasPendingLegalAcceptance(driverId, countryId) {
  for (const type of ['terms', 'privacy_policy']) {
    const active = await getActiveLegalDocument(type, countryId);
    if (!active) continue;
    const [accepted] = await db.select().from(driverLegalAcceptances)
      .where(and(eq(driverLegalAcceptances.driverId, driverId), eq(driverLegalAcceptances.legalDocumentId, active.id))).limit(1);
    if (!accepted) return true;
  }
  return false;
}
