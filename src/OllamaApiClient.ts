import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

interface OllamaTagsResponse {
    models: OllamaModel[];
}

interface OllamaGenerateResponse {
    response: string;
    done: boolean;
}

type FetchFunction = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

interface ConvertResponse {
    html_text: string;
}

interface OllamaChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string; 
}

interface OllamaChatResponse {
    message: OllamaChatMessage;
    done: boolean;
}

export class OllamaApiClient {
    private baseUrl: string;
    private readonly fetch: FetchFunction;

    private constructor(baseUrl: string, fetchImpl?: FetchFunction) {
        this.baseUrl = baseUrl;
        if (fetchImpl) {
            this.fetch = fetchImpl;
        } else {
            this.fetch = (() => { throw new Error('Fetch function not initialized'); }) as any;
        }
    }

    public static async create(baseUrl: string = 'http://localhost:11434'): Promise<OllamaApiClient> {
        const { default: fetch } = await import('node-fetch');
        return new OllamaApiClient(baseUrl, fetch);
    }

    public async listModels(): Promise<OllamaModel[]> {
        const response = await this.fetch(`${this.baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json() as OllamaTagsResponse;
        return data.models;
    }

    public async generate(prompt: string, model: string): Promise<string> {
        const response = await this.fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.statusText}, ${errorText}`);
        }

        const data = await response.json() as OllamaGenerateResponse;
        
        try {
            const htmlResponse = await this.convertMarkdownToHtml(data.response);
            return htmlResponse;
        } catch (error) {
            console.error('Markdown conversion failed, returning raw response:', error);
            return data.response;
        }
    }

    public async convertMarkdownToHtml(markdownText: string): Promise<string> {
        const response = await fetch(`http://localhost:11212/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                markdown_text: markdownText
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Conversion API error: ${response.statusText}, ${errorText}`);
        }

        const data = await response.json() as ConvertResponse;
        return data.html_text.trim();
    }

    private chatHistory: OllamaChatMessage[] = [];
    private systemPrompt: string | null = null;

    private async ensureSystemPrompt() {
        if (this.systemPrompt === null) {
            const promptPath = path.resolve(__dirname, '../static/rules/system_prompt.md');
            this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
        }
    }

    public async chat(message: string, model: string): Promise<OllamaChatMessage[]> {
        await this.ensureSystemPrompt();
        if (this.chatHistory.length === 0 && this.systemPrompt) {
            this.chatHistory.push({ role: 'system', content: this.systemPrompt });
        }
        this.chatHistory.push({ role: 'user', content: message });
        const response = await this.fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: this.chatHistory,
                stream: false
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.statusText}, ${errorText}`);
        }
        const data = await response.json() as OllamaChatResponse;
        try {
            const htmlResponse = await this.convertMarkdownToHtml(data.message.content);
            this.chatHistory.push({ ...data.message, content: htmlResponse, model: model });
        } catch (error) {
            console.error('Markdown conversion failed for chat response, returning raw response:', error);
            this.chatHistory.push({ ...data.message, model: model });
        }
        return [...this.chatHistory];
    }

    public clearChatHistory(): void {
        this.chatHistory = [];
        if (this.systemPrompt) {
            this.chatHistory.push({ role: 'system', content: this.systemPrompt });
        }
    }
}
