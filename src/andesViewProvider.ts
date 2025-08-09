import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaApiClient } from './ollamaApiClient';

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

        const chatHistory = this.apiClient.getChatHistory();
        if (chatHistory.length > 0) {
            this._view.webview.postMessage({ type: 'restore', chatHistory: chatHistory, model: 'ollama' });
        }

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
                message: lastMessage.content, // Отправляем только содержимое последнего сообщения
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

    private async handleApplyDiff(diffContent: string, filePath?: string) {
        try {
            let targetPath = filePath;
            if (!targetPath) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    targetPath = activeEditor.document.uri.fsPath;
                }
            }

            if (!targetPath) {
                vscode.window.showErrorMessage('No file path provided and no active editor.');
                return;
            }

            if (!fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(`File not found: ${targetPath}`);
                return;
            }

            const document = await vscode.workspace.openTextDocument(targetPath);
            const editor = await vscode.window.showTextDocument(document);

            const changes = this.parseDiff(diffContent);
            await this.applyChanges(editor, changes);

            vscode.window.showInformationMessage('Changes applied successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to apply changes: ${error.message}`);
        }
    }

    private parseDiff(diffContent: string): DiffChange[] {
        const lines = diffContent.split('\n');
        const changes: DiffChange[] = [];
        let originalLine = 0;
        let insertionLine = 0;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                if (match) {
                    originalLine = parseInt(match[1]) - 1;
                    insertionLine = originalLine;
                }
            } else if (line.startsWith('+')) {
                changes.push({
                    type: 'add',
                    lineNumber: insertionLine,
                    content: line.substring(1)
                });
            } else if (line.startsWith('-')) {
                changes.push({
                    type: 'remove',
                    lineNumber: originalLine,
                    content: line.substring(1)
                });
                originalLine++;
            } else if (line.startsWith(' ')) {
                originalLine++;
                insertionLine = originalLine;
            }
        }
        return changes;
    }

    private async applyChanges(editor: vscode.TextEditor, changes: DiffChange[]) {
        const edit = new vscode.WorkspaceEdit();
        const document = editor.document;

        const sortedChanges = [...changes].sort((a, b) => {
            if (a.lineNumber !== b.lineNumber) {
                return b.lineNumber - a.lineNumber;
            }
            if (a.type === 'remove' && b.type === 'add') {
                return -1;
            }
            if (a.type === 'add' && b.type === 'remove') {
                return 1;
            }
            return 0;
        });

        for (const change of sortedChanges) {
            if (change.type === 'add') {
                const position = new vscode.Position(change.lineNumber, 0);
                edit.insert(document.uri, position, change.content + '\n');
            } else if (change.type === 'remove') {
                if (change.lineNumber < document.lineCount) {
                    const line = document.lineAt(change.lineNumber);
                    edit.delete(document.uri, line.rangeIncludingLineBreak);
                }
            }
        }

        await vscode.workspace.applyEdit(edit);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'static', 'scripts', 'webview.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'static', 'styles', 'webview.css'));
        const highlightStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'static', 'styles', 'highlight.css'));
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" type="text/css" href="${styleUri}">
                <link rel="stylesheet" type="text/css" href="${highlightStyleUri}">
                <title>Andes</title>
            </head>
            <body>
                <div class="container">
                    <div id="messages" class="messages"></div>
                    <div class="input-area">
                        <textarea id="input" class="chat-input" placeholder="ask a question or type..."></textarea>
                        <div id="file-suggestions" class="file-suggestions" style="display: none;">
                            <input type="text" id="file-search" placeholder="Search files...">
                            <ul id="file-list"></ul>
                        </div>
                        <div class="bottom-controls">
                            <select id="model-selector" class="model-selector"></select>
                            <button id="clear" class="activation-button">clear</button>
                            <button id="send" class="activation-button">send</button>
                        </div>
                    </div>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.8/clipboard.min.js"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

function getNonce() {
    return Math.random().toString(36).substring(2, 15);
}
