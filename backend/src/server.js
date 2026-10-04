import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.get("/api/jobs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        job_id,
        company,
        title,
        location,
        url,
        salary,
        score,
        reason,
        first_seen,
        applied,
        applied_on
      FROM jobs
      ORDER BY score DESC NULLS LAST, first_seen DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/api/jobs", async (req, res) => {
  try {
    const jobs = Array.isArray(req.body) ? req.body : [req.body];

    for (const job of jobs) {
      await pool.query(
        `
        INSERT INTO jobs (
          job_id,
          ats,
          company,
          title,
          location,
          url,
          description,
          posted_at,
          salary,
          score,
          reason,
          draft,
          emailed,
          applied,
          applied_on
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15
        )
        ON CONFLICT (job_id)
        DO UPDATE SET
          score = EXCLUDED.score,
          reason = EXCLUDED.reason,
          draft = EXCLUDED.draft,
          updated_at = now()
        `,
        [
          job.job_id,
          job.ats,
          job.company,
          job.title,
          job.location || null,
          job.url,
          job.description || null,
          job.posted_at || null,
          job.salary || null,
          job.score ?? null,
          job.reason || null,
          job.draft || {},
          job.emailed ?? false,
          job.applied ?? false,
          job.applied_on || null,
        ]
      );
    }

    res.json({
      success: true,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Failed to save jobs:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`JobHunt backend listening on port ${port}`);
});