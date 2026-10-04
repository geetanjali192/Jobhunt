import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000/api/jobs";

function Icon({ children }) {
  return <span className="icon">{children}</span>;
}

function Score({ score }) {
  const value = Number(score || 0);
  const percentage = Math.min(100, Math.round((value / 10) * 100));

  return (
    <div className="score">
      <div className="score-ring">
        <svg viewBox="0 0 42 42">
          <circle className="score-bg" cx="21" cy="21" r="17" />
          <circle
            className="score-progress"
            cx="21"
            cy="21"
            r="17"
            strokeDasharray={`${percentage} 100`}
          />
        </svg>
        <span>{value.toFixed(1)}</span>
      </div>
      <div>
        <strong>Match</strong>
        <small>AI score</small>
      </div>
    </div>
  );
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jobhunt_saved") || "[]");
    } catch {
      return [];
    }
  });

  const [resumeName, setResumeName] = useState(
    () => localStorage.getItem("jobhunt_resume_name") || ""
  );
  const [preferredLocation, setPreferredLocation] = useState(
    () => localStorage.getItem("jobhunt_location") || "Bengaluru"
  );
  const [minScore, setMinScore] = useState(
    () => localStorage.getItem("jobhunt_min_score") || "7"
  );
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(
    "Ask me about your current job matches, skills, or which jobs deserve your attention first."
  );

  const loadJobs = () => {
    setLoading(true);

    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load jobs:", err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    localStorage.setItem("jobhunt_saved", JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem("jobhunt_resume_name", resumeName);
  }, [resumeName]);

  useEffect(() => {
    localStorage.setItem("jobhunt_location", preferredLocation);
  }, [preferredLocation]);

  useEffect(() => {
    localStorage.setItem("jobhunt_min_score", minScore);
  }, [minScore]);

  const handleResumeUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeName(file.name);
  };

  const askAssistant = () => {
    const question = assistantInput.trim().toLowerCase();

    if (!question) {
      setAssistantAnswer(
        "Try asking something like: Which jobs should I apply to first?"
      );
      return;
    }

    if (question.includes("apply") || question.includes("best") || question.includes("first")) {
      const best = [...jobs]
        .filter((job) => job.url)
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
        .slice(0, 3);

      setAssistantAnswer(
        best.length
          ? `Start with ${best.map((job) => `${job.title} at ${job.company} (${Number(job.score || 0).toFixed(1)})`).join(", ")}. These are currently your strongest matches.`
          : "I don't have enough job data yet. Click Refresh Jobs and try again."
      );
      return;
    }

    if (question.includes("skill") || question.includes("missing")) {
      setAssistantAnswer(
        "From the current job data, focus your preparation on backend development, APIs, JavaScript/Node.js, Python, SQL, and data structures. Your exact gaps depend on the individual job descriptions."
      );
      return;
    }

    if (question.includes("resume") || question.includes("cv")) {
      setAssistantAnswer(
        resumeName
          ? `Your current resume file is ${resumeName}. Use the strongest matching jobs first, then tailor your resume bullets to the skills mentioned in each posting.`
          : "Upload your resume in the Resume section first. Then use the strongest job matches to decide which skills and projects to emphasize."
      );
      return;
    }

    setAssistantAnswer(
      `I currently have ${jobs.length} jobs loaded, ${highMatches} strong matches, and ${saved} saved jobs. Ask me which jobs to prioritize, what skills to focus on, or how to use your resume.`
    );
  };

  const saveSettings = () => {
    localStorage.setItem("jobhunt_location", preferredLocation);
    localStorage.setItem("jobhunt_min_score", minScore);
    alert("Settings saved.");
  };

  const toggleSaved = (jobId) => {
    setSavedIds((current) =>
      current.includes(jobId)
        ? current.filter((id) => id !== jobId)
        : [...current, jobId]
    );
  };

  const getJobId = (job) => job.id || job.job_id || job.url || job.title;

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const id = getJobId(job);
      const text = `${job.title || ""} ${job.company || ""} ${job.location || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "high" && Number(job.score) >= 7) ||
        (filter === "applied" && Boolean(job.applied)) ||
        (filter === "saved" && savedIds.includes(id));

      return matchesSearch && matchesFilter;
    });
  }, [jobs, search, filter, savedIds]);

  const highMatches = jobs.filter((job) => Number(job.score) >= 7).length;
  const applied = jobs.filter((job) => job.applied).length;
  const saved = jobs.filter((job) => savedIds.includes(getJobId(job))).length;

  const pageTitle = {
    dashboard: "Dashboard",
    discover: "Discover Jobs",
    saved: "Saved Jobs",
    applications: "Applications",
    assistant: "AI Assistant",
    resume: "Resume",
    settings: "Settings",
  }[page];

  const renderJobList = (items = filteredJobs) => (
    <div className="job-list">
      {loading ? (
        <div className="empty">
          <div className="loader"></div>
          <p>Loading your opportunities...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⌁</div>
          <h3>No jobs found</h3>
          <p>Try changing your search or filters.</p>
        </div>
      ) : (
        items.map((job) => {
          const id = getJobId(job);
          const isSaved = savedIds.includes(id);

          return (
            <article className="job-card" key={id}>
              <div className="company-logo">
                {(job.company || "?").charAt(0).toUpperCase()}
              </div>

              <div className="job-content">
                <div className="job-heading">
                  <div>
                    <h3>{job.title || "Untitled role"}</h3>
                    <p className="company">{job.company || "Unknown company"}</p>
                  </div>

                  <Score score={job.score} />
                </div>

                <div className="job-meta">
                  <span>⌖ {job.location || "Location not specified"}</span>
                  {job.salary && <span>◈ {job.salary}</span>}
                  <span>◷ Recently posted</span>
                </div>

                {job.reason && (
                  <div className="ai-reason">
                    <span>✦</span>
                    <p>{job.reason}</p>
                  </div>
                )}

                <div className="job-footer">
                  <div className="job-tags">
                    <span>AI matched</span>
                    {job.applied && <span className="applied-tag">Applied</span>}
                    {isSaved && <span className="applied-tag">Saved</span>}
                  </div>

                  <div className="job-actions">
                    <button
                      className="save-btn"
                      onClick={() => toggleSaved(id)}
                      title={isSaved ? "Remove from saved" : "Save job"}
                    >
                      {isSaved ? "♥" : "♡"}
                    </button>

                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="apply-btn"
                      >
                        View job
                        <span>↗</span>
                      </a>
                    ) : (
                      <button className="apply-btn" disabled>
                        No link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );

  const renderDashboard = () => (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">YOUR JOB SEARCH</span>
          <h1>Good morning, Geetanjali.</h1>
          <p>Here are the opportunities worth your attention.</p>
        </div>

        <div className="top-actions">
          <button className="notification" onClick={() => alert("No new notifications.")}>
            ♢
          </button>
          <button className="run-button" onClick={loadJobs}>
            <span>↻</span>
            Run Job Search
          </button>
        </div>
      </header>

      <section className="stats">
        <div className="stat-card">
          <div className="stat-icon purple">⌁</div>
          <div>
            <span>Total Jobs</span>
            <strong>{jobs.length}</strong>
          </div>
          <small>Tracked</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">✦</div>
          <div>
            <span>Strong Matches</span>
            <strong>{highMatches}</strong>
          </div>
          <small>7.0+ score</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">✓</div>
          <div>
            <span>Applications</span>
            <strong>{applied}</strong>
          </div>
          <small>Submitted</small>
        </div>

        <div className="stat-card accent-card">
          <div>
            <span>AI SEARCH STATUS</span>
            <strong>Active</strong>
            <small>Last scan completed successfully</small>
          </div>
          <div className="pulse"></div>
        </div>
      </section>

      {renderJobsSection()}
    </>
  );

  const renderJobsSection = () => (
    <section className="jobs-section">
      <div className="section-header">
        <div>
          <h2>Recommended for you</h2>
          <p>Ranked by your profile and job requirements.</p>
        </div>

        <div className="filters">
          <button
            className={filter === "all" ? "filter active-filter" : "filter"}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "high" ? "filter active-filter" : "filter"}
            onClick={() => setFilter("high")}
          >
            Strong matches
          </button>
          <button
            className={filter === "applied" ? "filter active-filter" : "filter"}
            onClick={() => setFilter("applied")}
          >
            Applied
          </button>
        </div>
      </div>

      <div className="search-row">
        <div className="search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, companies or locations..."
          />
        </div>

        <button className="sort-button" onClick={() => setFilter("high")}>
          Sort: Best match ▾
        </button>
      </div>

      {renderJobList()}
    </section>
  );

  const renderSimplePage = () => {
    if (page === "saved") {
      const savedJobs = jobs.filter((job) => savedIds.includes(getJobId(job)));
      return (
        <section className="jobs-section">
          <div className="section-header">
            <div>
              <h2>Saved Jobs</h2>
              <p>{saved} job{saved === 1 ? "" : "s"} saved for later.</p>
            </div>
          </div>
          {renderJobList(savedJobs)}
        </section>
      );
    }

    if (page === "applications") {
      const applicationJobs = jobs.filter((job) => job.applied);
      return (
        <section className="jobs-section">
          <div className="section-header">
            <div>
              <h2>Applications</h2>
              <p>Jobs you have marked as applied.</p>
            </div>
          </div>
          {renderJobList(applicationJobs)}
        </section>
      );
    }

    if (page === "discover") {
      return (
        <section className="jobs-section">
          <div className="section-header">
            <div>
              <h2>Discover Jobs</h2>
              <p>Browse all jobs currently returned by your JobHunt backend.</p>
            </div>
          </div>

          <div className="search-row">
            <div className="search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, companies or locations..."
              />
            </div>
          </div>

          {renderJobList()}
        </section>
      );
    }

    if (page === "assistant") {
      return (
        <section className="jobs-section">
          <div className="section-header">
            <div>
              <h2>AI Assistant</h2>
              <p>Get quick guidance from the job data already loaded in JobHunt.</p>
            </div>
          </div>

          <div
            style={{
              padding: "28px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ marginBottom: "22px" }}>
              <span className="eyebrow">JOBHUNT ASSISTANT</span>
              <h3 style={{ marginTop: "8px" }}>What do you want to know?</h3>
              <p style={{ color: "var(--muted, #888)", lineHeight: 1.6 }}>
                Ask which jobs to prioritize, what skills to focus on, or how to use your resume.
              </p>
            </div>

            <div className="search-row">
              <div className="search">
                <span>✦</span>
                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") askAssistant();
                  }}
                  placeholder="e.g. Which jobs should I apply to first?"
                />
              </div>
              <button className="apply-btn" onClick={askAssistant}>
                Ask
              </button>
            </div>

            <div
              className="ai-reason"
              style={{ marginTop: "20px", minHeight: "70px" }}
            >
              <span>✦</span>
              <p>{assistantAnswer}</p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
              {[
                "Which jobs should I apply to first?",
                "What skills should I focus on?",
                "How should I use my resume?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="filter"
                  onClick={() => {
                    setAssistantInput(prompt);
                    setTimeout(askAssistant, 0);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (page === "resume") {
      return (
        <section className="jobs-section">
          <div className="section-header">
            <div>
              <h2>Resume</h2>
              <p>Keep the resume you use for your JobHunt workflow in one place.</p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            <div className="stat-card">
              <div>
                <span>CURRENT RESUME</span>
                <strong style={{ fontSize: "18px", wordBreak: "break-word" }}>
                  {resumeName || "No resume uploaded"}
                </strong>
                <small>
                  {resumeName
                    ? "Ready to use for your job-search workflow."
                    : "Upload a PDF or DOCX resume to get started."}
                </small>
              </div>
            </div>

            <div className="stat-card">
              <div>
                <span>STRONG MATCHES</span>
                <strong>{highMatches}</strong>
                <small>Jobs scoring 7.0 or higher.</small>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
              padding: "28px",
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: "18px",
              textAlign: "center",
            }}
          >
            <div className="empty-icon">▤</div>
            <h3>{resumeName ? "Resume selected" : "Upload your resume"}</h3>
            <p>
              {resumeName
                ? "You can replace it whenever you update your resume."
                : "The file name will be saved locally in this browser. Your existing backend is not changed."}
            </p>

            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              style={{ display: "none" }}
            />

            <label
              htmlFor="resume-upload"
              className="apply-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                marginTop: "12px",
              }}
            >
              {resumeName ? "Replace Resume" : "Choose Resume"}
              <span>↗</span>
            </label>

            {resumeName && (
              <button
                className="filter"
                style={{ marginLeft: "10px" }}
                onClick={() => setResumeName("")}
              >
                Remove
              </button>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="jobs-section">
        <div className="section-header">
          <div>
            <h2>Settings</h2>
            <p>Control the preferences used by your JobHunt workspace.</p>
          </div>
        </div>

        <div
          style={{
            maxWidth: "720px",
            display: "grid",
            gap: "18px",
          }}
        >
          <div className="stat-card" style={{ display: "block" }}>
            <span>Preferred location</span>
            <input
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="e.g. Bengaluru, Hyderabad, Remote"
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "13px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div className="stat-card" style={{ display: "block" }}>
            <span>Minimum match score</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "13px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#15131d",
                color: "inherit",
                outline: "none",
              }}
            >
              <option value="5">5.0+</option>
              <option value="6">6.0+</option>
              <option value="7">7.0+</option>
              <option value="8">8.0+</option>
              <option value="9">9.0+</option>
            </select>
          </div>

          <button className="apply-btn" onClick={saveSettings} style={{ width: "fit-content" }}>
            Save Settings
          </button>

          <p style={{ color: "var(--muted, #888)", lineHeight: 1.6 }}>
            These preferences are currently stored in your browser. We are not changing your
            Python job-fetching pipeline.
          </p>
        </div>
      </section>
    );
  };

  const navItems = [
    ["dashboard", "⌂", "Dashboard"],
    ["discover", "⌕", "Discover Jobs"],
    ["saved", "♡", "Saved"],
    ["applications", "✓", "Applications"],
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">J</div>
          <div>
            <h2>JobHunt</h2>
            <span>AI Career Assistant</span>
          </div>
        </div>

        <nav>
          <p className="nav-label">WORKSPACE</p>

          {navItems.map(([key, icon, label]) => (
            <button
              key={key}
              className={page === key ? "nav-item active" : "nav-item"}
              onClick={() => setPage(key)}
            >
              <Icon>{icon}</Icon>
              {label}
            </button>
          ))}

          <p className="nav-label">TOOLS</p>

          <button
            className={page === "assistant" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("assistant")}
          >
            <Icon>✦</Icon>
            AI Assistant
          </button>

          <button
            className={page === "settings" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("settings")}
          >
            <Icon>⚙</Icon>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">G</div>
            <div>
              <strong>Geetanjali</strong>
              <span>Job seeker</span>
            </div>
            <span className="dots">•••</span>
          </div>
        </div>
      </aside>

      <main className="main">
        {page !== "dashboard" && (
          <header className="topbar">
            <div>
              <span className="eyebrow">JOBHUNT</span>
              <h1>{pageTitle}</h1>
              <p>Manage your job search from one place.</p>
            </div>

            <div className="top-actions">
              <button className="run-button" onClick={loadJobs}>
                <span>↻</span>
                Refresh Jobs
              </button>
            </div>
          </header>
        )}

        {page === "dashboard" ? renderDashboard() : renderSimplePage()}
      </main>
    </div>
  );
}

export default App;
