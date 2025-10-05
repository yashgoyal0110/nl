// import ContributorData from './Contributor.js'; // your schema
// import { execSync } from "child_process";
// import * as vscode from "vscode";
// import * as fs from "fs";
// import * as path from "path";
// import connectDB from "./db.js";
// import dotenv from "dotenv";
// dotenv.config();

// let timer;



// export function activate(context) {
//   vscode.window.showInformationMessage("Cookie-Lick Watcher Activated!");

//   timer = setInterval(() => {
//     runCheck();
//   }, 15 * 1000);

//   const disposable = vscode.commands.registerCommand(
//     "extension.runCheckNow",
//     runCheck
//   );
//   context.subscriptions.push(disposable);
// }

// async function runCheck() {
//   const repoPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
//   if (!repoPath) {
//     vscode.window.showWarningMessage("No workspace folder open");
//     return;
//   }

//   try {


  
//     execSync("git fetch upstream", { cwd: repoPath });

//     const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }).toString().trim();
//     const mainBranch = execSync("git remote show upstream", { cwd: repoPath })
//       .toString()
//       .match(/HEAD branch: (\S+)/)?.[1] || "main";

//     // --- Verify issue assignment ---
//     const config = vscode.workspace.getConfiguration("cookieLickWatcher");
//     const token = config.get("githubToken");
//     const owner = config.get("repoOwner");
//     const repo = config.get("repoName");
//     console.log("GitHub Configuration:");
//     console.log(config);
//     const issueNumber = parseInt((branch.match(/issue-(\d+)/) || [])[1]);
//     console.log(`Current branch: ${branch}, Issue number: ${issueNumber}`);
 

  

//     if (!issueNumber) {
//       vscode.window.showErrorMessage("Branch does not match issue pattern (e.g., issue-123)");
//       return;
//     }

//     if (!token || !owner || !repo) {
//       vscode.window.showErrorMessage("Missing GitHub configuration (token, owner, repo, or username)");
//       return;
//     }

//     const { Octokit } = await import("@octokit/rest");
//     const octokit = new Octokit({ auth: token });

//     // Get issue details
//     const { data: issue } = await octokit.issues.get({
//       owner,
//       repo,
//       issue_number: issueNumber,
//     });

//     // Check if user is assigned
//     const isAssigned = issue.assignees?.some(assignee => assignee.login === 'yashgoyal0110');
//     const assignee = issue.assignees.map(a => a.login)[0];
    
//     if (!isAssigned) {
//       vscode.window.showErrorMessage(
//         `Issue #${issueNumber} is not assigned to you (${assignee}). This extension only tracks issues assigned to you.`
//       );
//       return;
//     }

//     // --- Git Stats ---
//     const commitsAhead = parseInt(execSync(`git rev-list --count HEAD ^upstream/${mainBranch}`, { cwd: repoPath }).toString().trim());
//     const lastCommitTimestamp = execSync(`git log -1 --format=%ci`, { cwd: repoPath }).toString().trim();

//     function parseDiffStat(diffCmd) {
//       const diffStat = execSync(diffCmd, { cwd: repoPath }).toString().trim();
//       let added = 0, deleted = 0, newFiles = 0;
//       const files = diffStat.split("\n").filter(Boolean);
//       for (const line of files) {
//         const [a, d] = line.split("\t");
//         if (a === "-" || d === "-") newFiles++;
//         else {
//           added += parseInt(a, 10);
//           deleted += parseInt(d, 10);
//         }
//       }
//       return { added, deleted, newFiles, fileCount: files.length };
//     }

//     const committedStats = parseDiffStat(`git diff --numstat upstream/${mainBranch}..HEAD`);
//     const stagedStats = parseDiffStat("git diff --cached --numstat");
//     const unstagedStats = parseDiffStat("git diff --numstat");

//     // --- Full diff for HTML ---
//     const committedDiff = execSync(`git diff upstream/${mainBranch}..HEAD`, { cwd: repoPath }).toString().trim();
//     const stagedDiff = execSync("git diff --cached", { cwd: repoPath }).toString().trim();
//     const unstagedDiff = execSync("git diff", { cwd: repoPath }).toString().trim();
//     const fullDiff = 
//       (committedDiff ? `# Committed changes\n${committedDiff}\n` : "") +
//       (stagedDiff ? `# Staged changes\n${stagedDiff}\n` : "") +
//       (unstagedDiff ? `# Unstaged changes\n${unstagedDiff}\n` : "");

