import React from "react";

type IconProps = {
  src: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

export function Icon({ src, width = 24, height = 24, style }: IconProps) {
  return (
    <img
      src={src}
      width={width}
      height={height}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      alt=""
    />
  );
}