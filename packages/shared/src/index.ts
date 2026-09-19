// Điểm vào duy nhất của `shared` — nguồn sự thật cho mọi hình dạng đi qua biên HTTP của
// feature 000 (AD-10). Hai bề mặt, hai không gian tên tách theo thư mục/module:
//
//   - `storefront` — hình dạng feature 000 dùng (danh sách/chi tiết Sản phẩm).
//   - `backoffice` — để trống có chủ đích ở 000; feature 006 sẽ lấp.
//   - `common`     — hình dạng mà CẢ HAI bề mặt cần ở cùng một dạng. Ở 000 chỉ có envelope
//                    lỗi thuộc về đây.
//   - `config`     — schema cấu hình triển khai (không phải hình dạng HTTP, nhưng cũng là
//                    "nguồn sự thật duy nhất" theo cùng nguyên tắc — xem AD-10, §Consistency).
//
// Không khai lại interface/type cho bất kỳ hình dạng nào ở đây tại `apps/**` — import từ
// đây, luôn từ schema, không tự suy diễn lại.
export * as storefront from "./storefront/index.js";
export * as backoffice from "./backoffice/index.js";
export * as common from "./common/index.js";
export * as config from "./config/index.js";
