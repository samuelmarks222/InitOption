type MpesaIconProps = {
  className?: string;
  title?: string;
};

export const MpesaIcon = ({ className = "", title = "M-PESA" }: MpesaIconProps) => (
  <svg
    viewBox="0 0 512 273"
    role="img"
    aria-label={title}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <g transform="translate(8 20)">
      <text
        x="0"
        y="182"
        fill="#48A942"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontSize="196"
        fontStyle="italic"
        fontWeight="900"
        letterSpacing="-18"
      >
        M
      </text>

      <g transform="translate(86 34) rotate(-7 38 60)">
        <rect x="0" y="0" width="76" height="122" rx="15" fill="#ffffff" stroke="#48A942" strokeWidth="10" />
        <rect x="18" y="11" width="40" height="6" rx="3" fill="#48A942" opacity="0.9" />
        <circle cx="38" cy="105" r="6" fill="#48A942" opacity="0.85" />
        <path
          d="M21 68c12-26 37-42 56-34 8 4 11 12 7 19-8 11-22 8-27 2 8 25-5 40-22 41-11 1-17-5-18-12 0-7 5-13 14-16"
          fill="none"
          stroke="#E12B2B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="10"
        />
        <path d="M50 34l24 8-18 17" fill="none" stroke="#E12B2B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10" />
      </g>

      <text
        x="156"
        y="182"
        fill="#117A3B"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontSize="150"
        fontStyle="italic"
        fontWeight="900"
        letterSpacing="-10"
      >
        PESA
      </text>
    </g>
  </svg>
);
