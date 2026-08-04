import { type FC } from 'react';
import { AppExpandableModal } from '@/components/shared/AppExpandableModal';
import { Body } from './Body';
import { Footer } from './Footer';
import { Title } from './Title';
import { useExportMapModal } from './useExportMapModal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export const ExportMapModal: FC<Props> = ({ open, onClose }) => {
  const state = useExportMapModal(open, onClose);
  const isCropStep = state.step === 2;
  const cropStepDisabled = state.isExporting || state.crop.isGeneratingPreview;

  // Crop footer grows to two rows while exporting (buttons + frame progress). The modal
  // container is capped at 95vh; reserve enough chrome height so the footer is not pushed
  // past the panel onto the mask.
  const bodyClassName = isCropStep
    ? 'scrollbar-thin max-h-[calc(95vh-200px)] min-h-0 overflow-y-auto px-md pb-md'
    : 'scrollbar-thin max-h-[calc(95vh-110px)] overflow-y-auto px-md';

  return (
    <AppExpandableModal
      destroyOnHidden
      fullscreenToggle
      title={<Title variant={isCropStep ? 'crop' : 'export'} />}
      open={open}
      onCancel={onClose}
      confirmLoading={state.isExporting}
      keyboard={!state.isExporting}
      closable={{ disabled: state.isExporting }}
      afterOpenChange={state.handleAfterOpenChange}
      footer={
        <Footer
          isCropStep={isCropStep}
          cropStepDisabled={cropStepDisabled}
          downloadDisabled={!state.crop.previewSrc}
          isExporting={state.isExporting}
          downloadLabel={state.downloadButtonLabel}
          exportProgress={state.progress}
          totalAnimationFrames={state.totalAnimationFrames}
          isAnimationFormat={state.isAnimationFormat}
          onBack={state.handleBack}
          onDownload={state.handleDownload}
        />
      }
      width={isCropStep ? 680 : 400}
      classNames={{
        container: 'max-h-[95vh]',
        body: bodyClassName,
      }}
    >
      <Body
        isCropStep={isCropStep}
        crop={state.crop}
        formProps={state}
        isExporting={state.isExporting}
      />
    </AppExpandableModal>
  );
};
