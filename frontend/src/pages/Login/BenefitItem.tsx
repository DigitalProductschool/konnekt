import type { BenefitItemProps } from './types';

/** Figma "Auth/Benefit": an icon tile and a short title. */
export default function BenefitItem({ benefit }: BenefitItemProps) {
  return (
    <li className="flex min-h-48 items-center gap-16">
      <span className="rounded-kern-large bg-kern-darkblue-050 flex size-40 shrink-0 items-center justify-center">
        <img src={benefit.icon} alt="" className="size-24" />
      </span>
      <span className="text-kern-static-medium text-kern-layout-text-default font-semibold">
        {benefit.title}
      </span>
    </li>
  );
}
