import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Muscle } from '../data/muscles';
import { colors } from '../theme/colors';

/**
 * Hand-drawn, stylised front/back body map (original artwork for this app).
 * Points are given for the figure's right half (x ≥ 100 in a 200×400 box),
 * mirrored for the left half, and smoothed into curves (Catmull-Rom → Bézier).
 */
type Pt = [number, number];
type Shape = { muscle: Muscle; pts: Pt[] };

const SILHOUETTE_HALF: Pt[] = [
  [100, 50], [107, 51], [109, 61], [120, 66], [136, 69], [149, 74], [156, 85], [159, 101], [161, 119],
  [164, 139], [167, 161], [168, 181], [166, 193], [168, 203], [162, 213], [154, 211], [151, 197],
  [147, 178], [144, 158], [141, 138], [139, 118], [137, 104], [135, 121], [133, 146], [131, 168],
  [135, 186], [137, 208], [136, 248], [132, 266], [134, 296], [131, 336], [127, 366], [133, 380],
  [124, 389], [110, 388], [108, 371], [111, 340], [109, 300], [106, 272], [104, 240], [102, 206], [100, 200],
];

const FRONT: Shape[] = [
  { muscle: 'traps', pts: [[102, 60], [112, 63], [125, 70], [105, 72]] },
  { muscle: 'upper_chest', pts: [[102, 76], [124, 73], [132, 80], [103, 87]] },
  { muscle: 'chest', pts: [[102, 89], [132, 83], [136, 95], [103, 99]] },
  { muscle: 'lower_chest', pts: [[103, 101], [136, 97], [128, 109], [103, 110]] },
  { muscle: 'neck', pts: [[102, 48], [108, 50], [110, 60], [102, 59]] },
  { muscle: 'front_delts', pts: [[128, 71], [139, 73], [143, 85], [137, 95], [134, 82]] },
  { muscle: 'side_delts', pts: [[141, 74], [150, 79], [154, 92], [146, 88]] },
  { muscle: 'biceps', pts: [[141, 99], [151, 96], [154, 116], [148, 128], [143, 120]] },
  { muscle: 'brachialis', pts: [[150, 120], [156, 118], [155, 133], [149, 134]] },
  { muscle: 'forearms', pts: [[145, 139], [154, 137], [162, 160], [161, 180], [152, 181], [147, 159]] },
  { muscle: 'abs', pts: [[102, 113], [116, 113], [116, 167], [109, 177], [102, 179]] },
  { muscle: 'obliques', pts: [[120, 113], [129, 114], [133, 140], [128, 168], [120, 164]] },
  { muscle: 'hip_flexors', pts: [[108, 181], [122, 176], [119, 195], [109, 196]] },
  { muscle: 'abductors', pts: [[128, 178], [137, 189], [135, 204], [129, 194]] },
  { muscle: 'adductors', pts: [[102, 197], [107, 201], [109, 231], [103, 241]] },
  { muscle: 'quads', pts: [[109, 199], [126, 187], [134, 203], [132, 247], [123, 261], [113, 256], [110, 231]] },
  { muscle: 'calves', pts: [[113, 284], [121, 282], [121, 330], [115, 326]] },
  { muscle: 'tibialis', pts: [[123, 282], [131, 284], [130, 318], [124, 346], [122, 320]] },
];

const BACK: Shape[] = [
  { muscle: 'neck', pts: [[102, 46], [108, 48], [109, 57], [102, 56]] },
  { muscle: 'traps', pts: [[102, 57], [111, 61], [129, 72], [112, 78], [102, 80]] },
  { muscle: 'mid_traps', pts: [[102, 82], [113, 80], [118, 88], [110, 100], [102, 110]] },
  { muscle: 'rear_delts', pts: [[131, 74], [144, 79], [147, 93], [137, 89]] },
  { muscle: 'side_delts', pts: [[146, 79], [154, 89], [149, 95]] },
  { muscle: 'rhomboids', pts: [[105, 93], [114, 91], [132, 92], [127, 109], [106, 112]] },
  { muscle: 'teres_major', pts: [[128, 100], [138, 101], [137, 112], [129, 110]] },
  { muscle: 'lats', pts: [[105, 116], [129, 113], [137, 121], [130, 149], [114, 160], [106, 154]] },
  { muscle: 'lower_back', pts: [[102, 158], [111, 156], [117, 175], [102, 178]] },
  { muscle: 'triceps', pts: [[141, 97], [151, 95], [156, 121], [151, 133], [144, 126]] },
  { muscle: 'forearm_extensors', pts: [[145, 139], [154, 137], [162, 160], [161, 180], [152, 181], [147, 159]] },
  { muscle: 'glutes', pts: [[102, 184], [121, 180], [133, 194], [131, 211], [110, 216], [102, 208]] },
  { muscle: 'glute_medius', pts: [[112, 176], [126, 172], [136, 184], [132, 192], [120, 181]] },
  { muscle: 'hamstrings', pts: [[105, 221], [130, 216], [132, 255], [123, 265], [112, 261], [107, 240]] },
  { muscle: 'calves', pts: [[112, 282], [130, 280], [134, 310], [125, 322], [115, 318], [110, 302]] },
  { muscle: 'soleus', pts: [[115, 322], [126, 324], [124, 350], [117, 348]] },
];

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y]);

