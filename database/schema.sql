CREATE TABLE IF NOT EXISTS profiles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    current_title TEXT,
    years_experience NUMERIC,
    core_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    domains JSONB NOT NULL DEFAULT '[]'::jsonb,
    notable_projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
    seniority TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    ats TEXT NOT NULL CHECK (ats IN ('greenhouse', 'lever', 'ashby')),
    slug TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (ats, slug)
);

CREATE TABLE IF NOT EXISTS job_preferences (
    id BIGSERIAL PRIMARY KEY,

    include_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclude_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
    locations JSONB NOT NULL DEFAULT '[]'::jsonb,

    allow_remote BOOLEAN NOT NULL DEFAULT TRUE,
    max_age_days INTEGER NOT NULL DEFAULT 30,
    score_threshold NUMERIC NOT NULL DEFAULT 6.0,
    max_per_digest INTEGER NOT NULL DEFAULT 5,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,

    job_id TEXT NOT NULL UNIQUE,

    ats TEXT NOT NULL CHECK (ats IN ('greenhouse', 'lever', 'ashby')),
    company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,

    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    url TEXT NOT NULL,
    description TEXT,

    posted_at TIMESTAMPTZ,
    salary TEXT,

    score NUMERIC,
    reason TEXT,

    draft JSONB NOT NULL DEFAULT '{}'::jsonb,

    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    emailed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,

    job_id BIGINT NOT NULL UNIQUE
        REFERENCES jobs(id) ON DELETE CASCADE,

    applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_on TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company
    ON jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_jobs_score
    ON jobs(score);

CREATE INDEX IF NOT EXISTS idx_jobs_first_seen
    ON jobs(first_seen DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_posted_at
    ON jobs(posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_applied
    ON applications(applied);