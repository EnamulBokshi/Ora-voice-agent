import { Model } from 'mongoose';
import { AgentConfig, AgentConfigDocument, VoiceSettings, VoiceSettingsDocument, SalesPlaybook, SalesPlaybookDocument } from './schemas/agent-config.schema';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
export declare class AgentConfigService {
    private readonly agentConfigModel;
    private readonly voiceSettingsModel;
    private readonly salesPlaybookModel;
    constructor(agentConfigModel: Model<AgentConfigDocument>, voiceSettingsModel: Model<VoiceSettingsDocument>, salesPlaybookModel: Model<SalesPlaybookDocument>);
    getConfig(businessId: string): Promise<{
        config: import("mongoose").Document<unknown, {}, AgentConfigDocument, {}, import("mongoose").DefaultSchemaOptions> & AgentConfig & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        voice: import("mongoose").Document<unknown, {}, VoiceSettingsDocument, {}, import("mongoose").DefaultSchemaOptions> & VoiceSettings & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        playbook: import("mongoose").Document<unknown, {}, SalesPlaybookDocument, {}, import("mongoose").DefaultSchemaOptions> & SalesPlaybook & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
    }>;
    updateConfig(businessId: string, dto: UpdateAgentConfigDto): Promise<{
        config: import("mongoose").Document<unknown, {}, AgentConfigDocument, {}, import("mongoose").DefaultSchemaOptions> & AgentConfig & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        voice: (import("mongoose").Document<unknown, {}, VoiceSettingsDocument, {}, import("mongoose").DefaultSchemaOptions> & VoiceSettings & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        }) | null;
        playbook: (import("mongoose").Document<unknown, {}, SalesPlaybookDocument, {}, import("mongoose").DefaultSchemaOptions> & SalesPlaybook & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        }) | null;
    }>;
}
