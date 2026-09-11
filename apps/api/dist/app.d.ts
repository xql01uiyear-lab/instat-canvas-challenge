import Fastify from 'fastify';
declare module 'fastify' {
    interface FastifyRequest {
        rawJson: string;
    }
}
type Options = {
    dataFile?: string;
    generationDelayMs?: number;
    now?: () => number;
    logger?: boolean;
    corsOrigins?: string[];
};
export declare function buildApp(options?: Options): Promise<Fastify.FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault>>;
export {};
