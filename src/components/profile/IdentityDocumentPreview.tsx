import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function IdentityDocumentPreview({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[599] bg-black/90" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[600] flex max-h-[95dvh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 rounded-2xl bg-[#101722] p-4 text-white outline-none"
        >
          <Dialog.Title className="sr-only">
            Private identity document preview
          </Dialog.Title>
          <Dialog.Close
            className="flex min-h-11 items-center gap-2 self-end rounded-xl bg-white/10 px-4"
            aria-label="Close document preview"
          >
            <X className="h-4 w-4" />
            Close
          </Dialog.Close>
          <img
            src={url}
            alt="Uploaded identity document"
            className="max-h-[78dvh] max-w-full object-contain"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
