'use client';

import { useState } from 'react';

import { Button } from './Button';
import { FormField } from './FormField';
import { Sheet } from './Sheet';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
  /** For irreversible actions: the user must type this phrase (e.g. "DELETE") to enable confirm. */
  confirmationPhrase?: string;
  /** What exactly will be affected, listed under the message. */
  details?: string[];
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  // Remount the body when reopened so the typed phrase resets.
  return (
    <Sheet open={props.open} onClose={props.onCancel} title={props.title} size="sm">
      {props.open ? <ConfirmBody {...props} /> : null}
    </Sheet>
  );
}

function ConfirmBody({ body, confirmLabel, onConfirm, onCancel, destructive, loading, confirmationPhrase, details }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const phraseOk = !confirmationPhrase || typed.trim().toUpperCase() === confirmationPhrase.toUpperCase();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (phraseOk && !loading) onConfirm();
      }}>
      <p className="type-body-m text-muted">{body}</p>
      {details?.length ? (
        <ul className="type-body-s flex list-disc flex-col gap-1 pl-5 text-navy marker:text-coral">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      {confirmationPhrase ? (
        <FormField
          label={`Type ${confirmationPhrase} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant={destructive ? 'destructive' : 'primary'} disabled={!phraseOk} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
