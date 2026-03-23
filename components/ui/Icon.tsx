import React from "react";

type IconSource = string | { src?: string } | null | undefined;

type IconProps = {
  src: IconSource;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

function resolveIconSource(src: IconSource) {
  if (typeof src === "string") {
    return src;
  }

  if (src && typeof src === "object" && typeof src.src === "string") {
    return src.src;
  }

  return "";
}

export function Icon({ src, width = 24, height = 24, style, className }: IconProps) {
  const resolvedSrc = resolveIconSource(src);

  return (
    <img
      src={resolvedSrc}
      width={width}
      height={height}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      alt=""
    />
  );
}
