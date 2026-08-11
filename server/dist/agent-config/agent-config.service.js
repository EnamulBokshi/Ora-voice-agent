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
exports.AgentConfigService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const agent_config_schema_1 = require("./schemas/agent-config.schema");
let AgentConfigService = class AgentConfigService {
    agentConfigModel;
    voiceSettingsModel;
    salesPlaybookModel;
    constructor(agentConfigModel, voiceSettingsModel, salesPlaybookModel) {
        this.agentConfigModel = agentConfigModel;
        this.voiceSettingsModel = voiceSettingsModel;
        this.salesPlaybookModel = salesPlaybookModel;
    }
    async getConfig(businessId) {
        const bId = businessId;
        let [config, voice, playbook] = await Promise.all([
            this.agentConfigModel.findOne({ businessId: bId }).exec(),
            this.voiceSettingsModel.findOne({ businessId: bId }).exec(),
            this.salesPlaybookModel.findOne({ businessId: bId }).exec(),
        ]);
        if (!config) {
            config = await new this.agentConfigModel({ businessId: bId }).save();
        }
        if (!voice) {
            voice = await new this.voiceSettingsModel({ businessId: bId }).save();
        }
        if (!playbook) {
            playbook = await new this.salesPlaybookModel({ businessId: bId }).save();
        }
        return {
            config,
            voice,
            playbook,
        };
    }
    async updateConfig(businessId, dto) {
        const bId = businessId;
        const { voiceId, upsellCategories, mentionLowStockUrgency, ...configFields } = dto;
        const [config, voice, playbook] = await Promise.all([
            this.agentConfigModel.findOneAndUpdate({ businessId: bId }, { $set: configFields }, { upsert: true, new: true }).exec(),
            voiceId
                ? this.voiceSettingsModel.findOneAndUpdate({ businessId: bId }, { $set: { voiceId } }, { upsert: true, new: true }).exec()
                : this.voiceSettingsModel.findOne({ businessId: bId }).exec(),
            upsellCategories !== undefined || mentionLowStockUrgency !== undefined
                ? this.salesPlaybookModel.findOneAndUpdate({ businessId: bId }, {
                    $set: {
                        ...(upsellCategories !== undefined ? { upsellCategories } : {}),
                        ...(mentionLowStockUrgency !== undefined
                            ? { mentionLowStockUrgency }
                            : {}),
                    },
                }, { upsert: true, new: true }).exec()
                : this.salesPlaybookModel.findOne({ businessId: bId }).exec(),
        ]);
        return {
            config,
            voice,
            playbook,
        };
    }
};
exports.AgentConfigService = AgentConfigService;
exports.AgentConfigService = AgentConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(agent_config_schema_1.AgentConfig.name)),
    __param(1, (0, mongoose_1.InjectModel)(agent_config_schema_1.VoiceSettings.name)),
    __param(2, (0, mongoose_1.InjectModel)(agent_config_schema_1.SalesPlaybook.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AgentConfigService);
//# sourceMappingURL=agent-config.service.js.map