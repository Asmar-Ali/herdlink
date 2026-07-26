import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const controlClass =
  'block w-full rounded-lg border border-[var(--border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)] disabled:opacity-60';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-[var(--text-h)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--status-critical)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--text)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${controlClass} ${props.className ?? ''}`} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${controlClass} ${props.className ?? ''}`}>
      {props.children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${controlClass} resize-y ${props.className ?? ''}`}
    />
  );
}
