import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { documentTypesApi, questionsApi, legalDocumentsApi, lookupsApi } from "./api";
import type {
  DocumentTypeListParams,
  DocumentTypePayload,
  DocumentTypeRequirementPayload,
  QuestionListParams,
  QuestionPayload,
  OptionPayload,
  LegalDocumentListParams,
  LegalDocumentPayload,
} from "./types";

const DOCUMENT_TYPES_KEY = "onboarding-config-document-types";
const REQUIREMENTS_KEY = "onboarding-config-requirements";
const QUESTIONS_KEY = "onboarding-config-questions";
const LEGAL_KEY = "onboarding-config-legal";
const LOOKUPS_KEY = "onboarding-config-lookups";

// ── Document types ──────────────────────────────────────────────────────────

export function useDocumentTypes(params: DocumentTypeListParams = {}) {
  return useQuery({
    queryKey: [DOCUMENT_TYPES_KEY, params],
    queryFn: () => documentTypesApi.list(params),
  });
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentTypePayload) => documentTypesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_TYPES_KEY], refetchType: "active" });
      toast.success("Document type created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create document type"),
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DocumentTypePayload> }) =>
      documentTypesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_TYPES_KEY], refetchType: "active" });
      toast.success("Document type updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update document type"),
  });
}

export function useDocumentTypeRequirements(documentTypeId: string | undefined) {
  return useQuery({
    queryKey: [REQUIREMENTS_KEY, documentTypeId],
    queryFn: () => documentTypesApi.listRequirements(documentTypeId as string),
    enabled: !!documentTypeId,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentTypeId,
      payload,
    }: {
      documentTypeId: string;
      payload: DocumentTypeRequirementPayload;
    }) => documentTypesApi.createRequirement(documentTypeId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [REQUIREMENTS_KEY, variables.documentTypeId] });
      toast.success("Requirement added!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add requirement"),
  });
}

export function useRemoveRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requirementId }: { requirementId: string; documentTypeId: string }) =>
      documentTypesApi.removeRequirement(requirementId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [REQUIREMENTS_KEY, variables.documentTypeId] });
      toast.success("Requirement removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove requirement"),
  });
}

// ── Questions ─────────────────────────────────────────────────────────────

export function useQuestions(params: QuestionListParams = {}) {
  return useQuery({
    queryKey: [QUESTIONS_KEY, params],
    queryFn: () => questionsApi.list(params),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionPayload) => questionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY], refetchType: "active" });
      toast.success("Question created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create question"),
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<QuestionPayload> }) =>
      questionsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY], refetchType: "active" });
      toast.success("Question updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update question"),
  });
}

export function useQuestionOptions(questionId: string | undefined) {
  return useQuery({
    queryKey: [QUESTIONS_KEY, questionId, "options"],
    queryFn: () => questionsApi.listOptions(questionId as string),
    enabled: !!questionId,
  });
}

export function useCreateOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; payload: OptionPayload }) =>
      questionsApi.createOption(questionId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY, variables.questionId, "options"] });
      toast.success("Option added!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add option"),
  });
}

export function useRemoveOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }: { optionId: string; questionId: string }) =>
      questionsApi.removeOption(optionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY, variables.questionId, "options"] });
      toast.success("Option removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove option"),
  });
}

// ── Legal documents ──────────────────────────────────────────────────────────

export function useLegalDocuments(params: LegalDocumentListParams = {}) {
  return useQuery({
    queryKey: [LEGAL_KEY, params],
    queryFn: () => legalDocumentsApi.list(params),
  });
}

export function useCreateLegalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LegalDocumentPayload) => legalDocumentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEGAL_KEY], refetchType: "active" });
      toast.success("Legal document published!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish legal document"),
  });
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export function useCountryOptions() {
  return useQuery({
    queryKey: [LOOKUPS_KEY, "countries"],
    queryFn: () => lookupsApi.listCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVehicleTypeOptions() {
  return useQuery({
    queryKey: [LOOKUPS_KEY, "vehicle-types"],
    queryFn: () => lookupsApi.listVehicleTypes(),
    staleTime: 5 * 60 * 1000,
  });
}
