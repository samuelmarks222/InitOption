import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Undo2,
} from "lucide-react";

const TOOLBAR_BUTTON_CLASS =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1e2330] bg-[#1c1f2d] text-slate-300 transition-colors hover:border-[#D5006C]/40 hover:text-white";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

const readEditorHtml = (editor: HTMLDivElement | null) => editor?.innerHTML ?? "";

export const RichTextEditor = ({ value, onChange, onUploadImage }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML === value) return;
    editorRef.current.innerHTML = value;
  }, [value]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, argument?: string) => {
    focusEditor();
    document.execCommand(command, false, argument);
    onChange(readEditorHtml(editorRef.current));
  };

  const insertLink = () => {
    const href = window.prompt("Enter the link URL");
    if (!href) return;
    runCommand("createLink", href.trim());
  };

  const insertImageAtCursor = (imageUrl: string) => {
    const cleanedUrl = imageUrl.trim();
    if (!cleanedUrl) return;
    focusEditor();
    document.execCommand("insertHTML", false, `<img src="${cleanedUrl}" alt="" />`);
    onChange(readEditorHtml(editorRef.current));
  };

  const insertImageByUrl = () => {
    const href = window.prompt("Paste the image URL");
    if (!href) return;
    insertImageAtCursor(href);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !onUploadImage) return;

    const imageUrl = await onUploadImage(file);
    if (imageUrl) {
      insertImageAtCursor(imageUrl);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-3xl border border-[#1e2330] bg-[#1e2330] p-4">
      <div className="flex flex-wrap gap-2 border-b border-[#1e2330] pb-4">
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("formatBlock", "h2")} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("formatBlock", "h3")} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("formatBlock", "blockquote")} title="Quote">
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("insertUnorderedList")} title="Bulleted list">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={insertLink} title="Link">
          <LinkIcon className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={insertImageByUrl} title="Insert image by URL">
          <ImagePlus className="h-4 w-4" />
        </button>
        {onUploadImage ? (
          <label className={TOOLBAR_BUTTON_CLASS} title="Upload inline image">
            <UploadCloudShim />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
            />
          </label>
        ) : null}
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("removeFormat")} title="Remove formatting">
          <RemoveFormatting className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("undo")} title="Undo">
          <Undo2 className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(readEditorHtml(editorRef.current))}
        className="prose prose-invert mt-4 min-h-[320px] max-w-none rounded-2xl border border-[#1e2330] bg-[#1c1f2d] px-5 py-4 text-sm leading-7 text-slate-100 outline-none prose-headings:text-white prose-a:text-[#ff4da0] prose-strong:text-white prose-li:text-slate-200"
      />
    </div>
  );
};

export default RichTextEditor;

const UploadCloudShim = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V7" />
    <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
    <path d="M20 16.5a4.5 4.5 0 0 0-2.6-8.2 6 6 0 0 0-11.5 1.7A4 4 0 0 0 6 18h12a2 2 0 0 0 2-1.5Z" />
  </svg>
);

