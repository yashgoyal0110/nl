import { execSync } from 'child_process';
import * as vscode from 'vscode';
import Diff2Html from 'diff2html';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';


let timer;

export function activate(context) {
    vscode.window.showInformationMessage('Cookie-Lick Watcher Activated!');

    // Run every 15 seconds (testing)
    timer = setInterval(() => {
        runCheck();
    }, 15 * 1000);

    let disposable = vscode.commands.registerCommand('extension.runCheckNow', runCheck);
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

        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath })
            .toString().trim();

        const mainBranch =
            execSync('git remote show upstream', { cwd: repoPath })
                .toString()
                .match(/HEAD branch: (\S+)/)?.[1] || 'main';

        const committedDiff = execSync(`git diff upstream/${mainBranch}..HEAD`, { cwd: repoPath }).toString();
        const stagedDiff = execSync('git diff --cached', { cwd: repoPath }).toString().trim();
        const unstagedDiff = execSync('git diff', { cwd: repoPath }).toString().trim();

        const fullDiff =
            (committedDiff ? `# Committed changes\n${committedDiff}\n` : '') +
            (stagedDiff ? `# Staged changes\n${stagedDiff}\n` : '') +
            (unstagedDiff ? `# Unstaged changes\n${unstagedDiff}\n` : '');

        if (!fullDiff.trim()) {
            vscode.window.showInformationMessage("No changes detected.");
            return;
        }

        // Render pretty HTML
        const html = Diff2Html.html(fullDiff, {
            matching: 'lines',
            outputFormat: 'side-by-side'
        });

        // Save HTML file in repo for gh-pages
        const outDir = path.join(repoPath, 'gh-pages-diffs');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
        const filename = `diff-${branch}-${Date.now()}.html`;
        const filePath = path.join(outDir, filename);
        
               const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const templatePath = path.join(__dirname, 'diff-template.html');
        const template = fs.readFileSync(templatePath, 'utf8');

        const finalHtml = template
            .replace('{{BRANCH}}', branch)
            .replace('{{DIFF_CONTENT}}', html);

        fs.writeFileSync(filePath, finalHtml);

        // Commit & push to gh-pages branch
        execSync(`git checkout gh-pages`, { cwd: repoPath });
        execSync(`cp ${filePath} .`, { cwd: repoPath }); // copy file into branch root
        execSync(`git add ${filename}`, { cwd: repoPath });
        execSync(`git commit -m "Add diff snapshot ${filename}" || echo "No commit"`, { cwd: repoPath });
        execSync(`git push origin gh-pages`, { cwd: repoPath });
        execSync(`git checkout ${branch}`, { cwd: repoPath }); // switch back

        // Construct public URL
        const config = vscode.workspace.getConfiguration('cookieLickWatcher');
        const owner = config.get('repoOwner');
        const repo = config.get('repoName');
        const publicUrl = `https://${owner}.github.io/${repo}/${filename}`;

        // Open in VS Code panel
        const panel = vscode.window.createWebviewPanel(
            'diffViewer',
            `Diff Snapshot (${branch})`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );
        panel.webview.html = finalHtml;

        vscode.window.showInformationMessage(`Diff snapshot hosted at: ${publicUrl}`);

        // Post to GitHub issue
        const summary = `
### 🚀 Progress Update (Branch: ${branch})
🔗 [View Diff Snapshot](${publicUrl})
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
