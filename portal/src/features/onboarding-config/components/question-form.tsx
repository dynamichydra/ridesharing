import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPENDS_ON_OPERATOR_OPTIONS, QUESTION_TYPE_OPTIONS, type QuestionFormValues } from "../schema";
import type { LookupOption, OnboardingQuestion } from "../types";

interface Props {
  mode: "create" | "edit";
  values: QuestionFormValues;
  setValues: (values: QuestionFormValues) => void;
  errors: Partial<Record<keyof QuestionFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  countries: LookupOption[];
  otherQuestions: OnboardingQuestion[];
}

export default function QuestionForm({
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  onCancel,
  isPending,
  countries,
  otherQuestions,
}: Props) {
  const update = <K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]) =>
    setValues({ ...values, [key]: value });

  const showMinMax = values.questionType === "number" || values.questionType === "rating";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={values.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="own_vehicle"
            disabled={mode === "edit"}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Question Type</Label>
          <Select value={values.questionType} onValueChange={(v) => update("questionType", v as any)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Country Scope</Label>
          <Select
            value={values.countryId || "__global__"}
            onValueChange={(v) => update("countryId", v === "__global__" ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__global__">Global (all countries)</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => update("sortOrder", Number(e.target.value) as any)}
          />
        </div>
      </div>

      {showMinMax && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="minValue">Min Value</Label>
            <Input
              id="minValue"
              type="number"
              value={values.minValue}
              onChange={(e) => update("minValue", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxValue">Max Value</Label>
            <Input
              id="maxValue"
              type="number"
              value={values.maxValue}
              onChange={(e) => update("maxValue", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="isRequired"
          type="checkbox"
          checked={values.isRequired}
          onChange={(e) => update("isRequired", e.target.checked)}
          className="h-4 w-4 rounded border-border cursor-pointer"
        />
        <Label htmlFor="isRequired" className="cursor-pointer font-normal">
          Required — driver must answer to proceed
        </Label>
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        <Label className="text-xs text-muted-foreground">
          Conditional visibility (optional) — only show this question if another answer matches
        </Label>
        <div className="grid grid-cols-3 gap-3">
          <Select
            value={values.dependsOnQuestionId || "__none__"}
            onValueChange={(v) => update("dependsOnQuestionId", v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Depends on..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {otherQuestions.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={values.dependsOnOperator || "__none__"}
            onValueChange={(v) => update("dependsOnOperator", (v === "__none__" ? "" : v) as any)}
            disabled={!values.dependsOnQuestionId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {DEPENDS_ON_OPERATOR_OPTIONS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Value (e.g. yes)"
            value={values.dependsOnValue}
            onChange={(e) => update("dependsOnValue", e.target.value)}
            disabled={!values.dependsOnQuestionId}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {mode === "create" ? "Create Question" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
