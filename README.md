<h1 align="center">Andes</h1>
<p align="center">
    <img src="./media/marketicon.png" width="64" height="64"/>
</p>

![Current Version](https://img.shields.io/github/package-json/v/aqerd/andes?color=%23FFA500)
![GitHub commit activity](https://img.shields.io/github/commit-activity/t/aqerd/andes)
![Visual Studio Marketplace Release Date](https://img.shields.io/visual-studio-marketplace/release-date/:extensionId)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/:extensionId)
![Author & Maintainer](https://img.shields.io/badge/Ruslan%20Suleymanov-8A2BE2)

A VS Code extension that supports Ollama models in UI locally. Not released in VS Code market yet

## Requirements
Node.js, Golang, VS Code (Cursor, Windsurf and Trae doesn't work somehow) and Ollama.

## How to build
Set environment variables in `.env` file, copying params from `.env.example` file.
Make sure you have installed npm, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama.
Before testing make sure you have `code` installed in your PATH.
- Press `CMD + Shift + P` and search for `Shell Command: Install 'code' command in PATH`;
- Restart VS Code.

And you ready for extension testing:
- First, run `make` in Terminal. It will instal necessary dependencies;
- Go to `Run` -> `Start Debugging` (or just Press `F5`)
- Wait until the new VS Code window will appear (Extension Development Host);
- Press `CMD + Shift + P` and search for `Andes`;
- Make sure ollama is serving: run `ollama serve` in Terminal on port `11434`.

## Key Capabilities
- Manage your installed Ollama models locally;
- Chat with AI;
- Observe the reasoning process and decision-making of AI models.

## Changelog
Visit [CHANGELOG.md](./CHANGELOG.md)

## TODO
Visit [TODO.md](./TODO.md)

## About project
Goal: I wrote this plugin because i wanted the extension that doesn't require an authentication and only works with Ollama. Cline is not my answer but it's great plugin with almost every provider. But still not an answer for me.
Info: Sadly it's written in TypeScript but API is in Golang
