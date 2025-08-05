import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaApiClient } from './ollamaApiClient';

interface FileContext {
    path: string;
    content: string;
}

interface DiffChange {
    type: 'add' | 'remove' | 'change';
    lineNumber: number;
    content: string;
}

export class AndesViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'andesView';
    private _view?: vscode.WebviewView;

    private readonly apiClient: OllamaApiClient;
    private readonly ollamaPort: string;
    private readonly golangApiPort: string;

    private constructor(
        private readonly context: vscode.ExtensionContext,
        apiClient: OllamaApiClient,
        ollamaPort: string,
        golangApiPort: string
    ) {
        this.apiClient = apiClient;
        this.ollamaPort = ollamaPort;
        this.golangApiPort = golangApiPort;
    }

    public static async create(context: vscode.ExtensionContext, ollamaPort: string, golangApiPort: string): Promise<AndesViewProvider> {
        const apiClient = await OllamaApiClient.create(`http://localhost:${ollamaPort}`);
        return new AndesViewProvider(context, apiClient, ollamaPort, golangApiPort);
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
            const errorMessage = error.code === 'ECONNREFUSED' 
                ? 'Cannot connect to Ollama. Please ensure Ollama is running on port 11434.'
                : error.message || 'Failed to load Ollama models';
            this._view.webview.postMessage({ type: 'error', message: errorMessage });
        }
    }

    private setupMessageListener(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'chat':
                    await this.handleChatMessage(message);
                    break;
                case 'clear':
                    this.apiClient.clearChatHistory();
                    webviewView.webview.postMessage({ type: 'cleared' });
                    break;
                case 'getRecentFiles':
                    await this.handleGetRecentFiles();
                    break;
                case 'searchFiles':
                    await this.handleSearchFiles(message.query);
                    break;
                case 'applyDiff':
                    await this.handleApplyDiff(message.diff, message.filePath);
                    break;
            }
        });
    }

    private async handleChatMessage(message: any) {
        if (!this._view) return;
    
        try {
            this._view.webview.postMessage({ type: 'loading', isLoading: true });
            
            const processedPrompt = await this.processFileContext(message.prompt);
            
            const chatHistory = await this.apiClient.chat(processedPrompt, message.model);
            
            const lastMessage = chatHistory[chatHistory.length - 1];
            if (lastMessage && lastMessage.content) {
                const diffMatch = lastMessage.content.match(/```diff\n([\s\S]*?)\n```/);
                if (diffMatch) {
                    const diffContent = diffMatch[1];
                    const targetFile = this.extractTargetFileFromContext(processedPrompt);
                    
                    this._view.webview.postMessage({ 
                        type: 'diffDetected', 
                        diff: diffContent, 
                        filePath: targetFile 
                    });
                }
            }
            
            this._view.webview.postMessage({ 
                type: 'result', 
                ok: true, 
                chatHistory, 
                model: message.model 
            });
        } catch (err: any) {
            let errorMessage: string;
            
            if (err.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to Ollama. Please check if Ollama is running on port 11434.';
            } else if (err.type === 'system' && err.errno === 'ECONNREFUSED') {
                errorMessage = 'Connection refused. Make sure Ollama is running and accessible.';
            } else if (typeof err === 'object') {
                errorMessage = err.message || JSON.stringify(err);
            } else {
                errorMessage = String(err);
            }
            
            this._view.webview.postMessage({ 
                type: 'result', 
                ok: false, 
                error: errorMessage, 
                model: message.model 
            });
        } finally {
            this._view.webview.postMessage({ type: 'loading', isLoading: false });
        }
    }

    private async processFileContext(prompt: string): Promise<string> {
        const fileRegex = /#File:([^\s]+)/g;
        let processedPrompt = prompt;
        const matches = [...prompt.matchAll(fileRegex)];

        for (const match of matches) {
            const filePath = match[1];
            const fullPath = await this.resolveFilePath(filePath);
            
            if (fullPath && fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const contextBlock = `<contextfile path="${fullPath}">\n${content}\n</contextfile>`;
                    processedPrompt = processedPrompt.replace(match[0], contextBlock);
                } catch (error) {
                    processedPrompt = processedPrompt.replace(match[0], '');
                }
            } else {
                processedPrompt = processedPrompt.replace(match[0], '');
            }
        }

        return processedPrompt;
    }

    private async resolveFilePath(fileName: string): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return null;
        }

        for (const folder of workspaceFolders) {
            const fullPath = path.join(folder.uri.fsPath, fileName);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        for (const folder of workspaceFolders) {
            const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules/**', 1);
            if (files.length > 0) {
                return files[0].fsPath;
            }
        }

        return null;
    }

    private extractTargetFileFromContext(processedPrompt: string): string | null {
        const contextMatch = processedPrompt.match(/<contextfile path="([^"]+)"/);
        return contextMatch ? contextMatch[1] : null;
    }

    private async handleGetRecentFiles() {
        if (!this._view) {
            return;
        }

        const recentFiles = this.getRecentFiles();
        this._view.webview.postMessage({ type: 'recentFiles', files: recentFiles });
    }

    private async handleSearchFiles(query: string) {
        if (!this._view) {
            return;
        }

        const files = await this.searchFiles(query);
        this._view.webview.postMessage({ type: 'searchResults', files: files });
    }

    private getRecentFiles(): string[] {
        const tabGroups = vscode.window.tabGroups.all;
        const files: string[] = [];

        for (const group of tabGroups) {
            for (const tab of group.tabs) {
                if (tab.input instanceof vscode.TabInputText) {
                    const fileName = path.basename(tab.input.uri.fsPath);
                    files.push(fileName);
                }
            }
        }

        return files.slice(0, 5);
    }

    private async searchFiles(query: string): Promise<string[]> {
        if (!query.trim()) {
            return [];
        }

        const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 10);
        return files.map(uri => path.basename(uri.fsPath));
    }

    private async handleApplyDiff(diffContent: string, filePath: string) {
        try {
            if (!fs.existsSync(filePath)) {
                vscode.window.showErrorMessage(`File not found: ${filePath}`);
                return;
            }

            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);

            const changes = this.parseDiff(diffContent);
            await this.applyChanges(editor, changes);

            vscode.window.showInformationMessage('Changes applied successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply changes: ${error}`);
        }
    }

    private parseDiff(diffContent: string): DiffChange[] {
        const lines = diffContent.split('\n');
        const changes: DiffChange[] = [];
        let currentLine = 0;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                if (match) {
                    currentLine = parseInt(match[2]) - 1;
                }
            } else if (line.startsWith('+')) {
                changes.push({
                    type: 'add',
                    lineNumber: currentLine,
                    content: line.substring(1)
                });
                currentLine++;
            } else if (line.startsWith('-')) {
                changes.push({
                    type: 'remove',
                    lineNumber: currentLine,
                    content: line.substring(1)
                });
            } else if (!line.startsWith('\\')) {
                currentLine++;
            }
        }

        return changes;
    }

    private async applyChanges(editor: vscode.TextEditor, changes: DiffChange[]) {
        const edit = new vscode.WorkspaceEdit();
        const document = editor.document;

        const sortedChanges = [...changes].sort((a, b) => b.lineNumber - a.lineNumber);

        for (const change of sortedChanges) {
            const position = new vscode.Position(change.lineNumber, 0);
            
            switch (change.type) {
                case 'add':
                    edit.insert(document.uri, position, change.content + '\n');
                    break;
                case 'remove':
                    const lineLength = document.lineAt(change.lineNumber).text.length;
                    const range = new vscode.Range(change.lineNumber, 0, change.lineNumber, lineLength);
                    edit.delete(document.uri, range);
                    break;
            }
        }

        await vscode.workspace.applyEdit(edit);
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src http://localhost:${this.ollamaPort} http://localhost:${this.golangApiPort};">
                <meta name="viewport" content="width=device-width,initial-scale=1.0">
                <link rel="stylesheet" type="text/css" href="${styleUri}">
                <title>Andes</title>
            </head>
            <body>
                <div class="container">
                    <div id="messages" class="messages"></div>
                    <div class="input-area">
                        <div class="file-suggestions" id="file-suggestions" style="display: none;">
                            <input type="text" id="file-search" placeholder="Search files..." />
                            <ul id="file-list"></ul>
                        </div>
                        <textarea id="input" class="chat-input" placeholder="start typing your prompt here... (use #File:filename for file context)"></textarea>
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
