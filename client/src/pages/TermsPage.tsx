import { type FC } from 'react';
import { BADGES, formatBadgePriceUsd } from '@regionify/shared';
import { Typography } from 'antd';
import { ROUTES } from '@/constants/routes';
import { LegalPageLayout } from '@/components/shared/LegalPageLayout';
import { LegalSection } from '@/components/shared/LegalSection';
import { AppNavLink } from '@/components/ui/AppNavLink';

const TermsPage: FC = () => (
  <LegalPageLayout title="Terms of Service" lastUpdated="September 1, 2026">
    <LegalSection heading="1. Acceptance of Terms">
      <Typography.Paragraph className="mb-0! text-gray-600">
        By accessing or using Regionify (&ldquo;the Service&rdquo;), you agree to be bound by these
        Terms of Service. If you do not agree, please do not use the Service.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="2. Description of Service">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Regionify is a web-based tool that allows users to create choropleth maps from their own
        data. Features include importing data from spreadsheets, customizing map styles, exporting
        maps as image files, and — for eligible tiers — embedding live maps on external websites.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="3. User Accounts">
      <Typography.Paragraph className="mb-0! text-gray-600">
        You must register for an account to save projects and access paid features. You are
        responsible for maintaining the confidentiality of your credentials and for all activity
        that occurs under your account. You must provide accurate information and keep it up to
        date. Regionify reserves the right to suspend or terminate accounts that violate these
        Terms.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="4. Acceptable Use">
      <Typography.Paragraph className="mb-0! text-gray-600">
        You agree not to use the Service to:
      </Typography.Paragraph>
      <ul className="list-disc pl-6 text-gray-600">
        <li>Violate any applicable law or regulation.</li>
        <li>Upload or transmit malicious code or harmful content.</li>
        <li>
          Attempt to gain unauthorized access to Regionify&apos;s systems or other users&apos;
          accounts.
        </li>
        <li>
          Reverse-engineer, decompile, or scrape the Service in a way that places unreasonable load
          on our infrastructure.
        </li>
        <li>Resell or sublicense access to the Service without our written consent.</li>
      </ul>
    </LegalSection>

    <LegalSection heading="5. Intellectual Property">
      <Typography.Paragraph className="mb-0! text-gray-600">
        You retain ownership of the data you upload to Regionify. By uploading data, you grant
        Regionify a limited license to process and store it solely to provide the Service to you.
        The Regionify platform, software, design, and all associated intellectual property remain
        the exclusive property of Regionify. Nothing in these Terms transfers any ownership of
        Regionify&apos;s IP to you.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="6. Payments">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Certain features require a one-time purchase of a paid tier (Explorer at{' '}
        {formatBadgePriceUsd(BADGES.explorer)} or Chronographer at{' '}
        {formatBadgePriceUsd(BADGES.chronographer)}). Payments are processed securely by Paddle, our
        authorized payment processor. Once purchased, access to the paid tier is lifetime — there
        are no recurring charges. Paddle&apos;s terms of service govern the payment transaction
        itself. For our refund terms, see our{' '}
        <AppNavLink to={ROUTES.REFUND_POLICY} className="font-semibold! underline!">
          Refund Policy
        </AppNavLink>
        .
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="7. Termination">
      <Typography.Paragraph className="mb-0! text-gray-600">
        You may delete your account at any time from your account settings. Regionify reserves the
        right to suspend or terminate your account at any time if you breach these Terms, with or
        without notice. Upon termination, your right to use the Service ceases immediately.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="8. Disclaimer of Warranties">
      <Typography.Paragraph className="mb-0! text-gray-600">
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
        any kind, either express or implied. Regionify does not warrant that the Service will be
        uninterrupted, error-free, or free of viruses or other harmful components.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="9. Limitation of Liability">
      <Typography.Paragraph className="mb-0! text-gray-600">
        To the fullest extent permitted by applicable law, Regionify shall not be liable for any
        indirect, incidental, special, consequential, or punitive damages arising from your use of
        or inability to use the Service. Our total liability for any claim arising from these Terms
        shall not exceed the amount you paid to Regionify in the twelve months preceding the claim.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="10. Changes to These Terms">
      <Typography.Paragraph className="mb-0! text-gray-600">
        Regionify may update these Terms from time to time. We will post the revised version at this
        URL with a new &quot;Last updated&quot; date. Your continued use of the Service after the
        date of the update constitutes acceptance of the revised Terms.
      </Typography.Paragraph>
    </LegalSection>

    <LegalSection heading="11. Contact">
      <Typography.Paragraph className="mb-0! text-gray-600">
        If you have questions about these Terms, please{' '}
        <AppNavLink to={ROUTES.CONTACT} className="font-semibold! underline!">
          contact us
        </AppNavLink>
        .
      </Typography.Paragraph>
    </LegalSection>
  </LegalPageLayout>
);

export default TermsPage;
