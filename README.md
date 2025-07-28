# Andes 
<img src="media/favicon.svg" width="16" height="16" fill="white"/> 

A VS Code extension that supports Ollama models in UI locally.

## How to test locally
Make sure you have installed npm, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama.
Before testing make sure you have `code` installed in your PATH.
- Press `CMD + Shift + P` and search for `Shell Command: Install 'code' command in PATH`
- Restart VS Code

And you ready for extension testing:
- First, run `make` in Terminal
- Go to `Run` -> `Start Debugging` (or just Press `F5`)
- Wait until the new VS Code window will appear (Extension Development Host)
- Press `CMD + Shift + P` and search for `Andes`
- Make sure ollama is serving: run `ollama serve` in Terminal

## Features
- View list of your local Ollama models
- Generate some text

## Requirements
`npm`, VS Code (Cursor, Windsurf and Trae doesn't work) and Ollama

## TODO
- Add support for more API endpoints in this plugin (delete, install models)
- Add support for models with images
- Markdown parsing
- Add support for custom models
- Better UI
- File linking in textarea

## About
sadly it's written in TypeScript

<!-- 
## Extension Settings

## Known Issues

## Release Notes

## Following extension guidelines

## Working with Markdown

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/) -->
