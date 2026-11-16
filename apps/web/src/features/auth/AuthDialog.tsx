import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useAuth } from "./AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Field } from "../../components/Field";
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const auth = useAuth();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFields({});
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    const parsed = (register ? registrationSchema : loginSchema).safeParse(
      values,
    );
    if (!parsed.success) {
      setFields(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    setBusy(true);
    try {
      if (register)
        await auth.register(
          String(values.name),
          String(values.email),
          String(values.password),
        );
      else await auth.login(String(values.email), String(values.password));
      form.reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          setError("");
          setFields({});
          onOpenChange(v);
        }
      }}
    >
      <DialogContent>
        <DialogTitle className="mb-2 text-2xl font-bold">
          {register ? "Create your account" : "Welcome back."}
        </DialogTitle>
        <DialogDescription className="mb-6 text-sm text-slate-500">
          Save designs, track your orders and access your purchased files.
        </DialogDescription>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {register && (
            <Field label="Name" error={fields.name}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  name="name"
                  autoComplete="name"
                  aria-invalid={!!fields.name}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          )}
          <Field label="Email" error={fields.email}>
            {(id, describedBy) => (
              <Input
                id={id}
                type="email"
                name="email"
                autoComplete="email"
                aria-invalid={!!fields.email}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <Field
            label="Password"
            error={fields.password}
            hint={
              register
                ? "At least 12 characters. No password is stored in your browser."
                : undefined
            }
          >
            {(id, describedBy) => (
              <Input
                id={id}
                type="password"
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                maxLength={128}
                aria-invalid={!!fields.password}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setRegister(!register);
              setError("");
              setFields({});
            }}
            disabled={busy}
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
