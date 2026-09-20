// apps/api/src/modules/catalog/product-not-found.exception.ts
//
// FR-004 — Sản phẩm không tồn tại → HTTP 404, envelope lỗi DÙNG CHUNG của `packages/shared`
// (`common.ErrorEnvelopeSchema`, T006): `{ error: { code, message } }`. Không dùng
// `NotFoundException` mặc định của Nest — hình dạng response mặc định của nó
// (`{ statusCode, message, error }`) không khớp envelope, và `error-envelope.filter.ts` cần
// đọc lại đúng `{ code, message }` từ `getResponse()` để không phải khai một khối "biết tên
// từng exception" ở tầng filter.
import { HttpException, HttpStatus } from '@nestjs/common';

export class ProductNotFoundException extends HttpException {
  constructor() {
    super({ code: 'PRODUCT_NOT_FOUND', message: 'Sản phẩm không tồn tại.' }, HttpStatus.NOT_FOUND);
  }
}
