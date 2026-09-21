// apps/api/src/modules/catalog/catalog-response-assertions.ts
//
// Assertion dùng chung cho hai bằng chứng trung tâm của FR-007/AD-19/SC-005 — KHÔNG chứa
// logic nghiệp vụ `catalog`, chỉ là hạ tầng test (cùng vai trò với `catalog-test-support.ts`,
// tách riêng file để mỗi spec không phải chép lại logic quét response).
//
// SC-005 nói rõ: kiểm bằng cách đọc TOÀN BỘ nội dung response, KHÔNG chỉ vài trường đã biết.
// Hai hàm dưới đây cố tình KHÔNG dựa vào `res.body` (JSON đã parse, chỉ thấy trường mà chính
// object đó có) làm nguồn duy nhất — luôn nhận THÊM `rawText` (thân response dạng chuỗi thô,
// `res.text`) và quét nó độc lập với `res.body`, để bắt được cả trường hợp giá trị tồn kho bị
// nhét vào một chuỗi lồng sâu (vd. trong `description`) mà một schema `.strict()` ở tầng
// object không thể phát hiện (schema chỉ chặn được KHOÁ lạ, không chặn được GIÁ TRỊ lạ nằm
// trong một trường hợp lệ về kiểu).

/**
 * Duyệt đệ quy MỌI khoá của một giá trị JSON đã parse (object lồng bao sâu cũng tới), thu
 * thập toàn bộ tên khoá gặp được. Dùng để khẳng định không khoá nào — ở BẤT KỲ độ sâu nào —
 * mang tên liên quan tới số lượng tồn kho, kể cả một khoá mới bị thêm vào một trường lồng sâu
 * trong tương lai mà không ai để ý khi review diff.
 */
function collectAllKeysDeep(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectAllKeysDeep(item, acc);
    return acc;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      acc.push(key);
      collectAllKeysDeep(nested, acc);
    }
    return acc;
  }
  return acc;
}

/** Biến thể tên trường có thể được dùng để lén lộ con số tồn kho — khớp không phân biệt hoa/thường. */
const FORBIDDEN_KEY_PATTERN =
  /(quantity|inventory|availableunits|units_?available|remainingstock|remaining_stock|instockcount|\bqty\b)|stock(?!_?status)/i;

/**
 * Khẳng định KHÔNG có bất kỳ khoá nào (ở bất kỳ độ sâu nào của response đã parse) mang tên
 * liên quan tới số lượng tồn kho. Bổ sung cho `.strict()` của schema `packages/shared`
 * (schema chỉ chặn được khoá lạ Ở ĐÚNG CẤP nó khai; hàm này quét toàn bộ cây, không phụ
 * thuộc cấu trúc mà schema mô tả).
 */
export function assertNoForbiddenQuantityKey(parsedBody: unknown): void {
  const keys = collectAllKeysDeep(parsedBody);
  const offending = keys.filter((key) => FORBIDDEN_KEY_PATTERN.test(key));
  if (offending.length > 0) {
    throw new Error(
      `Response chứa (các) khoá bị cấm liên quan tới số lượng tồn kho: ${offending.join(', ')} ` +
        `— FR-007/AD-19 cấm con số tồn kho chính xác rời server dưới BẤT KỲ tên trường nào.`,
    );
  }
}

/**
 * Khẳng định con số tồn kho THẬT (đã seed trong DB cho test) không xuất hiện Ở BẤT KỲ ĐÂU
 * trong thân response THÔ (chuỗi, chưa parse) — kể cả lồng trong một chuỗi văn bản của một
 * trường hợp lệ (vd. `description`), điều mà việc parse JSON rồi kiểm từng trường không bao
 * giờ bắt được. Dùng ranh giới không-phải-chữ-số ở hai đầu để không trùng khớp giả khi con số
 * đó tình cờ là một chuỗi con của một số khác (vd. `id`/`price`) — do đó MỖI test PHẢI seed
 * một giá trị `quantity` không trùng chữ số với `id`/`price` của chính fixture đó (xem
 * `pickDistinctiveQuantity`).
 */
export function assertRawBodyNeverContainsQuantity(rawText: string, quantity: number): void {
  const boundaryPattern = new RegExp(`(?<!\\d)${quantity}(?!\\d)`);
  if (boundaryPattern.test(rawText)) {
    throw new Error(
      `Thân response thô chứa con số tồn kho thật (${quantity}) — SC-005 yêu cầu đọc TOÀN BỘ ` +
        `nội dung, không chỉ vài trường đã biết. Thân response: ${rawText}`,
    );
  }
  // Quét thêm chính từ khoá "quantity"/"inventory" ở dạng chuỗi thô (không qua JSON.parse) —
  // bắt được cả trường hợp response không phải JSON hợp lệ hoặc khoá nằm trong một cấu trúc
  // bất ngờ (vd. escaped trong một chuỗi khác).
  if (
    /quantity|inventory|stock_count|stockcount|available_units|remaining_stock/i.test(rawText) ||
    /"stock"\s*:/i.test(rawText)
  ) {
    throw new Error(
      `Thân response thô chứa từ khoá tồn kho bị cấm — cấm tuyệt đối theo FR-007/AD-19. ` +
        `Thân response: ${rawText}`,
    );
  }
}

/**
 * Sinh một giá trị `quantity` "đặc trưng" (không trùng bất kỳ chữ số nào với `id`/`price` cho
 * trước) để `assertRawBodyNeverContainsQuantity` không bao giờ khớp giả với các trường hợp lệ
 * khác trong cùng response. Đơn giản: bắt đầu từ 733 (số 3 chữ số bất kỳ), tăng dần cho tới
 * khi không phải là chuỗi con chữ số của `id`/`price` và ngược lại.
 */
export function pickDistinctiveQuantity(...avoidNumbers: number[]): number {
  const avoidStrings = avoidNumbers.map((n) => String(n));
  let candidate = 733;
  const collides = (n: number): boolean => {
    const s = String(n);
    return avoidStrings.some((a) => a.includes(s) || s.includes(a));
  };
  while (collides(candidate)) candidate += 1;
  return candidate;
}
