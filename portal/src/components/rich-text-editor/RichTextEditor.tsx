import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  Heading,
  Autoformat,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import "./rich-text-editor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Self-hosted CKEditor 5 (open-source "GPL" license key — free, no external account, see
// https://ckeditor.com/docs/ckeditor5/latest/getting-started/licensing/license-key-and-activation.html).
// Used for email ("Notification") template bodies, which need real rich-text/HTML — push and
// SMS ("Message") template bodies stay plain textareas, see notification-templates/components/dialog.tsx.
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  return (
    <div className="rich-text-editor">
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{
          licenseKey: "GPL",
          plugins: [Essentials, Paragraph, Bold, Italic, Underline, Link, List, Heading, Autoformat],
          toolbar: ["heading", "|", "bold", "italic", "underline", "link", "bulletedList", "numberedList", "|", "undo", "redo"],
          placeholder,
        }}
        onChange={(_event, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
