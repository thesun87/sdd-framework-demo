import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
} from '@nestjs/common';
import { storefront } from 'shared';

import { CatalogService } from './catalog.service';

/**
 * Controller kiểm tra trạng thái các dòng giỏ hàng (T004).
 * Đường dẫn: POST /api/cart-lines/status
 * Không yêu cầu phiên đăng nhập (công khai cho Guest, Customer, Shop owner).
 */
@Controller('api/cart-lines')
export class CartLinesController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('status')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async status(@Body() rawBody: unknown): Promise<storefront.CartLinesStatusResponse> {
    const parsedRequest = storefront.CartLinesStatusRequestSchema.safeParse(rawBody);
    if (!parsedRequest.success) {
      throw new BadRequestException(
        parsedRequest.error.issues[0]?.message ?? 'Dữ liệu dòng giỏ không hợp lệ.',
      );
     }

    const response = await this.catalogService.getCartLineStatuses(parsedRequest.data);
    return storefront.CartLinesStatusResponseSchema.parse(response);
  }
}
