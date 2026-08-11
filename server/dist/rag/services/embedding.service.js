"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    configService;
    logger = new common_1.Logger(EmbeddingService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async generateEmbedding(text) {
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (apiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'models/text-embedding-004',
                        content: { parts: [{ text }] },
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.embedding?.values) {
                        return this.normalizeVector(data.embedding.values);
                    }
                }
            }
            catch (err) {
                this.logger.warn(`Gemini Embedding API call failed: ${err.message}. Using fallback vectorizer.`);
            }
        }
        return this.generateFallbackVector(text);
    }
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length || vecA.length === 0)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        return Math.max(0, Math.min(1, similarity));
    }
    normalizeVector(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return norm === 0 ? vector : vector.map((val) => val / norm);
    }
    generateFallbackVector(text, dimensions = 768) {
        const vector = new Array(dimensions).fill(0);
        const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        if (tokens.length === 0)
            return vector;
        for (const token of tokens) {
            let hash = 0;
            for (let i = 0; i < token.length; i++) {
                hash = (hash << 5) - hash + token.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % dimensions;
            vector[index] += 1;
        }
        return this.normalizeVector(vector);
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map