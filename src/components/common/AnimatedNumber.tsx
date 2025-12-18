import { useCountAnimation } from '../../hooks/useCountAnimation';
import { formatCurrency, formatAbbreviatedNumber } from '../../utils/formatting';

interface AnimatedNumberProps {
  value: number;
  format?: 'number' | 'currency' | 'percentage' | 'abbreviatedCurrency';
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = 'number',
  duration = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const animatedValue = useCountAnimation(value, {
    duration,
    format,
    decimals,
    startOnMount: true,
  });

  const formatValue = (val: number): string => {
    if (format === 'currency') {
      return formatCurrency(val);
    }
    if (format === 'abbreviatedCurrency') {
      return formatAbbreviatedNumber(val, true);
    }
    if (format === 'percentage') {
      return `${val.toFixed(decimals)}%`;
    }
    return val.toFixed(decimals);
  };

  const displayValue = formatValue(animatedValue);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

