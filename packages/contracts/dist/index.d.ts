import { type Static, type TSchema } from '@sinclair/typebox';
export declare const object: <T extends Record<string, TSchema>>(properties: T) => import("@sinclair/typebox").TObject<T>;
export declare const Id: import("@sinclair/typebox").TString;
export declare const Node: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"prompt">;
    position: import("@sinclair/typebox").TObject<{
        x: import("@sinclair/typebox").TNumber;
        y: import("@sinclair/typebox").TNumber;
    }>;
    data: import("@sinclair/typebox").TObject<{
        text: import("@sinclair/typebox").TString;
    }>;
}>, import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"generator">;
    position: import("@sinclair/typebox").TObject<{
        x: import("@sinclair/typebox").TNumber;
        y: import("@sinclair/typebox").TNumber;
    }>;
    data: import("@sinclair/typebox").TObject<{
        label: import("@sinclair/typebox").TString;
    }>;
}>, import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"result">;
    position: import("@sinclair/typebox").TObject<{
        x: import("@sinclair/typebox").TNumber;
        y: import("@sinclair/typebox").TNumber;
    }>;
    data: import("@sinclair/typebox").TObject<{
        label: import("@sinclair/typebox").TString;
    }>;
}>]>;
export declare const Edge: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    source: import("@sinclair/typebox").TString;
    target: import("@sinclair/typebox").TString;
}>;
export declare const Graph: import("@sinclair/typebox").TObject<{
    nodes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"prompt">;
        position: import("@sinclair/typebox").TObject<{
            x: import("@sinclair/typebox").TNumber;
            y: import("@sinclair/typebox").TNumber;
        }>;
        data: import("@sinclair/typebox").TObject<{
            text: import("@sinclair/typebox").TString;
        }>;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"generator">;
        position: import("@sinclair/typebox").TObject<{
            x: import("@sinclair/typebox").TNumber;
            y: import("@sinclair/typebox").TNumber;
        }>;
        data: import("@sinclair/typebox").TObject<{
            label: import("@sinclair/typebox").TString;
        }>;
    }>, import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        type: import("@sinclair/typebox").TLiteral<"result">;
        position: import("@sinclair/typebox").TObject<{
            x: import("@sinclair/typebox").TNumber;
            y: import("@sinclair/typebox").TNumber;
        }>;
        data: import("@sinclair/typebox").TObject<{
            label: import("@sinclair/typebox").TString;
        }>;
    }>]>>;
    edges: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        source: import("@sinclair/typebox").TString;
        target: import("@sinclair/typebox").TString;
    }>>;
    viewport: import("@sinclair/typebox").TObject<{
        x: import("@sinclair/typebox").TNumber;
        y: import("@sinclair/typebox").TNumber;
        zoom: import("@sinclair/typebox").TNumber;
    }>;
}>;
export declare const Links: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
    href: import("@sinclair/typebox").TString;
    method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"GET">, import("@sinclair/typebox").TLiteral<"POST">, import("@sinclair/typebox").TLiteral<"PUT">]>;
}>>;
export declare const SpaceInput: import("@sinclair/typebox").TObject<{
    title: import("@sinclair/typebox").TString;
}>;
export declare const Space: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    links: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        href: import("@sinclair/typebox").TString;
        method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"GET">, import("@sinclair/typebox").TLiteral<"POST">, import("@sinclair/typebox").TLiteral<"PUT">]>;
    }>>;
}>;
export declare const GenerationInput: import("@sinclair/typebox").TObject<{
    nodeId: import("@sinclair/typebox").TString;
    graphETag: import("@sinclair/typebox").TString;
    scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"success">, import("@sinclair/typebox").TLiteral<"failure">]>;
}>;
export declare const Generation: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    spaceId: import("@sinclair/typebox").TString;
    nodeId: import("@sinclair/typebox").TString;
    resultNodeId: import("@sinclair/typebox").TString;
    prompt: import("@sinclair/typebox").TString;
    graphETag: import("@sinclair/typebox").TString;
    scenario: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"success">, import("@sinclair/typebox").TLiteral<"failure">]>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"processing">, import("@sinclair/typebox").TLiteral<"succeeded">, import("@sinclair/typebox").TLiteral<"failed">]>;
    createdAt: import("@sinclair/typebox").TString;
    imageUrl: import("@sinclair/typebox").TUnsafe<string | null>;
    failureCode: import("@sinclair/typebox").TUnsafe<string | null>;
    links: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        href: import("@sinclair/typebox").TString;
        method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"GET">, import("@sinclair/typebox").TLiteral<"POST">, import("@sinclair/typebox").TLiteral<"PUT">]>;
    }>>;
}>;
export declare const ErrorResponse: import("@sinclair/typebox").TObject<{
    error: import("@sinclair/typebox").TObject<{
        code: import("@sinclair/typebox").TString;
        message: import("@sinclair/typebox").TString;
    }>;
}>;
export declare const IdempotencyHeaders: import("@sinclair/typebox").TObject<{
    'idempotency-key': import("@sinclair/typebox").TString;
}>;
export declare const GraphHeaders: import("@sinclair/typebox").TObject<{
    'if-match': import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const Config: import("@sinclair/typebox").TObject<{
    debounceMs: import("@sinclair/typebox").TInteger;
    pollIntervalMs: import("@sinclair/typebox").TInteger;
    generationDelayMs: import("@sinclair/typebox").TInteger;
    maxNodes: import("@sinclair/typebox").TInteger;
    maxEdges: import("@sinclair/typebox").TInteger;
    nodeTypes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    links: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TObject<{
        href: import("@sinclair/typebox").TString;
        method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"GET">, import("@sinclair/typebox").TLiteral<"POST">, import("@sinclair/typebox").TLiteral<"PUT">]>;
    }>>;
}>;
export type GraphData = Static<typeof Graph>;
export type NodeData = Static<typeof Node>;
export type GenerationData = Static<typeof Generation>;
export type GenerationRequest = Static<typeof GenerationInput>;
export type SpaceData = Static<typeof Space>;
