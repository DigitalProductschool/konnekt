import checkCircleIcon from '../../assets/icons/check-circle.svg';
import type { CheckChipProps } from './types';

/** A passed check of the Figma "wallet scene". */
export default function CheckChip({ label }: CheckChipProps) {
  return (
    <span className="border-kern-feedback-success-background bg-kern-layout-background-default shadow-chip flex shrink-0 items-center gap-8 overflow-clip rounded-[20px] border py-8 pr-14 pl-10">
      <img src={checkCircleIcon} alt="" className="size-20" />
      <span className="text-kern-static-small text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap">
        {label}
      </span>
    </span>
  );
}
