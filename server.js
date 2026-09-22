import express from "express";

const app = express();
const PORT = 3001;

app.use(express.json());

const submissions = [];
const receivedIds = new Set();

app.get("/api/submissions", (req, res) => {
  res.json(submissions);
});

app.post("/api/submissions", (req, res) => {
  const submission = req.body;

  if (!submission?.id) {
    return res.status(400).json({
      ok: false,
      message: "Missing submission id"
    });
  }

  if (receivedIds.has(submission.id)) {
    return res.status(200).json({
      ok: true,
      duplicate: true,
      id: submission.id
    });
  }

  receivedIds.add(submission.id);

  submissions.push({
    ...submission,
    receivedAt: new Date().toISOString()
  });

  console.log(
    `[API] received ${submission.id}`,
    submission.answers
  );

  res.status(201).json({
    ok: true,
    id: submission.id,
    receivedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(
    `Mock API running at http://localhost:${PORT}`
  );
});