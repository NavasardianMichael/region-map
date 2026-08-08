import { useEffect } from 'react';
import {
  selectIsPlaying,
  selectSecondsPerPeriod,
  selectTransitionType,
} from '@/store/animation/selectors';
import { useAnimationStore } from '@/store/animation/store';
import { selectTimePeriods } from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';

/**
 * Drives time-period advancement while `isPlaying`: instant jumps on an interval, or a
 * hold-then-rAF-blend cycle whose `playbackPreviewBlend` is read by MapViewer's `useMapSvg`
 * to interpolate region fills between periods. Shared by the in-app toolbar (AnimationControls)
 * and the public embed page's autoplay, since both need the same period-advancement loop.
 */
export function useAnimationPlayback(): void {
  const isPlaying = useAnimationStore(selectIsPlaying);
  const secondsPerPeriod = useAnimationStore(selectSecondsPerPeriod);
  const transitionType = useAnimationStore(selectTransitionType);
  const timePeriodsLength = useVisualizerStore((state) => selectTimePeriods(state).length);

  useEffect(() => {
    if (!isPlaying || timePeriodsLength < 2) return;

    if (transitionType === 'instant') {
      const intervalMs = secondsPerPeriod * 1000;
      const intervalId = setInterval(() => {
        const state = useVisualizerStore.getState();
        const currentPeriod = state.activeTimePeriod;
        const periods = state.timePeriods;
        const idx = periods.indexOf(currentPeriod ?? '');
        const nextIdx = idx >= periods.length - 1 ? 0 : idx + 1;
        state.setActiveTimePeriod(periods[nextIdx]);
      }, intervalMs);

      return () => {
        clearInterval(intervalId);
      };
    }

    const setBlend = useAnimationStore.getState().setPlaybackPreviewBlend;
    let cancelled = false;

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const runCycle = async () => {
      const periodMs = secondsPerPeriod * 1000;
      const blendMs = Math.min(900, Math.max(120, periodMs * 0.38));
      const holdMs = Math.max(40, periodMs - blendMs);

      while (!cancelled && useAnimationStore.getState().isPlaying) {
        const vs = useVisualizerStore.getState();
        const periods = vs.timePeriods;
        if (periods.length < 2) break;

        const current = vs.activeTimePeriod;
        const idx = periods.indexOf(current ?? '');
        if (idx < 0) break;

        const nextIdx = (idx + 1) % periods.length;
        const fromPeriod = periods[idx];
        const toPeriod = periods[nextIdx];
        const dataA = vs.timelineData[fromPeriod];
        const dataB = vs.timelineData[toPeriod];

        if (!dataA || !dataB) {
          vs.setActiveTimePeriod(toPeriod);
          await sleep(periodMs);
          continue;
        }

        await sleep(holdMs);
        if (cancelled || !useAnimationStore.getState().isPlaying) break;

        const start = performance.now();

        await new Promise<void>((resolve) => {
          const tick = () => {
            if (cancelled) {
              setBlend(null);
              resolve();
              return;
            }
            const elapsed = performance.now() - start;
            const linearT = Math.min(1, elapsed / blendMs);
            setBlend({ fromPeriod, toPeriod, t: linearT });
            if (linearT < 1) {
              requestAnimationFrame(tick);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(tick);
        });

        if (cancelled) break;

        useVisualizerStore.getState().setActiveTimePeriod(toPeriod);
        setBlend(null);

        if (!useAnimationStore.getState().isPlaying) break;
      }
    };

    void runCycle();

    return () => {
      cancelled = true;
      useAnimationStore.getState().setPlaybackPreviewBlend(null);
    };
  }, [isPlaying, secondsPerPeriod, timePeriodsLength, transitionType]);
}
