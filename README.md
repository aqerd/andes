<h1 align="center">Andes</h1>
<p align="center">
    <img src="./media/marketicon.png" width="64" height="64"/>
</p>

A VS Code extension that supports Ollama models in UI locally.

## How to build
Make sure you have installed npm, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama.
Before testing make sure you have `code` installed in your PATH.
- Press `CMD + Shift + P` and search for `Shell Command: Install 'code' command in PATH`;
- Restart VS Code.

And you ready for extension testing:
- First, run `make` in Terminal. It will instal necessary dependencies;
- Go to `Run` -> `Start Debugging` (or just Press `F5`)
- Wait until the new VS Code window will appear (Extension Development Host);
- Press `CMD + Shift + P` and search for `Andes`;
- Make sure ollama is serving: run `ollama serve` in Terminal on port 11434.

## Features
- View list of your local Ollama models
- Generate some text

## Requirements
Node.js, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama

## TODO
- Add support for more API endpoints in this plugin (delete, install models)
- Add support for models with images
- Add support for custom models
- File linking in textarea

## About project
Sadly it's written in TypeScript

<!-- 
## Extension Settings

## Known Issues

## Release Notes

## Following extension guidelines

## Working with Markdown

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/) -->
