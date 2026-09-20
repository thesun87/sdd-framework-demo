// apps/api/src/modules/catalog/pg-pool.provider.ts
//
// Kết nối PostgreSQL DUY NHẤT của tiến trình `apps/api` — dùng chung cho hai việc:
//   1. Đọc trực tiếp `product`/`product_image` (`catalog.repository.ts`, cùng module).
//   2. Truyền làm tham số `unitOfWork` cho lời gọi `stock.public.ts` (`getStockStatus`) —
//      AD-5 chỉ cấm `catalog` tự SELECT/JOIN lên bảng của `stock`, KHÔNG cấm dùng chung một
//      connection pool để GỌI hàm công khai của module đó; `StockUnitOfWork` (`stock.contract.ts`)
//      chỉ đòi hỏi hình dạng `Pick<PoolClient, 'query'>`, và `pg.Pool` khớp đúng hình dạng đó
//      (cùng overload `query(text, values?): Promise<QueryResult<T>>` như `PoolClient`).
//
// `apps/api/package.json` CHƯA khai `pg` là dependency thật — cùng khoản nợ mà
// `stock.repository.ts`/`stock.public.ts` đã để lại (task-009-report.md §7, dựa vào npm
// workspace hoisting của `pg` là dependency GỐC repo). Brief của T011 chỉ yêu cầu trả nợ
// dependency cho `packages/shared` (mục "Nợ dependency phải trả" của task-011-brief.md) —
// khoản nợ `pg` không nằm trong phạm vi task này, ghi lại ở đây để không ai hiểu nhầm là đã
// xử lý.
import { Inject, Injectable, type OnModuleDestroy, type Provider } from '@nestjs/common';
import { Pool, types as pgTypes } from 'pg';

import { ENV, type AppEnv } from './env.provider';

// Cùng registry OID TOÀN TIẾN TRÌNH mà `stock/stock.repository.ts` đã sửa cho OID 20
// (bigint/int8) — xem cảnh báo đầy đủ ở đầu file đó (task-009-report.md §4/§8). Đăng ký lại
// Ở ĐÂY một cách TƯỜNG MINH (không dựa vào thứ tự import module nào chạy trước module nào
// trong cùng tiến trình): idempotent — ghi đè cùng một hàm, an toàn khi nhiều module cùng
// gọi. Nếu không có dòng này, `product.id`/`product.price` (cột `bigint` theo
// `db/schema/catalog.ts`) đọc qua `pool.query` thô của module này sẽ ra CHUỖI thay vì SỐ nếu
// tình cờ `stock` chưa được import trước — `catalog` không nên phụ thuộc một side-effect
// "âm thầm" của module khác cho tính đúng của chính nó. Đây chính là cách Requirement #4 của
// brief ("bigint phải serialise thành số nguyên JSON, xử lý tường minh") được xử lý: giá trị
// `number` (không phải JS `bigint`) tới tận factory `ProductSummarySchema`/`ProductDetailSchema`
// của `packages/shared`, nên `JSON.stringify` (Express `res.json`) serialise nó như một số
// nguyên bình thường — không bao giờ có JS `bigint` thật đi qua lớp này.
pgTypes.setTypeParser(20, (value: string) => Number(value));

export const PG_POOL = Symbol('PG_POOL');

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ENV],
  useFactory: (env: AppEnv): Pool => new Pool({ connectionString: env.DATABASE_URL }),
};

/** Đóng pool khi app tắt (`app.close()` — cả `main.ts` thật lẫn `afterAll` của test T010) để
 *  không rò kết nối `pg` giữa các file test chạy tuần tự trong cùng tiến trình Jest. */
@Injectable()
export class PgPoolLifecycle implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
