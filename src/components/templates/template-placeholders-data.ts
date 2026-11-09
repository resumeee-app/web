/**
 * @file template-placeholders-data.ts
 * @description Catalog and metadata dictionary of application domain fields,
 * properties, and collections available in the Go template execution context.
 *
 * Scoped strictly to application domain fields (Profile, Experiences, Projects,
 * Skills, Education, Certifications). General Go template syntax is referenced
 * via external documentation links.
 */

export type PlaceholderCategory =
  | "all"
  | "profile"
  | "experience"
  | "projects"
  | "skills"
  | "education";

export interface PlaceholderItem {
  id: string;
  name: string;
  category: Exclude<PlaceholderCategory, "all">;
  type: string;
  description: string;
  snippet: string;
  example?: string;
}

export interface CategoryTab {
  id: PlaceholderCategory;
  label: string;
}

export const CATEGORY_TABS: CategoryTab[] = [
  { id: "all", label: "All Fields" },
  { id: "profile", label: "Profile & Contact" },
  { id: "experience", label: "Work Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education & Certs" },
];

export const GO_TEMPLATE_DOCS_URL = "https://pkg.go.dev/text/template";

export const TEMPLATE_PLACEHOLDERS: PlaceholderItem[] = [
  // ==========================================
  // PROFILE & ROOT PROPERTIES
  // ==========================================
  {
    id: "profile-fullname",
    name: ".FullName",
    category: "profile",
    type: "string",
    description: "Candidate's full name as defined in the main profile.",
    snippet: "{{.FullName}}",
    example: "Jane Doe",
  },
  {
    id: "profile-headline",
    name: ".Headline",
    category: "profile",
    type: "string",
    description: "Professional headline or target career positioning statement.",
    snippet: "{{.Headline}}",
    example: "Staff Software Engineer",
  },
  {
    id: "profile-email",
    name: ".Email",
    category: "profile",
    type: "string",
    description: "Primary contact email address.",
    snippet: "{{.Email}}",
    example: "jane.doe@example.com",
  },
  {
    id: "profile-phone",
    name: ".Phone",
    category: "profile",
    type: "string",
    description: "Primary contact telephone number.",
    snippet: "{{.Phone}}",
    example: "+1 (555) 234-5678",
  },
  {
    id: "profile-website",
    name: ".Website",
    category: "profile",
    type: "string",
    description: "Personal website, blog, or primary portfolio URL.",
    snippet: "{{.Website}}",
    example: "https://janedoe.dev",
  },
  {
    id: "profile-summary",
    name: ".Summary",
    category: "profile",
    type: "string",
    description: "Professional executive summary or tailored elevator pitch.",
    snippet: "{{.Summary}}",
    example: "Results-driven engineering leader with 10+ years of distributed systems experience...",
  },
  {
    id: "profile-location",
    name: ".Location",
    category: "profile",
    type: "Location",
    description: "Geographical location object containing .City, .Region, .CountryCode, .PostalCode, and .Address.",
    snippet: "{{.Location.City}}, {{.Location.Region}}",
    example: "San Francisco, CA",
  },
  {
    id: "profile-location-city",
    name: ".Location.City",
    category: "profile",
    type: "string",
    description: "City of residence or contact location.",
    snippet: "{{.Location.City}}",
    example: "San Francisco",
  },
  {
    id: "profile-location-region",
    name: ".Location.Region",
    category: "profile",
    type: "string",
    description: "State, province, or administrative region.",
    snippet: "{{.Location.Region}}",
    example: "CA",
  },
  {
    id: "profile-location-country",
    name: ".Location.CountryCode",
    category: "profile",
    type: "string",
    description: "Two-letter ISO country code.",
    snippet: "{{.Location.CountryCode}}",
    example: "US",
  },
  {
    id: "profile-location-postal",
    name: ".Location.PostalCode",
    category: "profile",
    type: "string",
    description: "Postal or ZIP code of the candidate.",
    snippet: "{{.Location.PostalCode}}",
    example: "94102",
  },
  {
    id: "profile-location-address",
    name: ".Location.Address",
    category: "profile",
    type: "string",
    description: "Street address line of the candidate.",
    snippet: "{{.Location.Address}}",
  },
  {
    id: "profile-profiles",
    name: ".Profiles",
    category: "profile",
    type: "[]SocialLink",
    description: "Collection of social links, code repositories, or professional networks (.Network, .Username, .URL).",
    snippet: '{{range .Profiles}}<a href="{{.URL}}">{{.Network}}</a>{{end}}',
    example: "GitHub, LinkedIn",
  },
  {
    id: "profile-cssstyles",
    name: ".CSSStyles",
    category: "profile",
    type: "template.CSS",
    description: "Injected CSS stylesheet defined in the template set.",
    snippet: "<style>{{.CSSStyles}}</style>",
  },
  {
    id: "profile-allskills",
    name: ".AllSkills",
    category: "profile",
    type: "[]string",
    description: "Method returning a flat, deduplicated list of all skills across all skill groups.",
    snippet: '{{join .AllSkills " • "}}',
    example: "Go • TypeScript • Kubernetes • Docker",
  },

  // ==========================================
  // WORK EXPERIENCES
  // ==========================================
  {
    id: "exp-collection",
    name: ".Experiences",
    category: "experience",
    type: "[]TailoredExperience",
    description: "Chronological slice of tailored career work experiences.",
    snippet: "{{range .Experiences}}...{{end}}",
  },
  {
    id: "exp-company",
    name: ".Company",
    category: "experience",
    type: "string",
    description: "Employer or organization name (within .Experiences iteration).",
    snippet: "{{.Company}}",
    example: "Acme Corp",
  },
  {
    id: "exp-role-title",
    name: ".RoleTitle",
    category: "experience",
    type: "string",
    description: "Job title or position held.",
    snippet: "{{.RoleTitle}}",
    example: "Senior Software Engineer",
  },
  {
    id: "exp-employment-type",
    name: ".EmploymentType",
    category: "experience",
    type: "string",
    description: "Employment category: 'Full-time', 'Part-time', 'Contract', or 'Internship'.",
    snippet: "{{.EmploymentType}}",
    example: "Full-time",
  },
  {
    id: "exp-start-date",
    name: ".StartDate",
    category: "experience",
    type: "Date",
    description: "Position start date.",
    snippet: '{{formatDate "Jan 2006" .StartDate}}',
    example: "Mar 2021",
  },
  {
    id: "exp-end-date",
    name: ".EndDate",
    category: "experience",
    type: "*Date",
    description: "Position end date (nil or empty if currently active).",
    snippet: '{{if .EndDate}}{{formatDate "Jan 2006" .EndDate}}{{else}}Present{{end}}',
    example: "Present",
  },
  {
    id: "exp-is-current",
    name: ".IsCurrent",
    category: "experience",
    type: "bool",
    description: "Boolean indicating whether this role is currently ongoing.",
    snippet: "{{if .IsCurrent}}Current{{end}}",
  },
  {
    id: "exp-location",
    name: ".Location",
    category: "experience",
    type: "Location",
    description: "Physical work or office location for this position.",
    snippet: "{{.Location.City}}, {{.Location.Region}}",
    example: "Austin, TX",
  },
  {
    id: "exp-company-location",
    name: ".CompanyLocation",
    category: "experience",
    type: "Location",
    description: "Corporate headquarters location of the employer.",
    snippet: "{{.CompanyLocation.City}}, {{.CompanyLocation.CountryCode}}",
    example: "New York, US",
  },
  {
    id: "exp-company-contact",
    name: ".CompanyContact",
    category: "experience",
    type: "*ContactDetail",
    description: "Employer contact endpoint (.Type, .Value) for employment verification.",
    snippet: "{{if .CompanyContact}}{{.CompanyContact.Value}}{{end}}",
    example: "hr@acmecorp.com",
  },
  {
    id: "exp-hours-per-week",
    name: ".HoursPerWeek",
    category: "experience",
    type: "*int",
    description: "Weekly work hours (useful for immigration CV templates).",
    snippet: "{{if .HoursPerWeek}}{{.HoursPerWeek}} hrs/wk{{end}}",
    example: "40 hrs/wk",
  },
  {
    id: "exp-supervisor-name",
    name: ".SupervisorName",
    category: "experience",
    type: "string",
    description: "Supervisor name for official employment records.",
    snippet: "{{.SupervisorName}}",
  },
  {
    id: "exp-supervisor-contact",
    name: ".SupervisorContact",
    category: "experience",
    type: "string",
    description: "Direct supervisor contact email or phone number.",
    snippet: "{{.SupervisorContact}}",
    example: "supervisor@acmecorp.com",
  },
  {
    id: "exp-duties-summary",
    name: ".DutiesSummary",
    category: "experience",
    type: "string",
    description: "High-level summary of responsibilities and scope.",
    snippet: "{{.DutiesSummary}}",
  },
  {
    id: "exp-bullets",
    name: ".Bullets",
    category: "experience",
    type: "[]TailoredBullet",
    description: "Slice of tailored achievement bullet points (.Text). Alias: .BulletPoints.",
    snippet: "{{range .Bullets}}<li>{{.Text}}</li>{{end}}",
  },
  {
    id: "exp-bullet-text",
    name: ".Text",
    category: "experience",
    type: "string",
    description: "Accomplishment bullet point text (within .Bullets iteration).",
    snippet: "{{.Text}}",
  },

  // ==========================================
  // PROJECTS
  // ==========================================
  {
    id: "proj-collection",
    name: ".Projects",
    category: "projects",
    type: "[]TailoredProject",
    description: "Slice of key software, technical, or personal projects.",
    snippet: "{{range .Projects}}...{{end}}",
  },
  {
    id: "proj-name",
    name: ".Name",
    category: "projects",
    type: "string",
    description: "Project title or repository name.",
    snippet: "{{.Name}}",
    example: "Distributed Task Scheduler",
  },
  {
    id: "proj-role",
    name: ".Role",
    category: "projects",
    type: "string",
    description: "Role or capacity in the project (e.g. 'Creator & Lead Maintainer').",
    snippet: "{{.Role}}",
  },
  {
    id: "proj-url",
    name: ".URL",
    category: "projects",
    type: "string",
    description: "Direct web link, live demo, or repository URL.",
    snippet: '{{if .URL}}<a href="{{.URL}}">{{.URL}}</a>{{end}}',
  },
  {
    id: "proj-summary",
    name: ".Summary",
    category: "projects",
    type: "string",
    description: "Brief summary of project objectives and architecture.",
    snippet: "{{.Summary}}",
  },
  {
    id: "proj-bullets",
    name: ".Bullets",
    category: "projects",
    type: "[]TailoredBullet",
    description: "Project accomplishment bullets (.Text). Alias: .BulletPoints.",
    snippet: "{{range .Bullets}}<li>{{.Text}}</li>{{end}}",
  },

  // ==========================================
  // SKILLS
  // ==========================================
  {
    id: "skills-groups",
    name: ".SkillGroups",
    category: "skills",
    type: "[]TailoredSkillGroup",
    description: "Array of categorized skill groups (.Category, .Skills).",
    snippet: "{{range .SkillGroups}}...{{end}}",
  },
  {
    id: "skills-category",
    name: ".Category",
    category: "skills",
    type: "string",
    description: "Name of the skill category (within .SkillGroups iteration).",
    snippet: "{{.Category}}",
    example: "Languages & Frameworks",
  },
  {
    id: "skills-list",
    name: ".Skills",
    category: "skills",
    type: "[]string",
    description: "Array of skill strings belonging to this group.",
    snippet: '{{join .Skills ", "}}',
    example: "Go, React, PostgreSQL",
  },

  // ==========================================
  // EDUCATION & CERTIFICATIONS
  // ==========================================
  {
    id: "edu-collection",
    name: ".Education",
    category: "education",
    type: "[]TailoredEducation",
    description: "Array of academic credentials and degrees.",
    snippet: "{{range .Education}}...{{end}}",
  },
  {
    id: "edu-institution",
    name: ".Institution",
    category: "education",
    type: "string",
    description: "University, college, or academic institution name.",
    snippet: "{{.Institution}}",
    example: "University of California, Berkeley",
  },
  {
    id: "edu-degree",
    name: ".Degree",
    category: "education",
    type: "string",
    description: "Degree awarded (e.g. 'B.S.', 'M.S.', 'Ph.D.').",
    snippet: "{{.Degree}}",
    example: "Bachelor of Science",
  },
  {
    id: "edu-field",
    name: ".Field",
    category: "education",
    type: "string",
    description: "Field of study or academic major.",
    snippet: "{{.Field}}",
    example: "Computer Science",
  },
  {
    id: "edu-start-date",
    name: ".StartDate",
    category: "education",
    type: "*Date",
    description: "Academic enrollment or study start date.",
    snippet: '{{if .StartDate}}{{formatDate "2006" .StartDate}}{{end}}',
    example: "2018",
  },
  {
    id: "edu-end-date",
    name: ".EndDate",
    category: "education",
    type: "*Date",
    description: "Degree completion or graduation date.",
    snippet: '{{if .EndDate}}{{formatDate "2006" .EndDate}}{{end}}',
    example: "2022",
  },
  {
    id: "edu-score",
    name: ".Score",
    category: "education",
    type: "string",
    description: "GPA, honors, or academic performance grade.",
    snippet: "{{if .Score}}GPA: {{.Score}}{{end}}",
    example: "3.9 / 4.0",
  },
  {
    id: "cert-collection",
    name: ".Certifications",
    category: "education",
    type: "[]TailoredCert",
    description: "Array of professional licenses and certificates.",
    snippet: "{{range .Certifications}}...{{end}}",
  },
  {
    id: "cert-name",
    name: ".Name",
    category: "education",
    type: "string",
    description: "Certification title or license name.",
    snippet: "{{.Name}}",
    example: "AWS Certified Solutions Architect",
  },
  {
    id: "cert-issuer",
    name: ".Issuer",
    category: "education",
    type: "string",
    description: "Issuing organization or certification body.",
    snippet: "{{.Issuer}}",
    example: "Amazon Web Services",
  },
  {
    id: "cert-date",
    name: ".Date",
    category: "education",
    type: "*Date",
    description: "Issuance or certification date.",
    snippet: '{{if .Date}}{{formatDate "Jan 2006" .Date}}{{end}}',
    example: "Nov 2023",
  },
  {
    id: "cert-url",
    name: ".URL",
    category: "education",
    type: "string",
    description: "Verification link or digital credential URL.",
    snippet: '{{if .URL}}<a href="{{.URL}}">Verify Certificate</a>{{end}}',
    example: "https://www.credly.com/badges/...",
  },
];
