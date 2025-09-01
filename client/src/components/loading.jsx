import { Loader2Icon } from 'lucide-react';

export function Loading({ text = '' }) {
  return (
    <>
      <Loader2Icon className="animate-spin" />
      {text}
    </>
  );
}
