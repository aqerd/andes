import * as vscode from 'vscode';
import { AndesViewProvider } from './AndesViewProvider';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "andes" is now active!');

    const provider = new AndesViewProvider(context);

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
