import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

class HelloGoViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'helloGoView';

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml(webviewView.webview);
  
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'chat') {
                try {
                    const exe = this.context.asAbsolutePath(
                        path.join('bin', process.platform === 'win32' ? 'ollama-chat.exe' : 'ollama-chat')
                    );
                    const result = await cp.execFile(exe, [message.prompt], { encoding: 'utf8' });
                    const output = result.stdout ? result.stdout.toString().trim() : '';
                    webviewView.webview.postMessage({ type: 'result', ok: true, text: output });
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                    webviewView.webview.postMessage({ type: 'result', ok: false, error: errorMessage });
                }
            }
        });
    }

    private getHtml(webview: vscode.Webview): string {
        const nonce = getNonce();
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Hello Go</title>
      </head>
      <body>
        <div style="display:flex; flex-direction:column; height:100%">
        <p>2</p>
          <div id="messages" style="flex:1; overflow:auto; white-space:pre-wrap; padding: 10px;"></div>
          <div style="display:flex; padding: 10px;">
            <textarea id="input" style="flex:1; padding: 5px; margin-right: 10px; height: 40px;"></textarea>
            <button id="send" style="padding: 5px 10px;">Send</button>
          </div>
        </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const input = document.getElementById('input');
          const messages = document.getElementById('messages');
          const sendButton = document.getElementById('send');

          sendButton.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            
            messages.textContent += 'You: ' + text + '\\n';
            input.value = '';
            
            vscode.postMessage({ type: 'chat', prompt: text });
          });

          window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.type === 'result') {
              messages.textContent += 'AI: ' + (msg.ok ? msg.text : 'Error: ' + msg.error) + '\\n';
            }
          });
        </script>
      </body>
      </html>
    `;
    }
}

function getNonce() {
    return Math.random().toString(36).slice(2, 10);
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new HelloGoViewProvider(context);
    const viewProvider = vscode.window.registerWebviewViewProvider(
        HelloGoViewProvider.viewType,
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );
    context.subscriptions.push(viewProvider);

    const command = vscode.commands.registerCommand('helloGo.hello', () => {
        vscode.window.showInformationMessage('Open the Hello Go sidebar from the activity bar icon.');
    });
    context.subscriptions.push(command);
}

export function deactivate() {}
