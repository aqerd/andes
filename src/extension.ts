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
      if (message.type === 'chat') {
        const exe = this.context.asAbsolutePath(
          path.join('bin', process.platform === 'win32' ? 'ollama-chat.exe' : 'ollama-chat')
        );
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
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Hello Go</title>
</head>
<body>
  <div style="display:flex; flex-direction:column; height:100%">
    <div id="messages" style="flex:1; overflow:auto; white-space:pre-wrap"></div>
    <div style="display:flex">
      <textarea id="input" style="flex:1"></textarea>
      <button id="send">Send</button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    document.getElementById('send').addEventListener('click', () => {
      const text = (input as HTMLTextAreaElement).value;
      if (!text.trim()) { return; }
      messages.textContent += 'You: ' + text + '\n';
      (input as HTMLTextAreaElement).value = '';
      vscode.postMessage({ type: 'chat', prompt: text });
    });
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'result') {
        messages.textContent += 'AI: ' + msg.text + '\n';
        
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
    const provider = new HelloGoViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(HelloGoViewProvider.viewType, provider)
    );

    const disposable = vscode.commands.registerCommand('helloGo.hello', () => {
        vscode.window.showInformationMessage('... Open the Hello Go sidebar from the activity bar icon.');
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {}
