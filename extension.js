import { execSync } from 'child_process';
import * as vscode from 'vscode';
import Diff2Html from 'diff2html';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

let timer;

export function activate(context) {
    vscode.window.showInformationMessage('Cookie-Lick Watcher Activated!');

    // Run every 15 seconds (for testing)
    timer = setInterval(() => {
        runCheck();
    }, 15 * 1000);

    const disposable = vscode.commands.registerCommand('extension.runCheckNow', runCheck);
    context.subscriptions.push(disposable);
}

async function runCheck() {
    const repoPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!repoPath) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    try {
        execSync('git fetch upstream', { cwd: repoPath });

        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath }).toString().trim();
        const mainBranch =
            execSync('git remote show upstream', { cwd: repoPath })
                .toString()
                .match(/HEAD branch: (\S+)/)?.[1] || 'main';

        // Collect diffs
        const committedDiff = execSync(`git diff upstream/${mainBranch}..HEAD`, { cwd: repoPath }).toString();
        const stagedDiff = execSync('git diff --cached', { cwd: repoPath }).toString().trim();
        const unstagedDiff = execSync('git diff', { cwd: repoPath }).toString().trim();

        if (!committedDiff && !stagedDiff && !unstagedDiff) {
            vscode.window.showInformationMessage("No changes detected.");
            return;
        }

        const fullDiff =
            (committedDiff ? `# Committed changes\n${committedDiff}\n` : '') +
            (stagedDiff ? `# Staged changes\n${stagedDiff}\n` : '') +
            (unstagedDiff ? `# Unstaged changes\n${unstagedDiff}\n` : '');

        // Render HTML using Diff2Html
        const html = Diff2Html.html(fullDiff, {
            matching: 'lines',
            outputFormat: 'side-by-side'
        });

        // Template for snapshot with dark theme
        const template = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Diff Snapshot - ${branch}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
<style>
body { font-family: "Segoe UI", Roboto, sans-serif; margin:0; background:#1e1e1e; color:#ddd; }
header { background:#007acc; color:white; padding:12px; }
h1 { margin:0; font-size:18px; }
main { padding:10px; max-height:100vh; overflow:auto; }
.d2h-file-wrapper { background:#252526 !important; border:none !important; }
.d2h-code-side-line { background:#1e1e1e !important; }
.d2h-code-line-ctn { font-size:13px !important; }
</style>
<script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
</head>
<body>
<header><h1>Branch: ${branch}</h1></header>
<main>${html}</main>
</body>
</html>
`;

        // Save HTML snapshot locally
        const outDir = path.join(repoPath, '.cookie-lick-watcher');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
        const filePath = path.join(outDir, `diff-${branch}-${Date.now()}.html`);
        fs.writeFileSync(filePath, template);

        // Open snapshot in default system browser
        vscode.env.openExternal(vscode.Uri.file(filePath));

        vscode.window.showInformationMessage(`Diff snapshot opened in browser: ${filePath}`);

        // Post GitHub comment with copyable path (maintainers cannot open this locally)
        const summary = `
### 🚀 Progress Update (Branch: ${branch})
- Committed changes: ${committedDiff ? '✅' : '❌'}
- Staged changes: ${stagedDiff ? '✅' : '❌'}
- Unstaged changes: ${unstagedDiff ? '✅' : '❌'}
📂 Local snapshot path: \`${filePath}\` (open in browser locally)
`;
        await postToGitHub(summary, branch);

    } catch (err) {
        vscode.window.showErrorMessage(`Error in runCheck: ${err.message || err}`);
    }
}

async function postToGitHub(body, branch) {
    const config = vscode.workspace.getConfiguration('cookieLickWatcher');
    const token = config.get('githubToken');
    const owner = config.get('repoOwner');
    const repo = config.get('repoName');
    const issueNumber = parseInt((branch.match(/issue-(\d+)/) || [])[1]);

    if (!token || !owner || !repo || !issueNumber) {
        vscode.window.showWarningMessage('Missing GitHub config or branch does not match issue pattern.');
        return;
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: token });

    await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
    });

    vscode.window.showInformationMessage(`Update posted to GitHub issue #${issueNumber}`);
}

export function deactivate() {
    if (timer) clearInterval(timer);
}
