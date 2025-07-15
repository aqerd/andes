import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('helloGo.hello', () => {
        const exe = context.asAbsolutePath(
            path.join('bin', process.platform === 'win32' ? 'hello-go.exe' : 'hello-go')
        );

        cp.execFile(exe, (err, stdout, stderr) => {
            if (err) {
                vscode.window.showErrorMessage(`Go error: ${stderr || err.message}`);
                return;
            }
            vscode.window.showInformationMessage(stdout.trim());
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