//     // --- Save HTML snapshot ---
//     const template = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="utf-8">
//   <title>Diff Snapshot - ${branch}</title>
//   <link rel="stylesheet" href="./diff.css">
//   <style>
//     body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#0d1117; color:#c9d1d9; }
//     header { background:#161b22; padding:12px; font-size:16px; color:#c9d1d9; }
//     main { padding: 10px; max-height: 100vh; overflow:auto; }
//     .d2h-file-wrapper { margin-bottom: 10px; border: 1px solid #30363d; border-radius: 6px; }
//     .d2h-file-header { background:#161b22; color:#c9d1d9; font-weight:600; }
//     .d2h-code-side-line { background:#0d1117; }
//     .d2h-code-line-ctn { font-size:13px; }
//   </style>
// </head>
// <body>
//   <header>Branch: ${branch}</header>
//   <main>
//     <div id="diffContainer"></div>
//   </main>

//   <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
//   <script>
//     document.addEventListener('DOMContentLoaded', function() {
//       const diffString = \`${fullDiff.replace(/`/g, "\\`")}\`;
//       const targetElement = document.getElementById('diffContainer');

//       const diff2htmlUi = new Diff2HtmlUI(targetElement, diffString, {
//         drawFileList: true,
//         fileListToggle: true,
//         fileListStartVisible: false,
//         matching: 'lines',
//         outputFormat: 'side-by-side',
//         synchronisedScroll: true,
//         highlight: true,
//         renderNothingWhenEmpty: false
//       });

//       diff2htmlUi.draw();
//       diff2htmlUi.highlightCode();
//     });
//   </script>
// </body>
// </html>
// `;

//     const outDir = path.join(repoPath, ".cookie-lick-watcher");
//     if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
//     const filePath = path.join(outDir, `diff-${branch}-${Date.now()}.html`);
//     fs.writeFileSync(filePath, template);
//     vscode.env.openExternal(vscode.Uri.file(filePath));

//     // --- Per-commit history ---
//     const perCommitStatsRaw = execSync(`git log upstream/${mainBranch}..HEAD --pretty=format:"%h|%s|%ci" --numstat`, { cwd: repoPath }).toString().trim();
//     const perCommitStats = [];
//     const lines = perCommitStatsRaw.split("\n");
//     let currentCommit = null;

//     lines.forEach(line => {
//       if (/^[0-9a-f]{5,}\|/.test(line)) {
//         if (currentCommit) perCommitStats.push(currentCommit);
//         const [hash, message, date] = line.split("|");
//         currentCommit = { commit: hash, message, date, additions: 0, deletions: 0, files: 0 };
//       } else if (line.trim() && currentCommit) {
//         const [addedStr, deletedStr] = line.split("\t");
//         const added = addedStr === "-" ? 0 : parseInt(addedStr, 10);
//         const deleted = deletedStr === "-" ? 0 : parseInt(deletedStr, 10);
//         currentCommit.additions += added;
//         currentCommit.deletions += deleted;
//         currentCommit.files += 1;
//       }
//     });
//     if (currentCommit) perCommitStats.push(currentCommit);

//     // --- GitHub summary ---
//     let commitDetails = perCommitStats.map(c =>
//       `- \`${c.commit}\` "${c.message}" | +${c.additions} -${c.deletions} | ${c.files} files | ${c.date}`
//     ).join("\n");


