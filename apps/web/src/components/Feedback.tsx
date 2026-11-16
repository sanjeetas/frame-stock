import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"
    >
      <LoaderCircle className="animate-spin" size={18} />
      {text}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="my-5 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle size={18} />
        {message}
      </div>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-5 py-14 text-center">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
