"use client";

/**
 * WordPress-style media picker: a modal that shows the existing media library to
 * choose from, with an "Upload from computer" button for new files. Used by
 * ImageField so the upload button opens the library first instead of jumping
 * straight to the OS file dialog.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (url: string) => void;
  kind?: "image" | "video" | "document"; // restrict the picker to one media kind
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark max-h-[85vh] w-full overflow-y-auto border border-white/10 bg-zinc-950/95 text-zinc-100 ring-white/10 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Media library</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Pick an existing file, or upload a new one from your computer.
          </DialogDescription>
        </DialogHeader>
        <MediaLibrary
          selectable
          lockKind={kind}
          onSelect={(m) => {
            onSelect(m.url);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
