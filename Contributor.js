import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema({
    repositoryName: String,
  contributor: {
    name: String,
    avatar: String,
    email: String,
    credibilityScore: Number,
  },
  issue: {
    number: Number,
    title: String,
    status: String,
    repository: String,
    assignedDate: String,
    totalCommits: Number,
  },
  metrics: {
    timeSpent: String,
    linesChanged: Number,
    filesModified: Number,
    commits: Number,
    additions: Number,
    deletions: Number,
  },
  timeTracking: [
    {
      date: String,
      hours: Number,
    },
  ],
  linesOfCode: [
    {
      commit: String,
      additions: Number,
      deletions: Number,
    },
  ],
  contributions: [
    {
      id: String,
      commit: String,
      message: String,
      date: String,
      additions: Number,
      deletions: Number,
      files: Number,
    },
  ],
});

export default mongoose.model("ContributorData", contributorSchema);
