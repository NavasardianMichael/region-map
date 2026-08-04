import { type FC } from 'react';
import { Panel } from './Crop/Panel';
import type { ExportCropState } from './Crop/useExportCrop';
import { Form } from './ExportOptions/Form';
import type { FormProps } from './useExportMapModal';

type BodyProps = {
  isCropStep: boolean;
  crop: ExportCropState;
  formProps: FormProps;
  isExporting: boolean;
};

export const Body: FC<BodyProps> = ({ isCropStep, crop, formProps, isExporting }) => {
  if (isCropStep) {
    return <Panel crop={crop} isExporting={isExporting} />;
  }
  return <Form {...formProps} />;
};
