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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagController = void 0;
const common_1 = require("@nestjs/common");
const rag_service_1 = require("./services/rag.service");
const search_rag_dto_1 = require("./dto/search-rag.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const tenant_scope_guard_1 = require("../common/guards/tenant-scope.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let RagController = class RagController {
    ragService;
    constructor(ragService) {
        this.ragService = ragService;
    }
    async searchProducts(user, dto) {
        return this.ragService.searchProducts(user.businessId, dto.query, {
            limit: dto.limit,
            confidenceThreshold: dto.confidenceThreshold,
        });
    }
    async searchKnowledge(user, dto) {
        return this.ragService.searchKnowledge(user.businessId, dto.query, {
            limit: dto.limit,
            confidenceThreshold: dto.confidenceThreshold,
        });
    }
    async search(user, dto) {
        return this.ragService.searchCombined(user.businessId, dto.query, {
            limit: dto.limit,
            confidenceThreshold: dto.confidenceThreshold,
        });
    }
    async reindexTenant(user) {
        return this.ragService.reindexTenant(user.businessId);
    }
};
exports.RagController = RagController;
__decorate([
    (0, common_1.Post)('search-products'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, search_rag_dto_1.SearchRagDto]),
    __metadata("design:returntype", Promise)
], RagController.prototype, "searchProducts", null);
__decorate([
    (0, common_1.Post)('search-knowledge'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, search_rag_dto_1.SearchRagDto]),
    __metadata("design:returntype", Promise)
], RagController.prototype, "searchKnowledge", null);
__decorate([
    (0, common_1.Post)('search'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, search_rag_dto_1.SearchRagDto]),
    __metadata("design:returntype", Promise)
], RagController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('reindex-tenant'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RagController.prototype, "reindexTenant", null);
exports.RagController = RagController = __decorate([
    (0, common_1.Controller)('rag'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_scope_guard_1.TenantScopeGuard),
    __metadata("design:paramtypes", [rag_service_1.RagService])
], RagController);
//# sourceMappingURL=rag.controller.js.map