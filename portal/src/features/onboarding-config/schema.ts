import { z } from "zod";

export const documentTypeSchema = z.object({
  code: z.string().min(2, "Code is required"),
  requiresFront: z.boolean(),
  requiresBack: z.boolean(),
  requiresPdf: z.boolean(),
  requiresExpiry: z.boolean(),
  requiresDocNumber: z.boolean(),
  maxFileSizeMb: z.coerce.number().int().min(1, "Must be at least 1MB"),
  sortOrder: z.coerce.number().int().min(0),
});
export type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>;
export const emptyDocumentTypeFormValues: DocumentTypeFormValues = {
  code: "",
  requiresFront: true,
  requiresBack: false,
  requiresPdf: false,
  requiresExpiry: true,
  requiresDocNumber: true,
  maxFileSizeMb: 10,
  sortOrder: 0,
};

export const QUESTION_TYPE_OPTIONS = [
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
  "text",
  "number",
  "date",
] as const;

export const DEPENDS_ON_OPERATOR_OPTIONS = ["equals", "not_equals", "in", "gt", "lt"] as const;

export const questionSchema = z.object({
  code: z.string().min(2, "Code is required"),
  questionType: z.enum(QUESTION_TYPE_OPTIONS),
  isRequired: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
  countryId: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  dependsOnQuestionId: z.string().optional(),
  dependsOnOperator: z.enum(DEPENDS_ON_OPERATOR_OPTIONS).optional().or(z.literal("")),
  dependsOnValue: z.string().optional(),
});
export type QuestionFormValues = z.infer<typeof questionSchema>;
export const emptyQuestionFormValues: QuestionFormValues = {
  code: "",
  questionType: "text",
  isRequired: false,
  sortOrder: 0,
  countryId: "",
  minValue: "",
  maxValue: "",
  dependsOnQuestionId: "",
  dependsOnOperator: "",
  dependsOnValue: "",
};

export const optionSchema = z.object({
  code: z.string().min(1, "Code is required"),
  sortOrder: z.coerce.number().int().min(0),
});
export type OptionFormValues = z.infer<typeof optionSchema>;
export const emptyOptionFormValues: OptionFormValues = { code: "", sortOrder: 0 };

export const LEGAL_TYPE_OPTIONS = ["terms", "privacy_policy"] as const;

export const legalDocumentSchema = z.object({
  type: z.enum(LEGAL_TYPE_OPTIONS),
  version: z.string().min(1, "Version is required"),
  countryId: z.string().optional(),
  contentUrl: z.string().url("Must be a valid URL"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});
export type LegalDocumentFormValues = z.infer<typeof legalDocumentSchema>;
export const emptyLegalDocumentFormValues: LegalDocumentFormValues = {
  type: "terms",
  version: "",
  countryId: "",
  contentUrl: "",
  effectiveFrom: "",
};
