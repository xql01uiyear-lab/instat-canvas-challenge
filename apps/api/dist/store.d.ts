import type { GraphData, GenerationData, GenerationRequest, SpaceData } from '@canvas/contracts';
export { DomainError, matchesETag } from './http.js';
export declare const etag: (raw: string) => string;
export declare class Store {
    private file?;
    readonly delayMs: number;
    private now;
    private state;
    constructor(file?: string | undefined, delayMs?: number, now?: () => number);
    private commit;
    private storedSpace;
    space(id: string): SpaceData;
    spaces(): {
        id: string;
        createdAt: string;
        links: {
            [x: string]: {
                href: string;
                method: "GET" | "POST" | "PUT";
            };
        };
        title: string;
    }[];
    createSpace(title: string): {
        id: string;
        createdAt: string;
        links: {
            [x: string]: {
                href: string;
                method: "GET" | "POST" | "PUT";
            };
        };
        title: string;
    };
    graph(id: string): {
        raw: string;
        etag: string;
        data: GraphData;
    };
    saveGraph(id: string, raw: string, condition?: string): {
        raw: string;
        etag: string;
        data: GraphData;
    };
    private validateGraph;
    generation(spaceId: string, id: string): GenerationData;
    generations(spaceId: string): {
        id: string;
        spaceId: string;
        nodeId: string;
        resultNodeId: string;
        prompt: string;
        graphETag: string;
        scenario: "success" | "failure";
        status: "processing" | "succeeded" | "failed";
        createdAt: string;
        imageUrl: string | null;
        failureCode: string | null;
        links: {
            [x: string]: {
                href: string;
                method: "GET" | "POST" | "PUT";
            };
        };
    }[];
    createGeneration(spaceId: string, body: GenerationRequest, key: string): {
        data: {
            id: string;
            spaceId: string;
            nodeId: string;
            resultNodeId: string;
            prompt: string;
            graphETag: string;
            scenario: "success" | "failure";
            status: "processing" | "succeeded" | "failed";
            createdAt: string;
            imageUrl: string | null;
            failureCode: string | null;
            links: {
                [x: string]: {
                    href: string;
                    method: "GET" | "POST" | "PUT";
                };
            };
        };
        created: boolean;
    };
}
