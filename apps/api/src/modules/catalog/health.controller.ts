// apps/api/src/modules/catalog/health.controller.ts
//
// `GET /api/health` (contracts/storefront-http.md §GET /api/health). Hợp đồng không định
// nghĩa hình dạng thân response — chỉ mã trạng thái (200 khi lành mạnh) — và nói hệ thống
// "Chuyển sang không lành mạnh khi một migration thất bại hoặc CHECK (quantity >= 0) bị vi
// phạm". Ở quy mô walking skeleton, `SELECT 1` qua đúng pool kết nối mà `catalog`/`stock`
// dùng là phép kiểm tối thiểu trung thực với câu đó: nếu PostgreSQL không nối được (kể cả vì
// một CHECK constraint khiến pool mất kết nối, hoặc migration chưa chạy nên bảng không tồn
// tại), request này thất bại và endpoint trả không-lành-mạnh thay vì 200 giả.
import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { Pool } from 'pg';

import { PG_POOL } from './pg-pool.provider';

@Controller('api/health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.pool.query('SELECT 1');
    } catch (cause) {
      // Đi qua `ErrorEnvelopeFilter` như mọi exception khác — không thân response tự khai ở
      // đây, không leak chi tiết lỗi driver `pg` ra client.
      throw new HttpException(
        { code: 'UNHEALTHY', message: 'Hệ thống hiện không lành mạnh.' },
        HttpStatus.SERVICE_UNAVAILABLE,
        { cause: cause as Error },
      );
    }
    return { status: 'ok' };
  }
}
