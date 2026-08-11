import { AgentConfigService } from './agent-config.service';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
export declare class AgentConfigController {
    private readonly agentConfigService;
    constructor(agentConfigService: AgentConfigService);
    getConfig(user: JwtPayloadUser): Promise<{
        config: import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").AgentConfigDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").AgentConfig & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        voice: import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").VoiceSettingsDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").VoiceSettings & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        playbook: import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").SalesPlaybookDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").SalesPlaybook & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
    }>;
    updateConfig(user: JwtPayloadUser, dto: UpdateAgentConfigDto): Promise<{
        config: import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").AgentConfigDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").AgentConfig & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        voice: (import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").VoiceSettingsDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").VoiceSettings & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        }) | null;
        playbook: (import("mongoose").Document<unknown, {}, import("./schemas/agent-config.schema").SalesPlaybookDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/agent-config.schema").SalesPlaybook & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        }) | null;
    }>;
}
