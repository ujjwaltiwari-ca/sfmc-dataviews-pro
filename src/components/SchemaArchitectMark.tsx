import { BRAND_NAME } from '../constants/brand';

type SchemaArchitectMarkProps = {
  className?: string;
  title?: string;
};

/** Layered schema tables + network node — brand mark for DataViews.pro */
export function SchemaArchitectMark({
  className = 'h-10 w-10',
  title = BRAND_NAME,
}: SchemaArchitectMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="40" height="40" rx="10" fill="url(#sa-mark-bg)" />
      <rect
        x="8"
        y="10"
        width="14"
        height="4"
        rx="1.25"
        fill="white"
        fillOpacity="0.96"
      />
      <rect
        x="8"
        y="16"
        width="11"
        height="3.5"
        rx="1.25"
        fill="white"
        fillOpacity="0.78"
      />
      <rect
        x="8"
        y="21.5"
        width="13"
        height="3.5"
        rx="1.25"
        fill="white"
        fillOpacity="0.58"
      />
      <circle cx="29" cy="14" r="2.75" fill="white" />
      <circle cx="29" cy="26" r="2.75" fill="white" fillOpacity="0.88" />
      <path
        d="M22.5 15.5h4.5M29 16.25v7M25.5 25.5h4.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="sa-mark-bg"
          x1="4"
          y1="4"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#06b6d4" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}
