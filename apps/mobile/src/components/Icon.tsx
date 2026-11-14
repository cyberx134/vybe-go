import Svg, { Circle, Path } from 'react-native-svg';
import { ICONS, type IconDef, type IconName } from '@vybe/shared';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/** ওয়েবের সাথে একই shared আইকন-ডেটা */
export function Icon({ name, size = 19, color = '#ffffff' }: IconProps) {
  const def: IconDef = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={def.strokeWidth ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {def.shapes.map((shape, i) =>
        shape.kind === 'path' ? <Path key={i} d={shape.d} /> : <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />,
      )}
    </Svg>
  );
}
