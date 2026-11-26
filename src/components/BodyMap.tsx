import { Text, View } from 'react-native';
import Svg, { Ellipse, G, Polygon } from 'react-native-svg';
import type { Muscle } from '../data/muscles';
import { colors } from '../theme/colors';

/**
 * Hand-drawn, stylised front/back body map (original artwork for this app).
 * Shapes are defined for the figure's right half (x ≥ 100 in a 200×400 box)
 * and mirrored for the left half.
 */
type Pt = [number, number];
type Shape = { muscle: Muscle | null; pts: Pt[] };

const FRONT: Shape[] = [
  { muscle: 'traps', pts: [[101, 60], [112, 64], [126, 71], [104, 72]] },
  { muscle: 'upper_chest', pts: [[102, 76], [125, 73], [133, 81], [103, 88]] },
  { muscle: 'chest', pts: [[102, 90], [133, 83], [137, 96], [129, 110], [103, 110]] },
  { muscle: 'front_delts', pts: [[128, 71], [139, 73], [144, 85], [138, 95], [135, 82]] },
  { muscle: 'side_delts', pts: [[141, 73], [150, 78], [154, 92], [146, 87]] },
  { muscle: 'biceps', pts: [[140, 98], [151, 95], [157, 119], [151, 134], [143, 128]] },
  { muscle: 'forearms', pts: [[143, 137], [153, 136], [161, 160], [159, 180], [151, 180], [145, 158]] },
  { muscle: 'abs', pts: [[102, 113], [117, 113], [117, 168], [110, 178], [102, 180]] },
  { muscle: 'obliques', pts: [[120, 113], [130, 113], [134, 140], [128, 170], [120, 166]] },
  { muscle: null, pts: [[102, 182], [119, 170], [129, 173], [132, 186], [104, 196]] }, // pelvis
  { muscle: 'adductors', pts: [[101, 194], [105, 198], [108, 232], [102, 244]] },
  { muscle: 'quads', pts: [[107, 198], [127, 186], [135, 202], [133, 248], [123, 262], [112, 257], [109, 232]] },
  { muscle: null, pts: [[112, 262], [131, 254], [131, 274], [115, 278]] }, // knee
  { muscle: 'calves', pts: [[115, 283], [129, 280], [131, 318], [123, 350], [116, 332]] },
  { muscle: null, pts: [[110, 284], [114, 284], [116, 336], [123, 354], [125, 382], [108, 386], [106, 350]] }, // shin + foot
];

const BACK: Shape[] = [
  { muscle: 'traps', pts: [[101, 58], [110, 62], [130, 73], [113, 90], [101, 112]] },
  { muscle: 'rear_delts', pts: [[131, 74], [145, 79], [148, 94], [136, 90]] },
  { muscle: 'side_delts', pts: [[146, 78], [154, 89], [149, 95]] },
  { muscle: 'upper_back', pts: [[104, 93], [114, 91], [133, 92], [128, 110], [105, 113]] },
  { muscle: 'lats', pts: [[104, 116], [130, 110], [138, 120], [131, 150], [111, 166], [104, 160]] },
  { muscle: null, pts: [[101, 162], [112, 168], [124, 166], [124, 176], [101, 178]] }, // lower back
  { muscle: 'triceps', pts: [[140, 97], [151, 94], [157, 121], [151, 134], [143, 127]] },
  { muscle: 'forearms', pts: [[143, 137], [153, 136], [161, 160], [159, 180], [151, 180], [145, 158]] },
  { muscle: 'glutes', pts: [[102, 180], [124, 172], [136, 191], [132, 212], [110, 217], [102, 209]] },
  { muscle: 'hamstrings', pts: [[104, 220], [131, 215], [133, 256], [123, 266], [111, 262], [106, 240]] },
  { muscle: null, pts: [[111, 266], [130, 260], [131, 276], [113, 278]] }, // knee pit
  { muscle: 'calves', pts: [[111, 281], [131, 279], [135, 310], [125, 342], [114, 328], [109, 302]] },
  { muscle: null, pts: [[114, 332], [125, 346], [125, 382], [108, 386], [108, 350]] }, // ankle + foot
];

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y]);
const toStr = (pts: Pt[]) => pts.map((p) => p.join(',')).join(' ');

interface Props {
  colorFor: (m: Muscle) => string;
  height?: number;
}

function Figure({ shapes, colorFor, height, label }: { shapes: Shape[]; colorFor: Props['colorFor']; height: number; label: string }) {
  const neutral = '#5A6078';
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 4, letterSpacing: 1 }}>{label}</Text>
      <Svg width={height / 2} height={height} viewBox="0 0 200 400">
        <Ellipse cx={100} cy={32} rx={17} ry={21} fill={neutral} />
        <Polygon points="92,50 108,50 110,62 90,62" fill={neutral} />
        <Ellipse cx={157} cy={192} rx={7} ry={11} fill={neutral} />
        <Ellipse cx={43} cy={192} rx={7} ry={11} fill={neutral} />
        {shapes.map((s, i) => {
          const fill = s.muscle ? colorFor(s.muscle) : neutral;
          return (
            <G key={i}>
              <Polygon points={toStr(s.pts)} fill={fill} stroke={colors.bg} strokeWidth={1.5} strokeLinejoin="round" />
              <Polygon points={toStr(mirror(s.pts))} fill={fill} stroke={colors.bg} strokeWidth={1.5} strokeLinejoin="round" />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export function BodyMap({ colorFor, height = 300 }: Props) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
      <Figure shapes={FRONT} colorFor={colorFor} height={height} label="FRONT" />
      <Figure shapes={BACK} colorFor={colorFor} height={height} label="BACK" />
    </View>
  );
}
