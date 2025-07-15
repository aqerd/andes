import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

class HelloGoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'helloGoView';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'run') {
        const exe = this.context.asAbsolutePath(
          path.join('bin', process.platform === 'win32' ? 'hello-go.exe' : 'hello-go')
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // @ts-ignore: execFile overload error suppression
        (cp.execFile as any)(exe, { encoding: 'utf8' }, (err: NodeJS.ErrnoException | null, stdout: string, stderr: string) => {
          if (err) {
            webviewView.webview.postMessage({ type: 'result', ok: false, error: stderr || err?.message });
            return;
          }
          webviewView.webview.postMessage({ type: 'result', ok: true, text: stdout.trim() });
        });
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Hello Go</title>
</head>
<body>
  <button id="run">Run Go</button>
  <pre id="out"></pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('run').addEventListener('click', () => vscode.postMessage({ type: 'run' }));
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'result') {
        document.getElementById('out').textContent = msg.ok ? msg.text : 'Error: ' + msg.error;
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  return Math.random().toString(36).slice(2, 10);
}

export function activate(context: vscode.ExtensionContext) {
    // Register the sidebar view provider
    const provider = new HelloGoViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(HelloGoViewProvider.viewType, provider)
    );

    // Keep the original command but just show info on how to access the sidebar
    const disposable = vscode.commands.registerCommand('helloGo.hello', () => {
        vscode.window.showInformationMessage('Open the Hello Go sidebar from the activity bar icon.');
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {}
