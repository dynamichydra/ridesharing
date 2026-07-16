import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getQuestionColumns } from "../components/question-column";
import { QuestionFormDialog, OptionsDialog } from "../components/question-dialog";
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useQuestionOptions,
  useCreateOption,
  useRemoveOption,
  useCountryOptions,
} from "../hooks";
import { questionSchema, emptyQuestionFormValues, type QuestionFormValues } from "../schema";
import type { OnboardingQuestion, Pagination } from "../types";

export default function QuestionsTab() {
  const controller = useFilterController();
  const page = Number(controller.applied.page) || 1;
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState<OnboardingQuestion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValues, setFormValues] = useState<QuestionFormValues>(emptyQuestionFormValues);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof QuestionFormValues, string>>>({});

  const [optionsTarget, setOptionsTarget] = useState<OnboardingQuestion | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuestions({ page, limit: pageSize });
  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const { data: optionsData, isLoading: optionsLoading } = useQuestionOptions(optionsTarget?.id);
  const options = optionsData?.MESSAGE || [];

  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const createOptionMutation = useCreateOption();
  const removeOptionMutation = useRemoveOption();

  const questions = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? questions.length;

  const handleOpenCreate = () => {
    setFormMode("create");
    setSelected(null);
    setFormValues(emptyQuestionFormValues);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: OnboardingQuestion) => {
    setFormMode("edit");
    setSelected(q);
    setFormValues({
      code: q.code,
      questionType: q.questionType,
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
      countryId: q.countryId || "",
      minValue: q.minValue?.toString() ?? "",
      maxValue: q.maxValue?.toString() ?? "",
      dependsOnQuestionId: q.dependsOnQuestionId || "",
      dependsOnOperator: q.dependsOnOperator || "",
      dependsOnValue: typeof q.dependsOnValue === "string" ? q.dependsOnValue : q.dependsOnValue ? JSON.stringify(q.dependsOnValue) : "",
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleToggleActive = (q: OnboardingQuestion) => {
    updateMutation.mutate({ id: q.id, payload: { isActive: !q.isActive } });
  };

  const handleOpenOptions = (q: OnboardingQuestion) => {
    setOptionsTarget(q);
    setIsOptionsOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = questionSchema.safeParse(formValues);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof QuestionFormValues, string>> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as keyof QuestionFormValues] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }
    setFormErrors({});
    const v = result.data;
    const payload = {
      code: v.code,
      questionType: v.questionType,
      isRequired: v.isRequired,
      sortOrder: v.sortOrder,
      countryId: v.countryId || null,
      minValue: v.minValue ? Number(v.minValue) : null,
      maxValue: v.maxValue ? Number(v.maxValue) : null,
      dependsOnQuestionId: v.dependsOnQuestionId || null,
      dependsOnOperator: v.dependsOnOperator || null,
      dependsOnValue: v.dependsOnValue || null,
    };

    if (formMode === "create") {
      createMutation.mutate(payload, { onSuccess: () => setIsFormOpen(false) });
    } else if (selected) {
      const { code, ...editable } = payload;
      updateMutation.mutate(
        { id: selected.id, payload: editable },
        { onSuccess: () => setIsFormOpen(false) },
      );
    }
  };

  const handleAddOption = (code: string) => {
    if (!optionsTarget) return;
    createOptionMutation.mutate({ questionId: optionsTarget.id, payload: { code } });
  };

  const handleRemoveOption = (optionId: string) => {
    if (!optionsTarget) return;
    removeOptionMutation.mutate({ optionId, questionId: optionsTarget.id });
  };

  const columns = useMemo(
    () =>
      getQuestionColumns({
        countries,
        onEdit: handleOpenEdit,
        onManageOptions: handleOpenOptions,
        onToggleActive: handleToggleActive,
      }),
    [countries],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Onboarding Questionnaire</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} questions. Drivers answer these during registration; conditional
            questions only appear when their dependency matches.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={questions}
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

      <QuestionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
        errors={formErrors}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        countries={countries}
        otherQuestions={questions.filter((q) => q.id !== selected?.id)}
      />

      <OptionsDialog
        open={isOptionsOpen}
        onOpenChange={setIsOptionsOpen}
        question={optionsTarget}
        options={options}
        isLoading={optionsLoading}
        onAdd={handleAddOption}
        onRemove={handleRemoveOption}
        isAdding={createOptionMutation.isPending}
      />
    </div>
  );
}
