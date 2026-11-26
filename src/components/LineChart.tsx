import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  points: { x: number; y: number }[];
  height?: number;
  /** Show min/max labels and dots (full chart) vs. a bare sparkline. */
  detailed?: boolean;
  formatY?: (y: number) => string;
  formatX?: (x: number) => string;
  color?: string;
}

/** Small dependency-free line chart drawn with react-native-svg. */
export function LineChart({ points, height = 60, detailed = false, formatY = String, formatX, color = colors.accent }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) return <View style={{ height }} onLayout={onLayout} />;

  const padL = detailed ? 44 : 4;
  const padR = 8;
  const padT = 8;
  const padB = detailed ? 22 : 4;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxY - minY < 1e-6) { minY -= 1; maxY += 1; }
  const pad = (maxY - minY) * 0.1;
  minY -= pad; maxY += pad;

  const sx = (x: number) => padL + (maxX === minX ? (width - padL - padR) / 2 : ((x - minX) / (maxX - minX)) * (width - padL - padR));
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * (height - padT - padB);

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(points[points.length - 1].x)},${height - padB} L${sx(points[0].x)},${height - padB} Z`;
  const gid = `g${color.replace('#', '')}`;

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {detailed && [maxY - pad, (minY + maxY) / 2, minY + pad].map((v) => (
            <Line key={v} x1={padL} x2={width - padR} y1={sy(v)} y2={sy(v)} stroke={colors.border} strokeDasharray="4 4" />
          ))}
          {detailed && [maxY - pad, minY + pad].map((v) => (
            <SvgText key={`t${v}`} x={padL - 6} y={sy(v) + 4} fill={colors.textDim} fontSize={10} textAnchor="end">{formatY(v)}</SvgText>
          ))}
          {detailed && formatX && (
            <>
              <SvgText x={padL} y={height - 6} fill={colors.textDim} fontSize={10}>{formatX(minX)}</SvgText>
              <SvgText x={width - padR} y={height - 6} fill={colors.textDim} fontSize={10} textAnchor="end">{formatX(maxX)}</SvgText>
            </>
          )}
          <Path d={area} fill={`url(#${gid})`} />
          <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {(detailed || points.length === 1) && points.map((p, i) => (
            <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={color} />
          ))}
        </Svg>
      )}
    </View>
  );
}
