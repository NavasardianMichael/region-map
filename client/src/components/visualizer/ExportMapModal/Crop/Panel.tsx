import { type FC, lazy, Suspense } from 'react';
import { Flex, Spin } from 'antd';
import { type ExportCropState } from './useExportCrop';

const StepAsync = lazy(() => import('./Step').then((m) => ({ default: m.Step })));

type PanelProps = {
  crop: ExportCropState;
  isExporting: boolean;
};

export const Panel: FC<PanelProps> = ({ crop, isExporting }) => (
  <Suspense
    fallback={
      <Flex justify="center" align="center" className="h-80">
        <Spin size="large" />
      </Flex>
    }
  >
    <StepAsync crop={crop} isExporting={isExporting} />
  </Suspense>
);
