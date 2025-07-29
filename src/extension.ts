import * as vscode from 'vscode';
import { AndesViewProvider } from './AndesViewProvider';

export async function activate(context: vscode.ExtensionContext) {
    const provider = await AndesViewProvider.create(context);

    const viewProviderRegistration = vscode.window.registerWebviewViewProvider(
        AndesViewProvider.viewType,
        provider
    );

    const commandRegistration = vscode.commands.registerCommand('andes.hello', () => {
        vscode.window.showInformationMessage('Open the Andes extension sidebar from the activity bar icon!');
    });

    context.subscriptions.push(viewProviderRegistration);
    context.subscriptions.push(commandRegistration);
}

export function deactivate() {}
