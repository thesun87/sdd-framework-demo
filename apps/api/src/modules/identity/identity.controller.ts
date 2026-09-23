// apps/api/src/modules/identity/identity.controller.ts
//
// Endpoints xác thực và tài khoản: /api/auth/* (contracts/storefront-http.md).
// Tuân thủ AD-8: cookie shop_session HttpOnly, SameSite=Lax, Path=/, Max-Age=7776000 (90 ngày).
// Điểm ra duy nhất xác thực bằng schema packages/shared (AD-10).

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { storefront } from 'shared';
import { IdentityService, SESSION_COOKIE_NAME } from './identity.service';

interface HttpResponse {
  setHeader(name: string, value: string | string[]): void;
}

interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
}

function extractCookieToken(req: HttpRequest): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return undefined;
  }
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : undefined;
}

function buildSetCookieHeader(token: string): string {
  // 90 ngày = 7,776,000 giây
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000`;
}

function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

@Controller('api/auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * POST /api/auth/register (US1)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<storefront.AuthResponse> {
    const result = await this.identityService.register(body);
    res.setHeader('Set-Cookie', buildSetCookieHeader(result.sessionToken));
    return storefront.AuthResponseSchema.parse({
      account: result.account,
    });
  }

  /**
   * POST /api/auth/login (US2, US4)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<storefront.AuthResponse> {
    const result = await this.identityService.login(body);
    res.setHeader('Set-Cookie', buildSetCookieHeader(result.sessionToken));
    return storefront.AuthResponseSchema.parse({
      account: result.account,
    });
  }

  /**
   * POST /api/auth/logout (US3)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: HttpRequest,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<{ success: boolean }> {
    const token = extractCookieToken(req);
    await this.identityService.logout(token);
    res.setHeader('Set-Cookie', buildClearCookieHeader());
    return { success: true };
  }

  /**
   * GET /api/auth/me (US1, US2, US3)
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: HttpRequest): Promise<storefront.CurrentUserResponse> {
    const token = extractCookieToken(req);
    const account = await this.identityService.getCurrentUser(token);
    return storefront.CurrentUserResponseSchema.parse({
      account,
    });
  }
}
