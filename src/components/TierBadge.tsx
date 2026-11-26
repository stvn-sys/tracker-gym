import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { TIER_COLORS, UNRANKED_COLOR, type Rank } from '../domain/ranking';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Hexagon badge in the tier color with the sub-level numeral. */
export function TierBadge({ rank, size = 40 }: { rank: Rank | null; size?: number }) {
  const c = rank ? TIER_COLORS[rank.tier] : UNRANKED_COLOR;
  const hex = (s: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push(`${50 + Math.cos(a) * s},${50 + Math.sin(a) * s}`);
    }
    return pts.join(' ');
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={hex(48)} fill={c} opacity={0.25} />
      <Polygon points={hex(38)} fill={c} stroke="#0B0D17" strokeWidth={3} />
      <SvgText x={50} y={60} textAnchor="middle" fontSize={rank ? 30 : 26} fontWeight="900" fill="#0B0D17">
        {rank ? ROMAN[rank.sub - 1] : '–'}
      </SvgText>
    </Svg>
  );
}