//        // --- Save in MongoDB ---
//     const contributorInfo = vscode.workspace.getConfiguration("cookieLickWatcher").get("contributorInfo") || {};
//     const doc = new ContributorData({
//       repositoryName: contributorInfo.repository,
//       contributor: {
//         name: contributorInfo.name || "Unknown",
//         avatar: contributorInfo.avatar || "",
//         email: contributorInfo.email || "",
//         credibilityScore: contributorInfo.credibilityScore || 0,
//       },
//       issue: {
//         number: parseInt(branch.match(/issue-(\d+)/)?.[1] || "0"),
//         title: contributorInfo.issueTitle || branch,
//         status: contributorInfo.issueStatus || "open",
//         repository: contributorInfo.repository || "",
//         assignedDate: new Date().toISOString(),
//         totalCommits: perCommitStats.length,
//       },
//       metrics: {
//         timeSpent: "", // optional
//         linesChanged: committedStats.added + committedStats.deleted + stagedStats.added + stagedStats.deleted + unstagedStats.added + unstagedStats.deleted,
//         filesModified: committedStats.fileCount + stagedStats.fileCount + unstagedStats.fileCount,
//         commits: perCommitStats.length,
//         additions: perCommitStats.reduce((sum, c) => sum + c.additions, 0),
//         deletions: perCommitStats.reduce((sum, c) => sum + c.deletions, 0),
//       },
//       linesOfCode: perCommitStats.map(c => ({
//         commit: c.commit,
//         additions: c.additions,
//         deletions: c.deletions
//       })),
//       contributions: perCommitStats.map(c => ({
//         id: c.commit,
//         commit: c.commit,
//         message: c.message,
//         date: c.date,
//         additions: c.additions,
//         deletions: c.deletions,
//         files: c.files
//       })),
//     });

//     await connectDB();
//     const savedInfo = await doc.save();
//     const docId = savedInfo._id;

//     const summary = `
//   ### 🚀 Progress Update (Branch: ${branch})

//   **Commits ahead of upstream/${mainBranch}:** ${commitsAhead}  
//   **Last commit timestamp:** ${lastCommitTimestamp}

//   **Committed changes:**  
//   - Files changed: ${committedStats.fileCount}  
//   - Lines added: ${committedStats.added}  
//   - Lines deleted: ${committedStats.deleted}  
//   - New files: ${committedStats.newFiles}

//   **Staged changes:**  
//   - Files changed: ${stagedStats.fileCount}  
//   - Lines added: ${stagedStats.added}  
//   - Lines deleted: ${stagedStats.deleted}  
//   - New files: ${stagedStats.newFiles}

//   **Unstaged changes:**  
//   - Files changed: ${unstagedStats.fileCount}  
//   - Lines added: ${unstagedStats.added}  
//   - Lines deleted: ${unstagedStats.deleted}  
//   - New files: ${unstagedStats.newFiles}

//   📂 Local snapshot path: \`${filePath}\` (open in browser locally)

//   🔎 For a detailed matrix, visit: [http://localhost:5173/${docId}](http://localhost:5173/${docId})
//   `;


//     await postToGitHub(summary, branch, octokit, owner, repo);

//     vscode.window.showInformationMessage("Contributor data saved to MongoDB!");
//   } catch (err) {
//     vscode.window.showErrorMessage(`Error in runCheck: ${err.message || err}`);
//   }
// }

// async function postToGitHub(body, branch, octokit, owner, repo) {
//   const issueNumber = parseInt((branch.match(/issue-(\d+)/) || [])[1]);

//   await octokit.issues.createComment({
//     owner,
//     repo,
//     issue_number: issueNumber,
//     body,
//   });

//   vscode.window.showInformationMessage(`Update posted to GitHub issue #${issueNumber}`);
// }

// export function deactivate() {
//   if (timer) clearInterval(timer);
// }




import ContributorData from './Contributor.js'; // your schema
import { execSync } from "child_process";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import connectDB from "./db.js";

let timer;

export function activate(context) {
  vscode.window.showInformationMessage("Cookie-Lick Watcher Activated!");

  timer = setInterval(() => {
    runCheck();
  }, 15 * 1000);

  const disposable = vscode.commands.registerCommand(
    "extension.runCheckNow",
    runCheck
  );
  context.subscriptions.push(disposable);
}

