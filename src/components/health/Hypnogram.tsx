import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { STAGE, type SleepSession } from '../../domain/sleep';
import { colors } from '../../theme/colors';

const ROWS = [
  { label: 'Awake', stages: [STAGE.AWAKE, STAGE.OUT_OF_BED, STAGE.AWAKE_IN_BED], color: '#FF7A90' },
  { label: 'REM', stages: [STAGE.REM], color: '#4FA8FF' },
  { label: 'Light', stages: [STAGE.LIGHT, STAGE.SLEEPING, STAGE.UNKNOWN], color: '#8AA4FF' },
  { label: 'Deep', stages: [STAGE.DEEP], color: '#6A4CFF' },
];
export const STAGE_COLORS = { awake: ROWS[0].color, rem: ROWS[1].color, light: ROWS[2].color, deep: ROWS[3].color };

/** Stage timeline: one lane per stage, time left to right. */
export function Hypnogram({ session, width }: { session: SleepSession; width: number }) {
  const t0 = new Date(session.startTime).getTime();
  const t1 = new Date(session.endTime).getTime();
  const left = 44;
  const w = Math.max(10, width - left);
  const lane = 22;
  const x = (t: string) => left + ((new Date(t).getTime() - t0) / (t1 - t0)) * w;
  return (
    <View>
      <Svg width={width} height={lane * ROWS.length + 4}>
        {ROWS.map((r, i) => (
          <SvgText key={r.label} x={0} y={i * lane + 15} fill={colors.textDim} fontSize={11}>{r.label}</SvgText>
        ))}
        {session.stages.map((st, k) => {
          const row = ROWS.findIndex((r) => (r.stages as readonly number[]).includes(st.stage));
          if (row < 0) return null;
          return <Rect key={k} x={x(st.startTime)} y={row * lane + 3} width={Math.max(1, x(st.endTime) - x(st.startTime))} height={lane - 6} rx={3} fill={ROWS[row].color} />;
        })}
      </Svg>
    </View>
  );
}
