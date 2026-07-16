import { apiClient } from "@/lib/api-client";
import type {
  DocumentType,
  DocumentTypeListParams,
  DocumentTypePayload,
  DocumentTypeRequirement,
  DocumentTypeRequirementPayload,
  OnboardingQuestion,
  QuestionListParams,
  QuestionPayload,
  OnboardingQuestionOption,
  OptionPayload,
  LegalDocument,
  LegalDocumentListParams,
  LegalDocumentPayload,
  LookupOption,
} from "./types";

const DOCUMENTS_BASE = "/documents";
const ONBOARDING_BASE = "/onboarding";

function buildQuery(params: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  return query.toString();
}

export const documentTypesApi = {
  // GET /documents/admin/types?page=&limit=  (Admin)
  list: (params: DocumentTypeListParams = {}) =>
    apiClient.get<DocumentType[]>(`${DOCUMENTS_BASE}/admin/types?${buildQuery(params)}`),

  // POST /documents/admin/types  (Admin)
  create: (payload: DocumentTypePayload) =>
    apiClient.post<DocumentType>(`${DOCUMENTS_BASE}/admin/types`, payload),

  // PATCH /documents/admin/types/:id  (Admin) — also used to toggle isActive
  update: (id: string, payload: Partial<DocumentTypePayload>) =>
    apiClient.patch<DocumentType>(`${DOCUMENTS_BASE}/admin/types/${id}`, payload),

  // GET /documents/admin/types/:id/requirements  (Admin)
  listRequirements: (documentTypeId: string) =>
    apiClient.get<DocumentTypeRequirement[]>(
      `${DOCUMENTS_BASE}/admin/types/${documentTypeId}/requirements`,
    ),

  // POST /documents/admin/types/:id/requirements  (Admin)
  createRequirement: (documentTypeId: string, payload: DocumentTypeRequirementPayload) =>
    apiClient.post<DocumentTypeRequirement>(
      `${DOCUMENTS_BASE}/admin/types/${documentTypeId}/requirements`,
      payload,
    ),

  // DELETE /documents/admin/requirements/:id  (Admin) — removes a scoping rule, not master data
  removeRequirement: (requirementId: string) =>
    apiClient.delete(`${DOCUMENTS_BASE}/admin/requirements/${requirementId}`),
};

export const questionsApi = {
  // GET /onboarding/admin/questions?page=&limit=  (Admin)
  list: (params: QuestionListParams = {}) =>
    apiClient.get<OnboardingQuestion[]>(`${ONBOARDING_BASE}/admin/questions?${buildQuery(params)}`),

  // POST /onboarding/admin/questions  (Admin)
  create: (payload: QuestionPayload) =>
    apiClient.post<OnboardingQuestion>(`${ONBOARDING_BASE}/admin/questions`, payload),

  // PATCH /onboarding/admin/questions/:id  (Admin) — also used to toggle isActive
  update: (id: string, payload: Partial<QuestionPayload>) =>
    apiClient.patch<OnboardingQuestion>(`${ONBOARDING_BASE}/admin/questions/${id}`, payload),

  // GET /onboarding/admin/questions/:id/options  (Admin)
  listOptions: (questionId: string) =>
    apiClient.get<OnboardingQuestionOption[]>(`${ONBOARDING_BASE}/admin/questions/${questionId}/options`),

  // POST /onboarding/admin/questions/:id/options  (Admin)
  createOption: (questionId: string, payload: OptionPayload) =>
    apiClient.post<OnboardingQuestionOption>(
      `${ONBOARDING_BASE}/admin/questions/${questionId}/options`,
      payload,
    ),

  // PATCH /onboarding/admin/options/:id  (Admin)
  updateOption: (optionId: string, payload: Partial<OptionPayload>) =>
    apiClient.patch<OnboardingQuestionOption>(`${ONBOARDING_BASE}/admin/options/${optionId}`, payload),

  // DELETE /onboarding/admin/options/:id  (Admin)
  removeOption: (optionId: string) =>
    apiClient.delete(`${ONBOARDING_BASE}/admin/options/${optionId}`),
};

export const legalDocumentsApi = {
  // GET /onboarding/admin/legal?page=&limit=  (Admin)
  list: (params: LegalDocumentListParams = {}) =>
    apiClient.get<LegalDocument[]>(`${ONBOARDING_BASE}/admin/legal?${buildQuery(params)}`),

  // POST /onboarding/admin/legal  (Admin) — publishes a new version, no update/delete route exists
  create: (payload: LegalDocumentPayload) =>
    apiClient.post<LegalDocument>(`${ONBOARDING_BASE}/admin/legal`, payload),
};

// ── Dropdown lookups (Country / Vehicle Type / other questions) ─────────────

export const lookupsApi = {
  listCountries: () => apiClient.get<LookupOption[]>("/geo/countries"),
  listVehicleTypes: () => apiClient.get<LookupOption[]>("/vehicle-types"),
};
