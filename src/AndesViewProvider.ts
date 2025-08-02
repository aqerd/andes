import * as vscode from 'vscode';
import { OllamaApiClient } from './OllamaApiClient';

export class AndesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'andesView';
    private _view?: vscode.WebviewView;

    private readonly apiClient: OllamaApiClient;

    private constructor(
        private readonly context: vscode.ExtensionContext,
        apiClient: OllamaApiClient
    ) {
        this.apiClient = apiClient;
    }

    public static async create(context: vscode.ExtensionContext): Promise<AndesViewProvider> {
        const apiClient = await OllamaApiClient.create();
        return new AndesViewProvider(context, apiClient);
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'static')]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        this.setupMessageListener(webviewView);

        this.loadModels();

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.loadModels();
            }
        });
    }

    private async loadModels() {
        if (!this._view) {
            return;
        }
        try {
            const models = await this.apiClient.listModels();
            this._view.webview.postMessage({ type: 'models', models: models });
        } catch (error: any) {
            console.error('Failed to fetch models:', error);
            this._view.webview.postMessage({ type: 'error', message: 'Failed to load Ollama models. Is Ollama running?' });
        }
    }

    private setupMessageListener(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'chat') {
                try {
                    webviewView.webview.postMessage({ type: 'loading', isLoading: true });
                    const chatHistory = await this.apiClient.chat(message.prompt, message.model);
                    webviewView.webview.postMessage({ type: 'result', ok: true, chatHistory, model: message.model });
                } catch (err: any) {
                    const errorMessage = err.message || 'An unknown error occurred.';
                    webviewView.webview.postMessage({ type: 'result', ok: false, error: errorMessage, model: message.model });
                } finally {
                    webviewView.webview.postMessage({ type: 'loading', isLoading: false });
                }
            } else if (message.type === 'clear') {
                this.apiClient.clearChatHistory();
                webviewView.webview.postMessage({ type: 'cleared' });
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'static', 'scripts', 'webview.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'static', 'styles', 'webview.css'));
        
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src http://localhost:11434;">
                <meta name="viewport" content="width=device-width,initial-scale=1.0">
                <link rel="stylesheet" type="text/css" href="${styleUri}">
                <title>Andes</title>
            </head>
            <body>
                <div class="container">
                    <div id="messages" class="messages"></div>
                    <div class="input-area">
                        <textarea id="input" class="chat-input" placeholder="start typing your prompt here..."></textarea>
                            <div class="bottom-controls">
                            <select id="model-selector" class="model-selector">
                                <option value="" disabled selected></option>
                            </select>
                            <button id="clear" class="activation-button">clear</button>
                            <button id="send" class="activation-button">enter</button>
                        </div>
                    </div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

function getNonce() {
    return Math.random().toString(36).substring(2, 15);
}
