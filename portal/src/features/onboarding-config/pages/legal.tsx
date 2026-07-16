import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getLegalDocumentColumns } from "../components/legal-column";
import { LegalDocumentFormDialog } from "../components/legal-dialog";
import { useLegalDocuments, useCreateLegalDocument, useCountryOptions } from "../hooks";
import {
  legalDocumentSchema,
  emptyLegalDocumentFormValues,
  type LegalDocumentFormValues,
} from "../schema";
import type { Pagination } from "../types";

export default function LegalTab() {
  const controller = useFilterController();
  const page = Number(controller.applied.page) || 1;
  const [pageSize, setPageSize] = useState(10);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<LegalDocumentFormValues>(emptyLegalDocumentFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LegalDocumentFormValues, string>>>({});

  const { data, isLoading, isFetching } = useLegalDocuments({ page, limit: pageSize });
  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const createMutation = useCreateLegalDocument();

  const documents = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? documents.length;

  const handleOpenCreate = () => {
    setFormValues(emptyLegalDocumentFormValues);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = legalDocumentSchema.safeParse(formValues);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LegalDocumentFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as keyof LegalDocumentFormValues] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }
    setFormErrors({});
    createMutation.mutate(
      {
        ...result.data,
        countryId: result.data.countryId || null,
        effectiveFrom: new Date(result.data.effectiveFrom).toISOString(),
      },
      { onSuccess: () => setIsFormOpen(false) },
    );
  };

  const columns = useMemo(() => getLegalDocumentColumns({ countries }), [countries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Legal Documents</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} published versions. Drivers must accept the active version before
            completing registration.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Publish New Version
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={documents}
        pageIndex={page - 1}
        pageSize={pageSize}
        pageCount={totalPages}
        onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
        onPageSizeChange={(size) => {
          setPageSize(size);
          controller.apply({ page: 1 });
        }}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <LegalDocumentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        values={formValues}
        setValues={setFormValues}
        errors={formErrors}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        countries={countries}
      />
    </div>
  );
}
