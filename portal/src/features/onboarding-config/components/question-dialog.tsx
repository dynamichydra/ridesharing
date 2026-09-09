import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import QuestionForm from "./question-form";
import type { QuestionFormValues } from "../schema";
import type { LookupOption, OnboardingQuestion, OnboardingQuestionOption } from "../types";

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: QuestionFormValues;
  setValues: (values: QuestionFormValues) => void;
  errors: Partial<Record<keyof QuestionFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  countries: LookupOption[];
  otherQuestions: OnboardingQuestion[];
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  isPending,
  countries,
  otherQuestions,
}: QuestionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Question" : "Edit Question"}</DialogTitle>
        </DialogHeader>
        <QuestionForm
          mode={mode}
          values={values}
          setValues={setValues}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
          countries={countries}
          otherQuestions={otherQuestions}
        />
      </DialogContent>
    </Dialog>
  );
}

interface OptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: OnboardingQuestion | null;
  options: OnboardingQuestionOption[];
  isLoading: boolean;
  onAdd: (data: { code: string; label?: string; description?: string }) => void;
  onRemove: (optionId: string) => void;
  isAdding: boolean;
}

export function OptionsDialog({
  open,
  onOpenChange,
  question,
  options,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
}: OptionsDialogProps) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!code.trim()) return;
    onAdd({
      code: code.trim(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
    setCode("");
    setLabel("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Options — {question?.label || question?.code}</DialogTitle>
          <DialogDescription>
            The choices a driver can pick for this question.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2 border border-border p-3 rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Display Label (e.g. Yes / Electric)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                placeholder="Code Key (e.g. yes / ev)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button
                type="button"
                disabled={!code.trim() || isAdding}
                onClick={handleAdd}
                className="cursor-pointer whitespace-nowrap"
              >
                Add Option
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-xs text-muted-foreground">Loading options...</div>
            ) : options.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No options yet.</div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{opt.label || opt.code}</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1 rounded">{opt.code}</span>
                      {opt.description && <span>• {opt.description}</span>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(opt.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
