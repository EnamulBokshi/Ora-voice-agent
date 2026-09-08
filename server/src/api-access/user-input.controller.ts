import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserInputService } from './user-input.service';
import { OAuthScopesGuard } from './guards/oauth-scopes.guard';
import { Scopes } from './decorators/scopes.decorator';
import { ApiScope } from './schemas/api-client.schema';
import { SubmitPromptDto } from './dto/submit-prompt.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';

/**
 * Machine-to-machine user-input API, protected by the OAuth 2.0
 * client-credentials grant. Mirrors the input surfaces the dashboard exposes:
 * a free-text prompt, a text document, and a file upload.
 *
 * The tenant is taken from `req.businessId`, which OAuthScopesGuard populates
 * from the verified access token. No handler here reads a tenant identifier
 * from the request body, query or headers.
 */
@Controller('inputs')
@UseGuards(OAuthScopesGuard)
export class UserInputController {
  constructor(private readonly userInputService: UserInputService) {}

  /** POST /api/v1/inputs/prompt -- capture one end-user prompt. */
  @Post('prompt')
  @Scopes(ApiScope.INPUTS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  async submitPrompt(@Req() req: any, @Body() dto: SubmitPromptDto) {
    return this.userInputService.submitPrompt(
      req.businessId,
      req.apiClientId,
      dto,
    );
  }

  /** POST /api/v1/inputs/documents -- submit a text document. */
  @Post('documents')
  @Scopes(ApiScope.INPUTS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  async submitDocument(@Req() req: any, @Body() dto: SubmitDocumentDto) {
    return this.userInputService.submitDocument(req.businessId, dto);
  }

  /**
   * POST /api/v1/inputs/documents/upload -- submit a file (PDF, TXT, MD, CSV, JSON).
   * multipart/form-data with a `file` field.
   */
  @Post('documents/upload')
  @Scopes(ApiScope.INPUTS_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async submitUpload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType?: string,
    @Body('title') title?: string,
  ) {
    return this.userInputService.submitUpload(
      req.businessId,
      file,
      docType,
      title,
    );
  }

  /** GET /api/v1/inputs/prompt-sessions -- read back this tenant's captured sessions. */
  @Get('prompt-sessions')
  @Scopes(ApiScope.INPUTS_READ)
  async listPromptSessions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userInputService.listPromptSessions(
      req.businessId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}
