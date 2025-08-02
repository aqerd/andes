import * as vscode from 'vscode';
import { AndesViewProvider } from './andesViewProvider';

export async function activate(context: vscode.ExtensionContext) {
    const ollamaPort = process.env.OLLAMA_PORT || '11434';
    const golangApiPort = process.env.GOLANG_API_PORT || '11212';
    
    const provider = await AndesViewProvider.create(context, ollamaPort, golangApiPort);

    const viewProviderRegistration = vscode.window.registerWebviewViewProvider(
        AndesViewProvider.viewType,
        provider
    );

    context.subscriptions.push(viewProviderRegistration);
}

export function deactivate() {}
