"use client";

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: "text-sm" },
    md: { icon: 40, text: "text-xl" },
    lg: { icon: 56, text: "text-2xl" },
    xl: { icon: 72, text: "text-3xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Brutalist Style */}
      <div
        className="relative flex-shrink-0"
        style={{ width: icon, height: icon }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer frame */}
          <rect
            x="2"
            y="2"
            width="56"
            height="56"
            fill="#FF006E"
            stroke="#000000"
            strokeWidth="4"
          />
          {/* Inner yellow box */}
          <rect
            x="10"
            y="10"
            width="40"
            height="40"
            fill="#FFFF00"
            stroke="#000000"
            strokeWidth="3"
          />
          {/* Brain/Mind wave */}
          <path
            d="M16 28 Q22 16 30 26 Q38 36 46 22"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Surf wave */}
          <path
            d="M14 42 Q26 34 38 42 Q46 48 52 38"
            stroke="#00FFFF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span
          className={`${text} font-black text-white uppercase tracking-tight`}
        >
          The Mind Surf
        </span>
      )}
    </div>
  );
}

// Animated version with hover effects
export function LogoAnimated({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: "text-sm" },
    md: { icon: 40, text: "text-xl" },
    lg: { icon: 56, text: "text-2xl" },
    xl: { icon: 72, text: "text-3xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      {/* Logo Icon with hover animation */}
      <div
        className="relative flex-shrink-0 transition-transform duration-200 group-hover:rotate-[-3deg] group-hover:scale-110"
        style={{ width: icon, height: icon }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 60 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[3px_3px_0px_#000] group-hover:drop-shadow-[5px_5px_0px_#000] transition-all duration-200"
        >
          {/* Outer frame */}
          <rect
            x="2"
            y="2"
            width="56"
            height="56"
            fill="#FF006E"
            stroke="#000000"
            strokeWidth="4"
            className="group-hover:fill-[#FF1493] transition-colors duration-200"
          />
          {/* Inner yellow box */}
          <rect
            x="10"
            y="10"
            width="40"
            height="40"
            fill="#FFFF00"
            stroke="#000000"
            strokeWidth="3"
          />
          {/* Brain/Mind wave */}
          <path
            d="M16 28 Q22 16 30 26 Q38 36 46 22"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            className="group-hover:stroke-[#FF006E] transition-colors duration-200"
          />
          {/* Surf wave */}
          <path
            d="M14 42 Q26 34 38 42 Q46 48 52 38"
            stroke="#00FFFF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Text with hover effect */}
      {showText && (
        <span
          className={`${text} font-black text-white uppercase tracking-tight group-hover:text-[#FFFF00] transition-colors duration-200`}
        >
          The Mind Surf
        </span>
      )}
    </div>
  );
}

// Icon only version for favicons/compact use
export function LogoIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="56"
        height="56"
        fill="#FF006E"
        stroke="#000000"
        strokeWidth="4"
      />
      <rect
        x="10"
        y="10"
        width="40"
        height="40"
        fill="#FFFF00"
        stroke="#000000"
        strokeWidth="3"
      />
      <path
        d="M16 28 Q22 16 30 26 Q38 36 46 22"
        stroke="#000000"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 42 Q26 34 38 42 Q46 48 52 38"
        stroke="#00FFFF"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