async function runCheck() {
  const repoPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!repoPath) {
    vscode.window.showWarningMessage("No workspace folder open");
    return;
  }

  try {
    execSync("git fetch upstream", { cwd: repoPath });

    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath }).toString().trim();
    const mainBranch = execSync("git remote show upstream", { cwd: repoPath })
      .toString()
      .match(/HEAD branch: (\S+)/)?.[1] || "main";

    // --- Git Stats ---
    const commitsAhead = parseInt(execSync(`git rev-list --count HEAD ^upstream/${mainBranch}`, { cwd: repoPath }).toString().trim());
    const lastCommitTimestamp = execSync(`git log -1 --format=%ci`, { cwd: repoPath }).toString().trim();

    function parseDiffStat(diffCmd) {
      const diffStat = execSync(diffCmd, { cwd: repoPath }).toString().trim();
      let added = 0, deleted = 0, newFiles = 0;
      const files = diffStat.split("\n").filter(Boolean);
      for (const line of files) {
        const [a, d] = line.split("\t");
        if (a === "-" || d === "-") newFiles++;
        else {
          added += parseInt(a, 10);
          deleted += parseInt(d, 10);
        }
      }
      return { added, deleted, newFiles, fileCount: files.length };
    }

    const committedStats = parseDiffStat(`git diff --numstat upstream/${mainBranch}..HEAD`);
    const stagedStats = parseDiffStat("git diff --cached --numstat");
    const unstagedStats = parseDiffStat("git diff --numstat");

    // --- Full diff for HTML ---
    const committedDiff = execSync(`git diff upstream/${mainBranch}..HEAD`, { cwd: repoPath }).toString().trim();
    const stagedDiff = execSync("git diff --cached", { cwd: repoPath }).toString().trim();
    const unstagedDiff = execSync("git diff", { cwd: repoPath }).toString().trim();
    const fullDiff = 
      (committedDiff ? `# Committed changes\n${committedDiff}\n` : "") +
      (stagedDiff ? `# Staged changes\n${stagedDiff}\n` : "") +
      (unstagedDiff ? `# Unstaged changes\n${unstagedDiff}\n` : "");

    // --- Save HTML snapshot ---
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Diff Snapshot - ${branch}</title>
  <link rel="stylesheet" href="./diff.css">
  <style>
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#0d1117; color:#c9d1d9; }
    header { background:#161b22; padding:12px; font-size:16px; color:#c9d1d9; }
    main { padding: 10px; max-height: 100vh; overflow:auto; }
    .d2h-file-wrapper { margin-bottom: 10px; border: 1px solid #30363d; border-radius: 6px; }
    .d2h-file-header { background:#161b22; color:#c9d1d9; font-weight:600; }
    .d2h-code-side-line { background:#0d1117; }
    .d2h-code-line-ctn { font-size:13px; }
  </style>
</head>
<body>
  <header>Branch: ${branch}</header>
  <main>
    <div id="diffContainer"></div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const diffString = \`${fullDiff.replace(/`/g, "\\`")}\`;
      const targetElement = document.getElementById('diffContainer');

      const diff2htmlUi = new Diff2HtmlUI(targetElement, diffString, {
        drawFileList: true,
        fileListToggle: true,
        fileListStartVisible: false,
        matching: 'lines',
        outputFormat: 'side-by-side',
        synchronisedScroll: true,
        highlight: true,
        renderNothingWhenEmpty: false
      });

      diff2htmlUi.draw();
      diff2htmlUi.highlightCode();
    });
  </script>
</body>
</html>
`;

    const outDir = path.join(repoPath, ".cookie-lick-watcher");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const filePath = path.join(outDir, `diff-${branch}-${Date.now()}.html`);
    fs.writeFileSync(filePath, template);
    vscode.env.openExternal(vscode.Uri.file(filePath));

    // --- Per-commit history ---
    const perCommitStatsRaw = execSync(`git log upstream/${mainBranch}..HEAD --pretty=format:"%h|%s|%ci" --numstat`, { cwd: repoPath }).toString().trim();
    const perCommitStats = [];
    const lines = perCommitStatsRaw.split("\n");
    let currentCommit = null;

    lines.forEach(line => {
      if (/^[0-9a-f]{5,}\|/.test(line)) {
        if (currentCommit) perCommitStats.push(currentCommit);
        const [hash, message, date] = line.split("|");
        currentCommit = { commit: hash, message, date, additions: 0, deletions: 0, files: 0 };
      } else if (line.trim() && currentCommit) {
        const [addedStr, deletedStr] = line.split("\t");
        const added = addedStr === "-" ? 0 : parseInt(addedStr, 10);
        const deleted = deletedStr === "-" ? 0 : parseInt(deletedStr, 10);
        currentCommit.additions += added;
        currentCommit.deletions += deleted;
        currentCommit.files += 1;
      }
    });
    if (currentCommit) perCommitStats.push(currentCommit);

    // --- GitHub summary ---
    let commitDetails = perCommitStats.map(c =>
      `- \`${c.commit}\` "${c.message}" | +${c.additions} -${c.deletions} | ${c.files} files | ${c.date}`
    ).join("\n");


       // --- Save in MongoDB ---
    const contributorInfo = vscode.workspace.getConfiguration("cookieLickWatcher").get("contributorInfo") || {};
    const doc = new ContributorData({
      repositoryName: contributorInfo.repository,
      contributor: {
        name: contributorInfo.name || "Unknown",
        avatar: contributorInfo.avatar || "",
        email: contributorInfo.email || "",
        credibilityScore: contributorInfo.credibilityScore || 0,
      },
      issue: {
        number: parseInt(branch.match(/issue-(\d+)/)?.[1] || "0"),
        title: contributorInfo.issueTitle || branch,
        status: contributorInfo.issueStatus || "open",
        repository: contributorInfo.repository || "",
        assignedDate: new Date().toISOString(),
        totalCommits: perCommitStats.length,
      },
      metrics: {
        timeSpent: "", // optional
        linesChanged: committedStats.added + committedStats.deleted + stagedStats.added + stagedStats.deleted + unstagedStats.added + unstagedStats.deleted,
        filesModified: committedStats.fileCount + stagedStats.fileCount + unstagedStats.fileCount,
        commits: perCommitStats.length,
        additions: perCommitStats.reduce((sum, c) => sum + c.additions, 0),
        deletions: perCommitStats.reduce((sum, c) => sum + c.deletions, 0),
      },
      linesOfCode: perCommitStats.map(c => ({
        commit: c.commit,
        additions: c.additions,
        deletions: c.deletions
      })),
      contributions: perCommitStats.map(c => ({
        id: c.commit,
        commit: c.commit,
        message: c.message,
        date: c.date,
        additions: c.additions,
        deletions: c.deletions,
        files: c.files
      })),
    });

    await connectDB();
    const savedInfo = await doc.save();
    const docId = savedInfo._id;

    const summary = `
  ### 🚀 Progress Update (Branch: ${branch})

  **Commits ahead of upstream/${mainBranch}:** ${commitsAhead}  
  **Last commit timestamp:** ${lastCommitTimestamp}

  **Committed changes:**  
  - Files changed: ${committedStats.fileCount}  
  - Lines added: ${committedStats.added}  
  - Lines deleted: ${committedStats.deleted}  
  - New files: ${committedStats.newFiles}

  **Staged changes:**  
  - Files changed: ${stagedStats.fileCount}  
  - Lines added: ${stagedStats.added}  
  - Lines deleted: ${stagedStats.deleted}  
  - New files: ${stagedStats.newFiles}

  **Unstaged changes:**  
  - Files changed: ${unstagedStats.fileCount}  
  - Lines added: ${unstagedStats.added}  
  - Lines deleted: ${unstagedStats.deleted}  
  - New files: ${unstagedStats.newFiles}

  📂 Local snapshot path: \`${filePath}\` (open in browser locally)

  🔎 For a detailed matrix, visit: [http://localhost:5173/${docId}](http://localhost:5173/${docId})
  `;


    await postToGitHub(summary, branch);

    vscode.window.showInformationMessage("Contributor data saved to MongoDB!");
  } catch (err) {
    vscode.window.showErrorMessage(`Error in runCheck: ${err.message || err}`);
  }
}

async function postToGitHub(body, branch) {
  const config = vscode.workspace.getConfiguration("cookieLickWatcher");
  const token = config.get("githubToken");
  const owner = config.get("repoOwner");
  const repo = config.get("repoName");
  const issueNumber = parseInt((branch.match(/issue-(\d+)/) || [])[1]);

  if (!token || !owner || !repo || !issueNumber) {
    vscode.window.showWarningMessage(
      "Missing GitHub config or branch does not match issue pattern."
    );
    return;
  }

  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: token });

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  vscode.window.showInformationMessage(`Update posted to GitHub issue #${issueNumber}`);
}

export function deactivate() {
  if (timer) clearInterval(timer);
}