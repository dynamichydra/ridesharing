import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDocumentTypeColumns } from "../components/document-type-column";
import { DocumentTypeFormDialog, RequirementsDialog } from "../components/document-type-dialog";
import {
  useDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDocumentTypeRequirements,
  useCreateRequirement,
  useRemoveRequirement,
  useCountryOptions,
  useVehicleTypeOptions,
} from "../hooks";
import { documentTypeSchema, emptyDocumentTypeFormValues, type DocumentTypeFormValues } from "../schema";
import type { DocumentType, Pagination } from "../types";

export default function DocumentTypesTab() {
  const controller = useFilterController();
  const page = Number(controller.applied.page) || 1;
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState<DocumentType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<DocumentTypeFormValues>(emptyDocumentTypeFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DocumentTypeFormValues, string>>>({});

  const [requirementsTarget, setRequirementsTarget] = useState<DocumentType | null>(null);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);

  const { data, isLoading, isFetching } = useDocumentTypes({ page, limit: pageSize });
  const { data: countriesData } = useCountryOptions();
  const { data: vehicleTypesData } = useVehicleTypeOptions();
  const countries = countriesData?.MESSAGE || [];
  const vehicleTypes = vehicleTypesData?.MESSAGE || [];

  const { data: requirementsData, isLoading: requirementsLoading } = useDocumentTypeRequirements(
    requirementsTarget?.id,
  );
  const requirements = requirementsData?.MESSAGE || [];

  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const createRequirementMutation = useCreateRequirement();
  const removeRequirementMutation = useRemoveRequirement();

  const documentTypes = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? documentTypes.length;

  const handleOpenCreate = () => {
    setFormMode("create");
    setSelected(null);
    setFormValues(emptyDocumentTypeFormValues);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dt: DocumentType) => {
    setFormMode("edit");
    setSelected(dt);
    setFormValues({
      code: dt.code,
      requiresFront: dt.requiresFront,
      requiresBack: dt.requiresBack,
      requiresPdf: dt.requiresPdf,
      requiresExpiry: dt.requiresExpiry,
      requiresDocNumber: dt.requiresDocNumber,
      maxFileSizeMb: dt.maxFileSizeMb,
      sortOrder: dt.sortOrder,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleToggleActive = (dt: DocumentType) => {
    updateMutation.mutate({ id: dt.id, payload: { isActive: !dt.isActive } });
  };

  const handleOpenRequirements = (dt: DocumentType) => {
    setRequirementsTarget(dt);
    setIsRequirementsOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = documentTypeSchema.safeParse(formValues);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof DocumentTypeFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as keyof DocumentTypeFormValues] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }
    setFormErrors({});
    if (formMode === "create") {
      createMutation.mutate(result.data, { onSuccess: () => setIsFormOpen(false) });
    } else if (selected) {
      const { code, ...editable } = result.data;
      updateMutation.mutate(
        { id: selected.id, payload: editable },
        { onSuccess: () => setIsFormOpen(false) },
      );
    }
  };

  const handleAddRequirement = (countryId: string, vehicleTypeId: string, isRequired: boolean) => {
    if (!requirementsTarget) return;
    createRequirementMutation.mutate({
      documentTypeId: requirementsTarget.id,
      payload: {
        countryId: countryId === "__all__" ? null : countryId,
        vehicleTypeId: vehicleTypeId === "__all__" ? null : vehicleTypeId,
        isRequired,
      },
    });
  };

  const handleRemoveRequirement = (requirementId: string) => {
    if (!requirementsTarget) return;
    removeRequirementMutation.mutate({ requirementId, documentTypeId: requirementsTarget.id });
  };

  const columns = useMemo(
    () =>
      getDocumentTypeColumns({
        onEdit: handleOpenEdit,
        onManageRequirements: handleOpenRequirements,
        onToggleActive: handleToggleActive,
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Document Types</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} document types. Configure what drivers must upload during registration.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Document Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={documentTypes}
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

      <DocumentTypeFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
        errors={formErrors}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <RequirementsDialog
        open={isRequirementsOpen}
        onOpenChange={setIsRequirementsOpen}
        documentType={requirementsTarget}
        requirements={requirements}
        countries={countries}
        vehicleTypes={vehicleTypes}
        isLoading={requirementsLoading}
        onAdd={handleAddRequirement}
        onRemove={handleRemoveRequirement}
        isAdding={createRequirementMutation.isPending}
      />
    </div>
  );
}
