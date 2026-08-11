import { ConfigService } from '@nestjs/config';
export declare class EmbeddingService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    generateEmbedding(text: string): Promise<number[]>;
    cosineSimilarity(vecA: number[], vecB: number[]): number;
    private normalizeVector;
    private generateFallbackVector;
}
