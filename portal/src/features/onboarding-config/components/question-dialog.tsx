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
  onAdd: (code: string) => void;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Options — {question?.code}</DialogTitle>
          <DialogDescription>
            The choices a driver can pick for this question.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              placeholder="Option code (e.g. yes)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="button"
              disabled={!code.trim() || isAdding}
              onClick={() => {
                onAdd(code.trim());
                setCode("");
              }}
              className="cursor-pointer"
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
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
                  <span className="font-medium text-foreground">{opt.code}</span>
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
