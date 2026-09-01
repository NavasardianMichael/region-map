import { type FC } from 'react';
import { BADGES, formatBadgePriceUsd } from '@regionify/shared';
import { Typography } from 'antd';
import { ROUTES } from '@/constants/routes';
import { LegalPageLayout } from '@/components/shared/LegalPageLayout';
import { LegalSection } from '@/components/shared/LegalSection';
import { AppNavLink } from '@/components/ui/AppNavLink';

const RefundPolicyPage: FC = () => (
  <LegalPageLayout title="Refund Policy" lastUpdated="September 1, 2026">
    <LegalSection heading="1. One-Time Purchases">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Regionify offers two paid tiers — Explorer ({formatBadgePriceUsd(BADGES.explorer)}) and
        Chronographer ({formatBadgePriceUsd(BADGES.chronographer)}) — each as a one-time, lifetime
        purchase. There are no subscriptions or recurring charges. Your access to the purchased tier
        does not expire.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="2. Refund Eligibility">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Because our products are digital goods delivered immediately upon purchase, we evaluate
        refund requests on a case-by-case basis. We are happy to issue a full refund if:
      </Typography.Paragraph>
      <ul className="list-disc pl-6 text-gray-600">
        <li>The request is made within 14 days of the original purchase date.</li>
        <li>
          The paid features (high-resolution export, animation export, public map page, or embed
          iframe) have not been actively used to produce or publish output.
        </li>
      </ul>
    </LegalSection>

    <LegalSection heading="3. Non-Refundable Cases">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Refunds will not be issued if:
      </Typography.Paragraph>
      <ul className="list-disc pl-6 text-gray-600">
        <li>More than 14 days have passed since the purchase date.</li>
        <li>
          The paid-tier features have demonstrably been used (e.g., exports downloaded, embed
          published) after the purchase.
        </li>
        <li>The request is for a duplicate purchase that was already refunded.</li>
      </ul>
    </LegalSection>

    <LegalSection heading="4. How to Request a Refund">
      <Typography.Paragraph className="mb-0! text-gray-600">
        To request a refund, please{' '}
        <AppNavLink to={ROUTES.CONTACT} className="font-semibold! underline!">
          contact us
        </AppNavLink>{' '}
        with the subject &ldquo;Refund Request&rdquo; and include the email address associated with
        your Regionify account and the approximate date of purchase. We aim to respond within 2
        business days.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="5. Processing">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Approved refunds are processed through Paddle, our payment processor. The refunded amount
        will be returned to your original payment method. Processing typically takes 5–10 business
        days, depending on your card issuer or bank.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="6. Contact">
      <Typography.Paragraph className="mb-0! text-gray-600">
        For any questions about this Refund Policy, please{' '}
        <AppNavLink to={ROUTES.CONTACT} className="font-semibold! underline!">
          contact us
        </AppNavLink>
        .
      </Typography.Paragraph>
    </LegalSection>
  </LegalPageLayout>
);

export default RefundPolicyPage;
