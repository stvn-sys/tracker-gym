import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Icon, type IconName } from './Icon';

/** Rounded group of rows with hairline separators (iOS-style grouped list). */
export function Group({ children, title, footer }: { children: ReactNode; title?: string; footer?: string }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      {title && <Text style={{ color: colors.textDim, fontSize: 13, fontWeight: '600', marginLeft: 16, letterSpacing: 0.4 }}>{title.toUpperCase()}</Text>}
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' }}>
        {items.map((c, i) => (
          <View key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 16 }} />}
            {c}
          </View>
        ))}
      </View>
      {footer && <Text style={{ color: colors.textDim, fontSize: 13, marginHorizontal: 16, lineHeight: 18 }}>{footer}</Text>}
    </View>
  );
}

export function IconTile({ name, color, size = 34 }: { name: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.58} color="#fff" />
    </View>
  );
}

/** Navigation row: icon tile, label, current value, chevron. */
export function NavRow({ icon, tile, label, value, onPress }: { icon?: IconName; tile?: string; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })}>
      {icon && tile && <IconTile name={icon} color={tile} />}
      <Text style={{ color: colors.text, fontSize: 17, flexShrink: 0 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: colors.textDim, fontSize: 15, flex: 1, textAlign: 'right' }} numberOfLines={1}>{value ?? ''}</Text>
      <Icon name="chevron" size={18} color={colors.textDim} />
    </Pressable>
  );
}

export function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 17 }}>{label}</Text>
        {sub && <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 2 }}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceAlt }} thumbColor="#fff"
        {...({ activeThumbColor: '#fff' } as object)} />
    </View>
  );
}

/** A row with a segmented control on the right. */
export function ChoiceRow<T extends string | number>({ label, options, value, onChange }: { label: string; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 17 }}>{label}</Text>
      <Segmented options={options} value={value} onChange={onChange} />
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: on ? colors.accent : 'transparent' }}>
            <Text style={{ color: on ? '#0B0B0D' : colors.text, fontWeight: '700', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Hour:minute picker with steppers (15-minute steps). */
export function TimeRow({ label, hour, minute, onChange }: { label: string; hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  const shift = (mins: number) => {
    const t = (hour * 60 + minute + mins + 1440) % 1440;
    onChange(Math.floor(t / 60), t % 60);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>{label}</Text>
      <Step label="−" onPress={() => shift(-15)} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', width: 56, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
      </Text>
      <Step label="+" onPress={() => shift(15)} />
    </View>
  );
}

export function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
