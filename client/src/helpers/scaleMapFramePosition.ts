import type { LegendFrameSize } from '@/store/legendStyles/types';

type AnchoredElementSize = { width: number; height: number };

/**
 * Maps an author-time pixel position (relative to the saved map frame size) to the
 * current map frame size — used both for the floating legend's saved coordinates and
 * for the map's own pan offset, since both are authored in the Studio and later
 * rendered into a differently sized/shaped embed frame. Returns null when scaling is
 * not possible.
 *
 * When the anchored element's size is known, scaling is applied in the available
 * movement space (`frame - element`) to preserve edge alignment (e.g. bottom-right
 * stays bottom-right). Omit it for positions with no size of their own (e.g. pan).
 */
export function scaleMapFramePosition(
  position: { x: number; y: number },
  refFrame: LegendFrameSize | null,
  currentFrame: LegendFrameSize,
  legendSize?: AnchoredElementSize | null,
): { x: number; y: number } | null {
  if (refFrame == null) {
    return null;
  }
  if (
    refFrame.width <= 0 ||
    refFrame.height <= 0 ||
    currentFrame.width <= 0 ||
    currentFrame.height <= 0
  ) {
    return null;
  }

  if (
    legendSize != null &&
    legendSize.width > 0 &&
    legendSize.height > 0 &&
    refFrame.width > legendSize.width &&
    refFrame.height > legendSize.height &&
    currentFrame.width > legendSize.width &&
    currentFrame.height > legendSize.height
  ) {
    const refAvailableWidth = refFrame.width - legendSize.width;
    const refAvailableHeight = refFrame.height - legendSize.height;
    const currentAvailableWidth = currentFrame.width - legendSize.width;
    const currentAvailableHeight = currentFrame.height - legendSize.height;

    const normalizedX = Math.min(1, Math.max(0, position.x / refAvailableWidth));
    const normalizedY = Math.min(1, Math.max(0, position.y / refAvailableHeight));

    return {
      x: Math.round(normalizedX * currentAvailableWidth),
      y: Math.round(normalizedY * currentAvailableHeight),
    };
  }

  return {
    x: Math.round((position.x * currentFrame.width) / refFrame.width),
    y: Math.round((position.y * currentFrame.height) / refFrame.height),
  };
}
