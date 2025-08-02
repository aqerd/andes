import * as vscode from 'vscode';
import { AndesViewProvider } from './AndesViewProvider';

export async function activate(context: vscode.ExtensionContext) {
    const provider = await AndesViewProvider.create(context);

    const viewProviderRegistration = vscode.window.registerWebviewViewProvider(
        AndesViewProvider.viewType,
        provider
    );

    context.subscriptions.push(viewProviderRegistration);
}

export function deactivate() {}
