import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailCampaignService } from './services/email-campaign.service';
import { NoSubscriptionRequired } from '../common/decorators/no-subscription-required.decorator';

/**
 * Public marketing endpoints.
 *
 * Unauthenticated on purpose: an unsubscribe link has to work from a mail client,
 * years later, with no session. The signed token in the link is what authorizes it.
 */
@NoSubscriptionRequired()
@Controller('marketing')
export class MarketingController {
  constructor(private readonly campaignService: EmailCampaignService) {}

  @Get('unsubscribe')
  async unsubscribe(
    @Query('u') userId: string,
    @Query('t') token: string,
    @Res() res: Response,
  ) {
    // Answered as a page rather than JSON: a person clicked this in their inbox.
    try {
      const { email } = await this.campaignService.unsubscribe(userId, token);
      res.status(HttpStatus.OK).send(unsubscribePage(
        'You are unsubscribed',
        `${email ?? 'This address'} will no longer receive promotional email from ORA. Account, billing and security notices are unaffected.`,
      ));
    } catch {
      res.status(HttpStatus.BAD_REQUEST).send(unsubscribePage(
        'That link did not work',
        'This unsubscribe link is not valid or has already been used. Reply to any ORA email and we will remove you by hand.',
      ));
    }
  }
}

function unsubscribePage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — ORA</title></head>
<body style="margin:0;background:#111111;color:#FAFAFA;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:64px 24px;">
    <div style="background:#181818;border:1px solid #262626;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;letter-spacing:-0.4px;">${title}</h1>
      <p style="margin:0;color:#D1D5DB;font-size:14px;line-height:22px;">${body}</p>
    </div>
  </div>
</body></html>`;
}
