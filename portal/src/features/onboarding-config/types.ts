export interface LookupOption {
  id: string;
  name: string;
}

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// ── Document types ──────────────────────────────────────────────────────────

export interface DocumentType {
  id: string;
  code: string;
  requiresFront: boolean;
  requiresBack: boolean;
  requiresPdf: boolean;
  requiresExpiry: boolean;
  requiresDocNumber: boolean;
  maxFileSizeMb: number;
  isActive: boolean;
  sortOrder: number;
}

export interface DocumentTypeListParams {
  page?: number;
  limit?: number;
}

export interface DocumentTypePayload {
  code: string;
  requiresFront?: boolean;
  requiresBack?: boolean;
  requiresPdf?: boolean;
  requiresExpiry?: boolean;
  requiresDocNumber?: boolean;
  maxFileSizeMb?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface DocumentTypeRequirement {
  id: string;
  documentTypeId: string;
  countryId: string | null;
  cityId: string | null;
  vehicleTypeId: string | null;
  isRequired: boolean;
}

export interface DocumentTypeRequirementPayload {
  countryId?: string | null;
  vehicleTypeId?: string | null;
  isRequired?: boolean;
}

// ── Onboarding questions ─────────────────────────────────────────────────────

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "yes_no"
  | "rating"
  | "text"
  | "number"
  | "date";

export type DependsOnOperator = "equals" | "not_equals" | "in" | "gt" | "lt";

export interface OnboardingQuestion {
  id: string;
  code: string;
  questionType: QuestionType;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  countryId: string | null;
  minValue: number | null;
  maxValue: number | null;
  dependsOnQuestionId: string | null;
  dependsOnOperator: DependsOnOperator | null;
  dependsOnValue: unknown;
}

export interface QuestionListParams {
  page?: number;
  limit?: number;
}

export interface QuestionPayload {
  code: string;
  questionType: QuestionType;
  isRequired?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  countryId?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  dependsOnQuestionId?: string | null;
  dependsOnOperator?: DependsOnOperator | null;
  dependsOnValue?: unknown;
}

export interface OnboardingQuestionOption {
  id: string;
  questionId: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export interface OptionPayload {
  code: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ── Legal documents ──────────────────────────────────────────────────────────

export type LegalDocumentType = "terms" | "privacy_policy";

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  countryId: string | null;
  contentUrl: string;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
}

export interface LegalDocumentListParams {
  page?: number;
  limit?: number;
}

export interface LegalDocumentPayload {
  type: LegalDocumentType;
  version: string;
  countryId?: string | null;
  contentUrl: string;
  effectiveFrom: string;
}
