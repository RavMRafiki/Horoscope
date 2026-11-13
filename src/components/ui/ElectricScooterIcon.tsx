import type { SVGProps } from "react";

export function ElectricScooterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Rear Wheel */}
      <path d="M96 356c-24.3 0-44 19.7-44 44s19.7 44 44 44 44-19.7 44-44-19.7-44-44-44zm0 66c-12.1 0-22-9.9-22-22s9.9-22 22-22 22 9.9 22 22-9.9 22-22 22z" />
      {/* Front Wheel */}
      <path d="M416 356c-24.3 0-44 19.7-44 44s19.7 44 44 44 44-19.7 44-44-19.7-44-44-44zm0 66c-12.1 0-22-9.9-22-22s9.9-22 22-22 22 9.9 22 22-9.9 22-22 22z" />
      {/* Rear Mudguard */}
      <path d="M54 394c0-27.6 19.5-50.5 45.6-55.2l2.8 17.8c-18.1 3.2-31.6 19-31.6 37.4z" />
      {/* Footboard Deck */}
      <rect x="116" y="388" width="236" height="24" rx="8" />
      {/* Neck and Fork */}
      <path d="M336 390l42-52 16 10-38 46 44 48-15 14-49-54v-12z" />
      {/* Steering Stem & Handlebars */}
      <path d="M260 56h120c6.6 0 12 5.4 12 12s-5.4 12-12 12h-44l60 262-20 4-60-266h-56c-6.6 0-12-5.4-12-12s5.4-12 12-12z" />
      {/* Electric Lightning Bolt */}
      <polygon points="235,190 215,245 238,245 220,305 268,235 244,235" />
    </svg>
  );
}
