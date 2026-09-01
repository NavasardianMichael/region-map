import { type FC } from 'react';
import { Typography } from 'antd';

type BodyProps = {
  content: string;
  'data-i18n-key'?: string;
};

export const Body: FC<BodyProps> = ({ content, 'data-i18n-key': dataI18nKey }) => (
  <Typography.Paragraph className="mb-0!" data-i18n-key={dataI18nKey}>
    {content}
  </Typography.Paragraph>
);
