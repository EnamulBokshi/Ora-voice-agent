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
exports.AgentConfigController = void 0;
const common_1 = require("@nestjs/common");
const agent_config_service_1 = require("./agent-config.service");
const update_agent_config_dto_1 = require("./dto/update-agent-config.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const tenant_scope_guard_1 = require("../common/guards/tenant-scope.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AgentConfigController = class AgentConfigController {
    agentConfigService;
    constructor(agentConfigService) {
        this.agentConfigService = agentConfigService;
    }
    async getConfig(user) {
        return this.agentConfigService.getConfig(user.businessId);
    }
    async updateConfig(user, dto) {
        return this.agentConfigService.updateConfig(user.businessId, dto);
    }
};
exports.AgentConfigController = AgentConfigController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgentConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_agent_config_dto_1.UpdateAgentConfigDto]),
    __metadata("design:returntype", Promise)
], AgentConfigController.prototype, "updateConfig", null);
exports.AgentConfigController = AgentConfigController = __decorate([
    (0, common_1.Controller)('agent-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_scope_guard_1.TenantScopeGuard),
    __metadata("design:paramtypes", [agent_config_service_1.AgentConfigService])
], AgentConfigController);
//# sourceMappingURL=agent-config.controller.js.map