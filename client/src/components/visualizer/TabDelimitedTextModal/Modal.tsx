import { type FC, useCallback, useEffect, useState } from 'react';
import {
  selectData,
  selectSetVisualizerState,
  selectTimelineData,
  selectTimePeriods,
} from '@/store/mapData/selectors';
import { useVisualizerStore } from '@/store/mapData/store';
import { IMPORT_DATA_TYPES } from '@/constants/data';
import { useTypedTranslation } from '@/i18n/useTypedTranslation';
import { commitParsedImport } from '@/helpers/commitParsedImport';
import { parseCSV } from '@/helpers/importDataParsers';
import { serializeToTabDelimited } from '@/helpers/manualDataEntryHelpers';
import { AppExpandableModal } from '@/components/shared/AppExpandableModal';
import { useAppFeedback } from '@/components/shared/useAppFeedback';
import { showMessageWithClose } from '@/components/visualizer/ImportDataPanel/importDataPanelUtils';
import { Body } from './Body';
import { Footer } from './Footer';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  mapRegionIds: string[];
  historicalDataImport: boolean;
};

export const TabDelimitedTextModal: FC<Props> = ({
  open,
  onClose,
  onSave,
  mapRegionIds,
  historicalDataImport,
}) => {
  const { t } = useTypedTranslation();
  const { message: messageApi } = useAppFeedback();

  const data = useVisualizerStore(selectData);
  const timelineData = useVisualizerStore(selectTimelineData);
  const timePeriods = useVisualizerStore(selectTimePeriods);
  const setVisualizerState = useVisualizerStore(selectSetVisualizerState);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(serializeToTabDelimited(data, timelineData, timePeriods));
    setError(null);
    setSaving(false);
  }, [open, data, timelineData, timePeriods]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    setError((prev) => (prev != null ? null : prev));
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t('visualizer.tabDelimitedModal.pasteFormatError'));
      return;
    }

    setSaving(true);
    // Yield a paint before the synchronous parse + match work below, so the
    // spinner actually shows instead of being batched away with setSaving(false).
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = parseCSV(trimmed);
      if (typeof result === 'object' && 'error' in result) {
        setError(t('visualizer.tabDelimitedModal.pasteMissingId'));
        return;
      }
      if (result.length === 0) {
        setError(t('visualizer.tabDelimitedModal.pasteFormatError'));
        return;
      }

      const outcome = commitParsedImport(result, mapRegionIds, historicalDataImport);
      if (!outcome.ok) {
        setError(t('visualizer.tabDelimitedModal.pasteFormatError'));
        return;
      }

      if (outcome.variant === 'timeline') {
        showMessageWithClose(
          messageApi,
          'success',
          t('messages.importedRowsPeriods', {
            count: outcome.rowCount,
            periods: outcome.periodCount,
          }),
        );
      } else {
        if (outcome.sideEffect === 'info_time_on_observer') {
          showMessageWithClose(
            messageApi,
            'info',
            t('messages.timeSeriesDetected', { badgeName: t('badges.items.chronographer.name') }),
          );
        }
        if (outcome.sideEffect === 'warn_no_time_chronographer') {
          showMessageWithClose(messageApi, 'warning', t('messages.noTimeColumnDetected'));
        }
        showMessageWithClose(
          messageApi,
          'success',
          t('messages.importedRegions', { count: outcome.rowCount }),
        );
      }

      setVisualizerState({ importDataType: IMPORT_DATA_TYPES.tabDelimited });
      onSave?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [
    text,
    mapRegionIds,
    historicalDataImport,
    messageApi,
    setVisualizerState,
    onSave,
    onClose,
    t,
  ]);

  return (
    <AppExpandableModal
      destroyOnHidden
      fullscreenToggle
      fillBody
      title={t('visualizer.tabDelimitedModal.title')}
      open={open}
      onCancel={onClose}
      closable
      className="w-4/5! max-w-250! lg:w-2/3!"
      footer={
        <Footer
          cancelLabel={t('nav.cancel')}
          saveLabel={t('visualizer.save')}
          saving={saving}
          onCancel={onClose}
          onSave={handleSave}
        />
      }
      focusable={{ trap: false }}
      data-i18n-key="visualizer.tabDelimitedModal.title"
    >
      <Body
        text={text}
        placeholder={t('visualizer.tabDelimitedModal.placeholder')}
        error={error}
        onTextChange={handleTextChange}
        data-i18n-key="visualizer.tabDelimitedModal.placeholder"
      />
    </AppExpandableModal>
  );
};
