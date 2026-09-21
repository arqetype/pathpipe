import { extractResumeProfile } from './profile';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

/** A French engineering student's CV, of the shape an apprentice actually has. */
const FRENCH_CV = `
Clément Omnès
Élève ingénieur en informatique — CESI Rouen
Rouen, France · clement@example.com · +33 6 12 34 56 78

Expérience professionnelle
Développeur full-stack en alternance — Acme (2024 - présent)
Orchestration de LLM, API Java/Spring Boot, front React et TypeScript.
Développeur backend, stage — Beta Industries (2023 - 2023)
Conception d'une API REST et de sa base PostgreSQL.

Formation
CESI Rouen — Cycle ingénieur informatique (2022 - 2027)

Compétences
Java, Spring Boot, TypeScript, React, PostgreSQL, Docker, Git
`;

/** What LinkedIn's own "Save to PDF" produces, once the text is extracted. */
const LINKEDIN_PDF = `
Jane Doe
Senior Data Engineer at Northwind
Berlin, Germany

Top Skills
Python
Apache Spark
dbt

Experience
Northwind
Senior Data Engineer
January 2021 - Present
Berlin, Germany

Contoso
Data Engineer
2018 - 2021
Munich, Germany

Education
Technische Universität München
`;

describe('extractResumeProfile', () => {
  const french = extractResumeProfile(FRENCH_CV);
  const linkedin = extractResumeProfile(LINKEDIN_PDF);

  it('reads the roles somebody actually held', () => {
    expect(french.titles).toContain('Développeur full-stack en alternance');
    expect(linkedin.titles).toContain('Senior Data Engineer');
  });

  it('leaves schools out of the job titles', () => {
    expect(french.titles.join(' ')).not.toMatch(/CESI|ingénieur informatique/);
    expect(linkedin.titles.join(' ')).not.toMatch(/Technische/);
  });

  it('classifies the domain from the titles', () => {
    expect(french.domains).toContain(WorkDomain.FULLSTACK);
    expect(linkedin.domains).toContain(WorkDomain.DATA);
  });

  it('reads seniority from the title, and studies as an entry level', () => {
    expect(linkedin.seniorities).toContain(SeniorityLevel.SENIOR);
    expect(french.seniorities).toContain(SeniorityLevel.INTERN);
    expect(french.seniorities).toContain(SeniorityLevel.JUNIOR);
  });

  it('reads the contracts named in the document', () => {
    expect(french.employmentTypes).toContain(EmploymentType.APPRENTICESHIP);
    expect(french.employmentTypes).toContain(EmploymentType.INTERNSHIP);
  });

  it('reads the place, spelled the way offers spell it', () => {
    expect(french.cities).toContain('Rouen');
    expect(french.countries).toContain('FR');
    expect(linkedin.cities).toContain('Berlin');
    expect(linkedin.countries).toContain('DE');
  });

  it('does not read a phone number or an email as a place', () => {
    expect(french.cities.join(' ')).not.toMatch(/@|\d/);
  });

  it('counts the years the experience section covers', () => {
    expect(french.yearsOfExperience).toBeGreaterThanOrEqual(1);
    expect(linkedin.yearsOfExperience).toBeGreaterThanOrEqual(7);
  });

  it('keeps the skills it recognises', () => {
    expect(french.keywords).toEqual(
      expect.arrayContaining(['java', 'spring boot', 'react', 'typescript']),
    );
    expect(linkedin.keywords).toEqual(expect.arrayContaining(['python']));
  });

  it('returns empty rather than throwing on an empty CV', () => {
    expect(extractResumeProfile('   ').titles).toEqual([]);
  });
});
