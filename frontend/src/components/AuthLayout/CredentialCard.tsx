import type { CredentialCardProps } from './types';

/** A document card of the Figma "wallet scene": its name and two placeholder lines. */
export default function CredentialCard({ credential, className }: CredentialCardProps) {
  const { title, cardClassName, lineClassName, lineWidths } = credential;
  return (
    <div
      className={`rounded-kern-large flex h-164 w-260 shrink-0 flex-col items-start gap-8 overflow-clip border p-24 ${cardClassName} ${className}`}
    >
      <span className="text-kern-static-small text-kern-feedback-success leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap">
        {title}
      </span>
      <span className={`rounded-kern-default h-8 ${lineClassName} ${lineWidths[0]}`} />
      <span className={`rounded-kern-default h-8 ${lineClassName} ${lineWidths[1]}`} />
    </div>
  );
}
