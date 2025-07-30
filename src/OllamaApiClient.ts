import type { RequestInfo, RequestInit, Response } from 'node-fetch';

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
        return data.html_text;
    }
}
