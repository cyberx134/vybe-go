import { ICONS, type IconDef, type IconName } from '@vybe/shared';

interface IconProps {
  name: IconName;
  size?: number;
}

/** shared প্যাকেজের আইকন-ডেটা থেকে SVG রেন্ডার (ওয়েব ও মোবাইলে একই আইকন) */
export function Icon({ name, size = 19 }: IconProps) {
  const def: IconDef = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={def.strokeWidth ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {def.shapes.map((shape, i) =>
        shape.kind === 'path' ? <path key={i} d={shape.d} /> : <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />,
      )}
    </svg>
  );
}
