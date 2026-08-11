"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConfigModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const agent_config_service_1 = require("./agent-config.service");
const agent_config_controller_1 = require("./agent-config.controller");
const agent_config_schema_1 = require("./schemas/agent-config.schema");
let AgentConfigModule = class AgentConfigModule {
};
exports.AgentConfigModule = AgentConfigModule;
exports.AgentConfigModule = AgentConfigModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: agent_config_schema_1.AgentConfig.name, schema: agent_config_schema_1.AgentConfigSchema },
                { name: agent_config_schema_1.VoiceSettings.name, schema: agent_config_schema_1.VoiceSettingsSchema },
                { name: agent_config_schema_1.SalesPlaybook.name, schema: agent_config_schema_1.SalesPlaybookSchema },
            ]),
        ],
        controllers: [agent_config_controller_1.AgentConfigController],
        providers: [agent_config_service_1.AgentConfigService],
        exports: [agent_config_service_1.AgentConfigService, mongoose_1.MongooseModule],
    })
], AgentConfigModule);
//# sourceMappingURL=agent-config.module.js.map