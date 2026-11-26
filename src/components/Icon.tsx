import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Small hand-drawn line icons (24×24) used in settings rows. */
export type IconName =
  | 'play' | 'speaker' | 'bell' | 'calendar' | 'ruler' | 'dumbbell' | 'palette'
  | 'folder' | 'info' | 'target' | 'person' | 'chevron' | 'search' | 'food' | 'sun' | 'heart' | 'gear' | 'link' | 'pin' | 'more';

export function Icon({ name, size = 20, color = '#fff' }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && <Path d="M8 5.5v13l10-6.5z" {...p} />}
      {name === 'speaker' && (<><Path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" {...p} /><Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" {...p} /></>)}
      {name === 'bell' && (<><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" {...p} /><Path d="M10 20.5a2 2 0 0 0 4 0" {...p} /></>)}
      {name === 'calendar' && (<><Rect x={4} y={5.5} width={16} height={14.5} rx={3} {...p} /><Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" {...p} /></>)}
      {name === 'ruler' && (<><Rect x={3} y={8} width={18} height={8} rx={2} {...p} /><Path d="M7 8v3.5M11 8v2.5M15 8v3.5M19 8v2.5" {...p} /></>)}
      {name === 'dumbbell' && (<><Path d="M7 8v8M17 8v8M4.5 10v4M19.5 10v4M7 12h10" {...p} /></>)}
      {name === 'palette' && (<><Path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.8-1 1.2-2-.7-1.2 0-2.5 1.4-2.5H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z" {...p} /><Circle cx={8} cy={11} r={1.2} fill={color} /><Circle cx={12} cy={7.5} r={1.2} fill={color} /><Circle cx={16} cy={10} r={1.2} fill={color} /></>)}
      {name === 'folder' && <Path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" {...p} />}
      {name === 'info' && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Path d="M12 11v5.5" {...p} /><Circle cx={12} cy={7.8} r={1.1} fill={color} /></>)}
      {name === 'target' && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Circle cx={12} cy={12} r={4.5} {...p} /><Circle cx={12} cy={12} r={1} fill={color} /></>)}
      {name === 'person' && (<><Circle cx={12} cy={9} r={3.5} {...p} /><Path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5" {...p} /></>)}
      {name === 'chevron' && <Path d="M9.5 6l6 6-6 6" {...p} />}
      {name === 'food' && (<><Path d="M7 3.5v7M5 3.5v4.5a2 2 0 0 0 4 0V3.5M7 10.5v10" {...p} /><Path d="M17 20.5V3.5c-2 1-3.5 3.5-3.5 7v2.5H17" {...p} /></>)}
      {name === 'sun' && (<><Circle cx={12} cy={12} r={4} {...p} /><Path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" {...p} /></>)}
      {name === 'heart' && <Path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" {...p} />}
      {name === 'gear' && (<><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" {...p} /><Circle cx={12} cy={12} r={6.5} {...p} /></>)}
      {name === 'link' && (<><Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" {...p} /><Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...p} /></>)}
      {name === 'pin' && (<><Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.3} {...p} /></>)}
      {name === 'more' && (<><Circle cx={5.5} cy={12} r={1.8} fill={color} /><Circle cx={12} cy={12} r={1.8} fill={color} /><Circle cx={18.5} cy={12} r={1.8} fill={color} /></>)}
      {name === 'search' && (<><Circle cx={10.5} cy={10.5} r={6} {...p} /><Path d="M15 15l5 5" {...p} /></>)}
    </Svg>
  );
}
