import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RichTextEditor } from "@/components/rich-text-editor/RichTextEditor";
import { useCreateNotificationTemplate, useUpdateNotificationTemplate, useNotificationEvents, usePreviewNotificationTemplate } from "../hooks";
import type { NotificationChannel, NotificationTemplate } from "../types";

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "sms", label: "Message (SMS)" },
  { value: "email", label: "Notification (Email)" },
];

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  template: NotificationTemplate | null;
}

export function NotificationTemplateFormDialog({ open, onOpenChange, mode, template }: FormDialogProps) {
  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const { data: eventsData } = useNotificationEvents();
  const events = eventsData?.MESSAGE || {};
  const eventKeys = Object.keys(events);

  const [eventType, setEventType] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("push");
  const [audience, setAudience] = useState<"" | "driver" | "rider">("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && template) {
      setEventType(template.eventType);
      setChannel(template.channel);
      setAudience(template.audience || "");
      setSubject(template.subject || "");
      setBodyHtml(template.bodyHtml);
    } else {
      setEventType(eventKeys[0] || "");
      setChannel("push");
      setAudience("");
      setSubject("");
      setBodyHtml("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, template]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedEvent = events[eventType];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType || !bodyHtml.trim()) return;
    const payload = {
      eventType, channel,
      audience: audience || undefined,
      subject: channel === "email" ? (subject.trim() || undefined) : undefined,
      bodyHtml,
    };
    if (mode === "create") {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else if (template) {
      updateMutation.mutate({ id: template.id, payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const insertVariable = (variable: string) => {
    setBodyHtml((prev) => `${prev}{{${variable}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Template" : "Edit Template"}</DialogTitle>
          <DialogDescription>
            "Notification" (email) supports rich text; "Message" (SMS) and Push are plain text with {"{{variables}}"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nt-event">Event</Label>
              <NativeSelect id="nt-event" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {eventKeys.map((key) => (
                  <NativeSelectOption key={key} value={key}>
                    {events[key].label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt-channel">Channel</Label>
              <NativeSelect id="nt-channel" value={channel} onChange={(e) => setChannel(e.target.value as NotificationChannel)}>
                {CHANNEL_OPTIONS.map((c) => (
                  <NativeSelectOption key={c.value} value={c.value}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt-audience">Audience</Label>
              <NativeSelect id="nt-audience" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                <NativeSelectOption value="">Either</NativeSelectOption>
                <NativeSelectOption value="driver">Driver</NativeSelectOption>
                <NativeSelectOption value="rider">Rider</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          {channel === "email" && (
            <div className="space-y-2">
              <Label htmlFor="nt-subject">Subject</Label>
              <Input id="nt-subject" placeholder="e.g. Your {{planName}} subscription is active" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          {selectedEvent && (
            <div className="space-y-1">
              <Label>Available variables</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedEvent.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 text-xs font-mono rounded-md border border-border bg-accent/40 hover:bg-accent cursor-pointer"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Body</Label>
            {channel === "email" ? (
              <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Email body…" />
            ) : (
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Plain text with {{variables}}…"
                rows={5}
              />
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplate | null;
}

export function PreviewTemplateDialog({ open, onOpenChange, template }: PreviewDialogProps) {
  const previewMutation = usePreviewNotificationTemplate();

  useEffect(() => {
    if (open && template) {
      previewMutation.mutate({ id: template.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  const preview = previewMutation.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>Rendered with sample values for any variable not overridden here.</DialogDescription>
        </DialogHeader>
        {previewMutation.isPending ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Rendering…</p>
        ) : preview ? (
          <div className="space-y-3 py-2 text-sm">
            {preview.subject && (
              <div>
                <span className="text-xs text-muted-foreground block">Subject</span>
                <span className="font-medium text-foreground">{preview.subject}</span>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Body</span>
              {template?.channel === "email" ? (
                <div
                  className="border border-border rounded-md p-3 bg-card"
                  dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                />
              ) : (
                <div className="border border-border rounded-md p-3 bg-card whitespace-pre-wrap">{preview.bodyHtml}</div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No preview available.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
