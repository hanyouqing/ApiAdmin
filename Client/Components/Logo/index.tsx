import React from 'react';

interface LogoProps {
  size?: number;
  collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 32, collapsed = false }) => {
  const fontSize = Math.floor(size * 0.4);
  const letterSpacing = Math.floor(size * 0.05);
  const borderRadius = Math.floor(size * 0.15);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#1a365d', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="logoShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect
        width={size}
        height={size}
        rx={borderRadius}
        fill="url(#logoGradient)"
      />
      <text
        x="50%"
        y="50%"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="700"
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing={letterSpacing}
        filter="url(#logoShadow)"
      >
        AA
      </text>
    </svg>
  );
};

export default Logo;

