import { RagService } from './services/rag.service';
import { SearchRagDto } from './dto/search-rag.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class RagController {
    private readonly ragService;
    constructor(ragService: RagService);
    searchProducts(user: JwtPayloadUser, dto: SearchRagDto): Promise<{
        query: string;
        fallbackTriggered: boolean;
        results: import("./interfaces/vector-entry.interface").SearchResultItem[];
    }>;
    searchKnowledge(user: JwtPayloadUser, dto: SearchRagDto): Promise<{
        query: string;
        results: import("./interfaces/vector-entry.interface").SearchResultItem[];
    }>;
    search(user: JwtPayloadUser, dto: SearchRagDto): Promise<{
        query: string;
        fallbackTriggered: boolean;
        products: import("./interfaces/vector-entry.interface").SearchResultItem[];
        knowledge: import("./interfaces/vector-entry.interface").SearchResultItem[];
    }>;
    reindexTenant(user: JwtPayloadUser): Promise<{
        message: string;
        indexedProducts: number;
        indexedChunks: number;
    }>;
}
