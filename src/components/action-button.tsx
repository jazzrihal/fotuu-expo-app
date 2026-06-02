import { ActivityIndicator, Pressable, Text } from 'react-native';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
};

const variantStyles = {
  primary: { bg: '#2563EB', bgPressed: '#1D4ED8', text: '#fff' },
  secondary: { bg: '#E5E7EB', bgPressed: '#D1D5DB', text: '#374151' },
  danger: { bg: '#FEE2E2', bgPressed: '#FECACA', text: '#B91C1C' },
} as const;

export function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  testID,
}: ActionButtonProps) {
  const colors = variantStyles[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.bgPressed : colors.bg,
        borderRadius: 8,
        borderCurve: 'continuous',
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: disabled || loading ? 0.6 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}
