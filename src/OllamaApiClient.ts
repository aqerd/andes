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

export class OllamaApiClient {
    private readonly baseUrl: string;
    private readonly fetch: FetchFunction;

    private constructor(baseUrl: string, fetch: FetchFunction) {
        this.baseUrl = baseUrl;
        this.fetch = fetch;
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
        return data.response;
    }
}
