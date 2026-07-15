import { z } from "zod";

export const approveDriverSchema = z.object({
  note: z.string().optional(),
});

export const rejectDriverSchema = z.object({
  note: z.string().min(1, "Rejection note is required"),
});


export const requestDocumentsSchema = z.object({
  documentTypeCodes: z.string().min(1, { message: "Enter at least one document type code" }),
  note: z.string().optional(),
});

export type ApproveDriverFormValues = z.infer<typeof approveDriverSchema>;
export type RejectDriverFormValues = z.infer<typeof rejectDriverSchema>;
export type RequestDocumentsFormValues = z.infer<typeof requestDocumentsSchema>;
