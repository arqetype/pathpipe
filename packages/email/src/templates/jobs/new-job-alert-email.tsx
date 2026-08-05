import { Button, Section, Text } from "react-email";
import React from "react";
import { Layout } from "../../components/layout";

interface NewJobAlertEmailProps {
  userName: string;
  companyName: string;
  jobCount: number;
  jobs: Array<{ title: string; url: string; location?: string }>;
  appUrl?: string;
}

export function NewJobAlertEmail({
  userName,
  companyName,
  jobCount,
  jobs,
  appUrl,
}: NewJobAlertEmailProps) {
  const previewMessage = `${jobCount} new job${jobCount > 1 ? "s" : ""} at ${companyName}`;
  const baseUrl = (appUrl ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <Layout previewMessage={previewMessage} appUrl={baseUrl}>
      <Section className="text-left">
        <Text className="text-2xl font-heading font-bold text-foreground m-0">
          New jobs at {companyName}
        </Text>
        <Text className="text-base text-foreground mt-4 mb-0">
          Hi <span className="font-semibold">{userName}</span>, we found{" "}
          <span className="font-semibold">{jobCount}</span> new job
          {jobCount > 1 ? "s" : ""} at {companyName} that match your profile.
        </Text>
      </Section>

      <Section className="mt-6">
        {jobs.slice(0, 10).map((job, i) => (
          <Section key={i} className="mb-4 p-4 border border-solid border-border rounded-md">
            <Text className="text-base font-semibold text-foreground m-0">
              {job.title}
            </Text>
            {job.location && (
              <Text className="text-sm text-muted-foreground mt-1 m-0">
                {job.location}
              </Text>
            )}
            <Button
              href={job.url}
              className="bg-primary font-semibold px-4 py-2 text-sm text-center text-primary-foreground rounded-md mt-2 btn-preserve"
            >
              View job
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
      </Section>
    </Layout>
  );
}

NewJobAlertEmail.PreviewProps = {
  userName: "John Doe",
  companyName: "Acme Corp",
  jobCount: 3,
  jobs: [
    { title: "Senior Software Engineer", url: "https://example.com/job1", location: "Remote" },
    { title: "Full Stack Developer", url: "https://example.com/job2", location: "New York" },
    { title: "DevOps Engineer", url: "https://example.com/job3" },
  ],
};

export default NewJobAlertEmail;