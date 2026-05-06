<h1 align="center">Andes</h1>
<p align="center">
    <img src="./media/marketicon.png" width="64" height="64"/>
</p>

![Current Version](https://img.shields.io/github/package-json/v/aqerd/andes?color=370A0A&labelColor=AC3838)
![GitHub commit activity](https://img.shields.io/github/commit-activity/t/aqerd/andes?color=370A0A&labelColor=AC3838)
![GitHub Repo stars](https://img.shields.io/github/stars/aqerd/andes?style=flat&color=370A0A&labelColor=AC3838)
![GitHub License](https://img.shields.io/github/license/aqerd/andes?color=370A0A&labelColor=AC3838)
![Author & Maintainer](https://img.shields.io/badge/author%20%26%20maintainer-Ruslan%20Suleymanov-370A0A?style=flat&labelColor=AC3838) \
![Open VSX Release Date](https://img.shields.io/open-vsx/release-date/aqerd/andes-rs?color=370A0A&labelColor=AC3838)
![Open VSX Downloads](https://img.shields.io/open-vsx/dt/aqerd/andes-rs?label=open%20vsx%20downloads&color=370A0A&labelColor=AC3838)
![Visual Studio Marketplace Downloads](https://vsmarketplacebadges.dev/downloads/aqerd.andes-rs.svg?color=370A0A&labelColor=AC3838)

A Visual Studio Code (or Cursor, Windsurf etc) extension that provides a local UI interface for Ollama models. 

This project is no longer actively maintained and may contain bugs. I recommend using [Cline](https://github.com/cline/cline) instead.

Install it on [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=aqerd.andes-rs) or [Open VSX](https://open-vsx.org/extension/aqerd/andes-rs)

## Requirements
Node.js, Golang, VS Code (Cursor, Windsurf and Trae doesn't work somehow), make and Ollama.

## How to build
Set environment variables in `.env` file, copying params from `.env.example` file.
Make sure you have installed npm, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama.
Before testing make sure you have `code` installed in your PATH.
- Press `CMD + Shift + P` and search for `Shell Command: Install 'code' command in PATH`;
- Restart VS Code.

And you are ready for extension testing:
- First, run `make` in Terminal. It will instal necessary dependencies;
- Go to `Run` -> `Start Debugging` (or just Press `F5`)
- Wait until the new VS Code window will appear (Extension Development Host);
- Press `CMD + Shift + P` and search for `Andes`;
- Make sure ollama is serving: run `ollama serve` in Terminal on port `11434`.

## Features
- Manage your installed Ollama models locally;
- Chat with AI;
- Observe the reasoning process and decision-making of AI models.

## Changelog
Visit [CHANGELOG.md](./CHANGELOG.md).

## TODO
Visit [TODO.md](./TODO.md).

## About project
I created Andes to provide a simple, authentication-free VS Code extension that works exclusively with Ollama models in VSC, Windsurf, Trae, Cursor and other VSC forks. While other plugins like Cline & Continue support multiple AI providers with authentication needed, I wanted a focused solution specifically for local Ollama models.

Sadly it's written in TypeScript, but API for Markdown-to-HTML formating is in Golang. Initially i wanted to write this project in Golang, but it's simplier to write it in TypeScript since i can request Ollama's endpoints directly from TypeScript.
