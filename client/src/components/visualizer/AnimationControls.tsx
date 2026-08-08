import { type FC, startTransition, useCallback } from 'react';
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import { Button, Flex, Select, Slider, Switch, Typography } from 'antd';
import {
  selectIsPlaying,
  selectPause,
  selectSecondsPerPeriod,
  selectSetSecondsPerPeriod,
  selectSetTransitionType,
  selectTogglePlay,
  selectTransitionType,
} from '@/store/animation/selectors';
import { useAnimationStore } from '@/store/animation/store';
import {
  selectActiveTimePeriod,
  selectSetActiveTimePeriod,
  selectTimelineData,
  selectTimePeriods,
} from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import { useAnimationPlayback } from '@/hooks/useAnimationPlayback';

const SECONDS_PER_PERIOD_OPTIONS = [
  { value: 1, label: '1s' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

const AnimationControls: FC = () => {
  const timePeriods = useVisualizerStore(selectTimePeriods);
  const activeTimePeriod = useVisualizerStore(selectActiveTimePeriod);
  const timelineData = useVisualizerStore(selectTimelineData);
  const setActiveTimePeriod = useVisualizerStore(selectSetActiveTimePeriod);

  const isPlaying = useAnimationStore(selectIsPlaying);
  const secondsPerPeriod = useAnimationStore(selectSecondsPerPeriod);
  const transitionType = useAnimationStore(selectTransitionType);
  const togglePlay = useAnimationStore(selectTogglePlay);
  const pause = useAnimationStore(selectPause);
  const setSecondsPerPeriod = useAnimationStore(selectSetSecondsPerPeriod);
  const setTransitionType = useAnimationStore(selectSetTransitionType);

  useAnimationPlayback();

  const currentIndex = timePeriods.indexOf(activeTimePeriod ?? '');
  const isFirstPeriod = currentIndex <= 0;
  const isLastPeriod = currentIndex >= timePeriods.length - 1;

  const handleStepBackward = useCallback(() => {
    pause();
    startTransition(() => {
      if (currentIndex > 0) {
        setActiveTimePeriod(timePeriods[currentIndex - 1]);
      }
    });
  }, [currentIndex, timePeriods, setActiveTimePeriod, pause]);

  const handleStepForward = useCallback(() => {
    pause();
    startTransition(() => {
      if (currentIndex < timePeriods.length - 1) {
        setActiveTimePeriod(timePeriods[currentIndex + 1]);
      }
    });
  }, [currentIndex, timePeriods, setActiveTimePeriod, pause]);

  const handleSliderChange = useCallback(
    (value: number) => {
      pause();
      startTransition(() => {
        if (timePeriods[value]) {
          setActiveTimePeriod(timePeriods[value]);
        }
      });
    },
    [timePeriods, setActiveTimePeriod, pause],
  );

  const handleSecondsPerPeriodChange = useCallback(
    (value: number) => {
      setSecondsPerPeriod(value);
    },
    [setSecondsPerPeriod],
  );

  const handleTransitionToggle = useCallback(
    (checked: boolean) => {
      setTransitionType(checked ? 'smooth' : 'instant');
    },
    [setTransitionType],
  );

  const sliderMarks = timePeriods.reduce<Record<number, string>>((acc, period, index) => {
    if (
      index === 0 ||
      index === timePeriods.length - 1 ||
      timePeriods.length <= 10 ||
      (timePeriods.length > 10 && index % Math.ceil(timePeriods.length / 8) === 0)
    ) {
      acc[index] = period;
    }
    return acc;
  }, {});

  if (timePeriods.length < 2 || Object.keys(timelineData).length === 0) {
    return null;
  }

  return (
    <Flex vertical gap="small" className="p-md! rounded-lg border border-gray-200 bg-gray-50">
      <Flex align="center" justify="space-between" wrap="wrap" gap="small">
        <Flex align="center" gap="small">
          <Button
            type="text"
            icon={<StepBackwardOutlined />}
            onClick={handleStepBackward}
            disabled={isFirstPeriod}
            size="small"
            aria-label="Previous period"
          />
          <Button
            type="primary"
            shape="circle"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          />
          <Button
            type="text"
            icon={<StepForwardOutlined />}
            onClick={handleStepForward}
            disabled={isLastPeriod}
            size="small"
            aria-label="Next period"
          />
          <Typography.Text strong className="ms-2 text-sm">
            {activeTimePeriod ?? timePeriods[0]}
          </Typography.Text>
        </Flex>

        <Flex align="center" gap="middle">
          <Flex align="center" gap={4}>
            <Typography.Text className="text-xs text-gray-500">Seconds per period:</Typography.Text>
            <Select
              value={secondsPerPeriod}
              onChange={handleSecondsPerPeriodChange}
              options={SECONDS_PER_PERIOD_OPTIONS}
              size="small"
              className="w-18"
            />
          </Flex>
          <Flex align="center" gap={4}>
            <Typography.Text className="text-xs text-gray-500">Smooth:</Typography.Text>
            <Switch
              size="small"
              checked={transitionType === 'smooth'}
              onChange={handleTransitionToggle}
            />
          </Flex>
        </Flex>
      </Flex>

      <Slider
        min={0}
        max={timePeriods.length - 1}
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={handleSliderChange}
        marks={sliderMarks}
        tooltip={{
          formatter: (value: number | undefined) =>
            value !== undefined ? (timePeriods[value] ?? '') : '',
        }}
      />
    </Flex>
  );
};

export default AnimationControls;
