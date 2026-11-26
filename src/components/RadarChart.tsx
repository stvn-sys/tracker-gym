import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Axis { label: string; sublabel?: string; value: number | null; color?: string } // value 0–100

export function RadarChart({ axes, height = 280 }: { axes: Axis[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 44;
  const n = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, f: number) => [cx + Math.cos(angle(i)) * r * f, cy + Math.sin(angle(i)) * r * f];
  const ring = (f: number) => axes.map((_, i) => pt(i, f).join(',')).join(' ');
  const shape = axes.map((a, i) => pt(i, Math.max(0.03, (a.value ?? 0) / 100)).join(',')).join(' ');

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <Polygon key={f} points={ring(f)} fill="none" stroke={colors.border} strokeWidth={1} />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, 1);
            return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border} />;
          })}
          <Polygon points={shape} fill={colors.success + '40'} stroke={colors.success} strokeWidth={2.5} strokeLinejoin="round" />
          {axes.map((a, i) => {
            const [x, y] = pt(i, Math.max(0.03, (a.value ?? 0) / 100));
            return <Circle key={i} cx={x} cy={y} r={4} fill={colors.success} />;
          })}
          {axes.map((a, i) => {
            const [x, y] = pt(i, 1.22);
            const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
            return (
              <SvgText key={`l${i}`} x={x} y={y - 2} textAnchor={anchor} fill={colors.text} fontSize={12} fontWeight="700">
                {a.label}
              </SvgText>
            );
          })}
          {axes.map((a, i) => {
            const [x, y] = pt(i, 1.22);
            const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
            return (
              <SvgText key={`s${i}`} x={x} y={y + 12} textAnchor={anchor} fill={a.color ?? colors.textDim} fontSize={11}>
                {a.sublabel ?? ''}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
