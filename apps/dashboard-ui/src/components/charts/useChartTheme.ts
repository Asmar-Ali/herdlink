import { useEffect, useState } from 'react';

/*
 * Recharts needs concrete color strings, not `var(--…)` (var() isn't reliable in
 * SVG presentation attributes). This reads the resolved values off :root and
 * re-reads them when the OS colour scheme flips, so charts stay theme-correct.
 */

const VARS = {
  series1: '--series-1',
  series2: '--series-2',
  series3: '--series-3',
  series4: '--series-4',
  good: '--status-good',
  warning: '--status-warning',
  serious: '--status-serious',
  critical: '--status-critical',
  neutral: '--status-neutral',
  grid: '--chart-grid',
  axis: '--chart-axis',
  ink: '--chart-ink',
  surface: '--surface',
  border: '--border',
} as const;

export type ChartTheme = Record<keyof typeof VARS, string>;

function read(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  const out = {} as ChartTheme;
  (Object.keys(VARS) as (keyof typeof VARS)[]).forEach((key) => {
    out[key] = styles.getPropertyValue(VARS[key]).trim();
  });
  return out;
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(read);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(read());
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return theme;
}
