import { Button, Section, Text } from 'react-email';
import React from 'react';
import { Layout } from '../../components/layout';

interface JobAlertOffer {
  title: string;
  url: string;
  companyName: string;
  location?: string;
  /** 0–100 against the recipient's profile. */
  matchScore?: number;
}

interface NewJobAlertEmailProps {
  userName: string;
  jobCount: number;
  jobs: JobAlertOffer[];
  appUrl?: string;
}

/**
 * The digest of offers that matched a user's profile since the last one.
 *
 * Grouped by nothing and sorted by fit: the user asked to hear about roles that
 * suit them, not about a company they once ticked, so the company is a detail
 * on the offer rather than the subject of the email.
 */
export function NewJobAlertEmail({
  userName,
  jobCount,
  jobs,
  appUrl,
}: NewJobAlertEmailProps) {
  const previewMessage = `${jobCount} new offer${jobCount > 1 ? 's' : ''} matching your profile`;
  const baseUrl = (appUrl ?? 'http://localhost:3000').replace(/\/$/, '');

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          {jobCount} new offer{jobCount > 1 ? 's' : ''} for you
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{userName}</span>, these came in
          since we last wrote and match what you told us you are looking for.
        </Text>
      </Section>

      <Section className="mt-6">
        {jobs.slice(0, 10).map((job, i) => (
          <Section
            key={i}
            className="mb-4 p-4 border border-solid border-border rounded-md"
          >
            <Text className="text-base font-semibold text-foreground m-0">
              {job.title}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1 m-0">
              {job.companyName}
              {job.location ? ` · ${job.location}` : ''}
              {typeof job.matchScore === 'number'
                ? ` · ${job.matchScore}% match`
                : ''}
            </Text>
            <Button
              href={job.url}
              className="bg-primary font-semibold px-4 py-2 text-sm text-center text-primary-foreground rounded-md mt-2 btn-preserve"
            >
              View offer
            </Button>
          </Section>
        ))}
      </Section>

      <Section className="mt-6 text-left">
        <Button
          href={`${baseUrl}/app/job-matches`}
          className="bg-primary font-semibold px-8 py-3 text-base text-center text-primary-foreground rounded-md btn-preserve"
        >
          View all matches
        </Button>
        <Text className="text-xs text-muted-foreground mt-4 mb-0">
          Change what you hear about in your job profile settings.
        </Text>
      </Section>
    </Layout>
  );
}

NewJobAlertEmail.PreviewProps = {
  userName: 'John Doe',
  jobCount: 3,
  jobs: [
    {
      title: 'Software Engineering Intern',
      url: 'https://example.com/job1',
      companyName: 'Acme Corp',
      location: 'Paris, FR',
      matchScore: 92,
    },
    {
      title: 'Full Stack Developer',
      url: 'https://example.com/job2',
      companyName: 'Globex',
      location: 'Remote',
      matchScore: 78,
    },
    {
      title: 'DevOps Engineer',
      url: 'https://example.com/job3',
      companyName: 'Initech',
    },
  ],
};

export default NewJobAlertEmail;
