import { type FC } from 'react';
import { Alert, Typography } from 'antd';

/**
 * antd renders the icon on the leading side; reversing the flex row moves it to the trailing
 * side, and the icon's `margin-inline-end` has to move with it to keep the gap on the text side.
 */
const TRAILING_ICON_CLASS_NAMES = {
  root: 'flex-row-reverse',
  icon: 'me-0! ms-sm!',
};

type NoticeAlertProps = {
  type: 'info' | 'warning';
  title: string;
  titleI18nKey: string;
  description: string;
  descriptionI18nKey: string;
};

/** Titled alert with a trailing icon, used for the explanatory notices inside project modals. */
export const NoticeAlert: FC<NoticeAlertProps> = ({
  type,
  title,
  titleI18nKey,
  description,
  descriptionI18nKey,
}) => (
  <Alert
    type={type}
    showIcon
    classNames={TRAILING_ICON_CLASS_NAMES}
    title={
      <Typography.Text strong className="text-sm" data-i18n-key={titleI18nKey}>
        {title}
      </Typography.Text>
    }
    description={
      <Typography.Text className="text-sm leading-snug" data-i18n-key={descriptionI18nKey}>
        {description}
      </Typography.Text>
    }
  />
);