/** Closed smooth path through the points (Catmull-Rom spline as cubic Béziers). */
function smooth(pts: Pt[], tension = 0.5): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${p(0)[0]},${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    const c1x = x1 + ((x2 - x0) / 6) * tension * 2, c1y = y1 + ((y2 - y0) / 6) * tension * 2;
    const c2x = x2 - ((x3 - x1) / 6) * tension * 2, c2y = y2 - ((y3 - y1) / 6) * tension * 2;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2},${y2}`;
  }
  return d + 'Z';
}

const SILHOUETTE = smooth([...SILHOUETTE_HALF, ...mirror(SILHOUETTE_HALF).reverse().slice(1, -1)], 0.45);

const BODY = '#262B40';
const BODY_EDGE = '#3B4262';
export const UNTRAINED = '#363C58';

interface Props {
  /** Fill for a muscle; null leaves it in the neutral "untrained" color. */
  colorFor: (m: Muscle) => string | null;
  height?: number;
  showLabels?: boolean;
  /** Makes muscles tappable. */
  onPressMuscle?: (m: Muscle) => void;
}

function Figure({ shapes, colorFor, height, label, id, onPressMuscle }: { shapes: Shape[]; colorFor: Props['colorFor']; height: number; label?: string; id: string; onPressMuscle?: Props['onPressMuscle'] }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {label && <Text style={{ color: colors.textDim, fontSize: 11, marginBottom: 4, letterSpacing: 1.5, fontWeight: '700' }}>{label}</Text>}
      <Svg width={height / 2} height={height} viewBox="0 0 200 400">
        <Defs>
          <ClipPath id={`clip-${id}`}>
            <Path d={SILHOUETTE} />
            <Ellipse cx={100} cy={30} rx={15} ry={19} />
          </ClipPath>
          <LinearGradient id={`light-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.28} />
          </LinearGradient>
          <RadialGradient id={`glow-${id}`} cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={100} cy={200} rx={95} ry={190} fill={`url(#glow-${id})`} />
        <Ellipse cx={100} cy={393} rx={42} ry={5} fill="#000" opacity={0.35} />
        <Path d={SILHOUETTE} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.2} />
        <Ellipse cx={100} cy={30} rx={15} ry={19} fill={BODY} stroke={BODY_EDGE} strokeWidth={1.2} />
        <G clipPath={`url(#clip-${id})`}>
          {shapes.map((s, i) => {
            const fill = colorFor(s.muscle) ?? UNTRAINED;
            return (
              <G key={i}>
                <Path d={smooth(s.pts)} fill={fill} stroke={BODY} strokeWidth={1.6} strokeLinejoin="round" onPress={onPressMuscle ? () => onPressMuscle(s.muscle) : undefined} />
                <Path d={smooth(mirror(s.pts))} fill={fill} stroke={BODY} strokeWidth={1.6} strokeLinejoin="round" onPress={onPressMuscle ? () => onPressMuscle(s.muscle) : undefined} />
              </G>
            );
          })}
          <Rect x={0} y={0} width={200} height={400} fill={`url(#light-${id})`} />
        </G>
      </Svg>
    </View>
  );
}

export function BodyMap({ colorFor, height = 300, showLabels = true, onPressMuscle }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
      <Figure id={`${id}f`} shapes={FRONT} colorFor={colorFor} height={height} label={showLabels ? 'FRONT' : undefined} onPressMuscle={onPressMuscle} />
      <Figure id={`${id}b`} shapes={BACK} colorFor={colorFor} height={height} label={showLabels ? 'BACK' : undefined} onPressMuscle={onPressMuscle} />
    </View>
  );
}
