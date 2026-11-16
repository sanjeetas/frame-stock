import { useId, type ReactNode } from "react";
interface Props {
  label: string;
  error?: string;
  children: (id: string, errorId: string | undefined) => ReactNode;
  hint?: string;
}
export function Field({ label, error, children, hint }: Props) {
  const id = useId(),
    errorId = error ? id + "-error" : undefined;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id, errorId)}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}
