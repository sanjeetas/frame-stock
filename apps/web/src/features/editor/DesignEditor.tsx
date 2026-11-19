import { lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import type { DesignSettings, Product } from "../../types";
export { initialDesign } from "./designDefaults";
const StudioEditor = lazy(() => import("./StudioEditor"));
interface Props {
  startInEditor?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DesignSettings;
  existingId?: string;
  product?: Product;
  onApply?: (settings: DesignSettings) => void;
  onSaved?: () => void;
  onSignIn: () => void;
}
export function DesignEditor({ open, onOpenChange, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none p-0 [&>button:last-child]:hidden"
        onEscapeKeyDown={(event) => {
          if (globalThis.document.activeElement?.tagName === "TEXTAREA")
            event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">PHULO Design Studio</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a template, edit text directly, upload images and save front
          and back artwork.
        </DialogDescription>
        {open && (
          <Suspense
            fallback={
              <div
                className="flex h-full items-center justify-center"
                role="status"
              >
                Loading design studio…
              </div>
            }
          >
            <StudioEditor {...props} onClose={() => onOpenChange(false)} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
