import { memo } from 'react'

/**
 * AeroDrop Official Drone Logo Component
 * Precision aerospace quadcopter emblem with vibrant HUD glow styling
 */
export default memo(function DroneLogo({
  className = 'w-5 h-5',
  strokeColor = 'currentColor',
  coreColor = '#00f0ff',
  glow = false
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]' : ''} transition-all`}
    >
      {/* 4 Diagonal Rotor Arms */}
      <path
        d="M11 11L19 19M37 37L29 29M37 11L29 19M11 37L19 29"
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Avionics & Payload Core */}
      <rect
        x="19"
        y="19"
        width="10"
        height="10"
        rx="2"
        fill={coreColor}
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4 Symmetrical Rotor Guards (Clean 270° Circular Ducts with No Artifacts) */}
      <path
        d="
          M18 11C18 7.134 14.866 4 11 4C7.134 4 4 7.134 4 11C4 14.866 7.134 18 11 18
          M30 11C30 7.134 33.134 4 37 4C40.866 4 44 7.134 44 11C44 14.866 40.866 18 37 18
          M37 30C40.866 30 44 33.134 44 37C44 40.866 40.866 44 37 44C33.134 44 30 40.866 30 37
          M11 30C7.134 30 4 33.134 4 37C4 40.866 7.134 44 11 44C14.866 44 18 40.866 18 37
        "
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

