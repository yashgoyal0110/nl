import { execSync } from "child_process";
import * as vscode from "vscode";
import Diff2Html from "diff2html";
import * as fs from "fs";
import * as path from "path";

let timer;

export function activate(context) {
  vscode.window.showInformationMessage("Cookie-Lick Watcher Activated!");

  // Run every 15 seconds (for testing)
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

    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
    })
      .toString()
      .trim();
    const mainBranch =
      execSync("git remote show upstream", { cwd: repoPath })
        .toString()
        .match(/HEAD branch: (\S+)/)?.[1] || "main";

    // Collect diffs
    const committedDiff = execSync(`git diff upstream/${mainBranch}..HEAD`, {
      cwd: repoPath,
    }).toString();
    const stagedDiff = execSync("git diff --cached", { cwd: repoPath })
      .toString()
      .trim();
    const unstagedDiff = execSync("git diff", { cwd: repoPath })
      .toString()
      .trim();

    if (!committedDiff && !stagedDiff && !unstagedDiff) {
      vscode.window.showInformationMessage("No changes detected.");
      return;
    }

    const fullDiff =
      (committedDiff ? `# Committed changes\n${committedDiff}\n` : "") +
      (stagedDiff ? `# Staged changes\n${stagedDiff}\n` : "") +
      (unstagedDiff ? `# Unstaged changes\n${unstagedDiff}\n` : "");

    // Render HTML using Diff2Html
    const html = Diff2Html.html(fullDiff, {
      matching: "lines",
      outputFormat: "side-by-side",
      drawFileList: true,
    });

    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Diff Snapshot - ${branch}</title>

  <!-- Highlight.js for code syntax coloring with auto color scheme -->
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

  <!-- Diff2Html JS -->
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

    // Save HTML snapshot locally

    const outDir = path.join(repoPath, ".cookie-lick-watcher");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const filePath = path.join(outDir, `diff-${branch}-${Date.now()}.html`);
    fs.writeFileSync(filePath, template);

    // Open snapshot in default system browser
    vscode.env.openExternal(vscode.Uri.file(filePath));

    vscode.window.showInformationMessage(
      `Diff snapshot opened in browser: ${filePath}`
    );

    // Post GitHub comment with copyable path (maintainers cannot open this locally)
    const summary = `
### 🚀 Progress Update (Branch: ${branch})
- Committed changes: ${committedDiff ? "✅" : "❌"}
- Staged changes: ${stagedDiff ? "✅" : "❌"}
- Unstaged changes: ${unstagedDiff ? "✅" : "❌"}
📂 Local snapshot path: \`${filePath}\` (open in browser locally)
`;
    await postToGitHub(summary, branch);
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
  ``;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  vscode.window.showInformationMessage(
    `Update posted to GitHub issue #${issueNumber}`
  );
}

export function deactivate() {
  if (timer) clearInterval(timer);
}
