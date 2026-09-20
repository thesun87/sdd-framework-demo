// apps/api/src/modules/catalog/metrics.store.ts
//
// T014 — nơi lưu và tổng hợp thời lượng request trong BỘ NHỚ TIẾN TRÌNH. Không dịch vụ
// ngoài, không thư viện metrics/APM (AD-16: phụ thuộc runtime chỉ PostgreSQL + hệ tệp cục
// bộ) — một mảng vòng (ring buffer) đơn giản là đủ để trả lời "p95 hôm nay bao nhiêu" cho
// một walking skeleton một tiến trình `api` duy nhất (`ops/compose.yaml` không nhân bản
// dịch vụ này).
//
// `request-logging.middleware.ts` (T011 sở hữu, T014 mở rộng) gọi `recordRequestDuration`
// ở đúng điểm nó đã ghi log — module này KHÔNG tự đọc request/response, chỉ nhận số đo đã
// tính sẵn. `metrics.controller.ts` gọi `getTodayMetrics()` để trả lời `GET
// /api/internal/metrics` (Ruling R9).

export interface RequestDurationRecord {
  readonly path: string;
  readonly method: string;
  readonly durationMs: number;
  readonly recordedAt: Date;
}

// Đủ lớn cho một ngày vận hành của walking skeleton (vài nghìn request), tránh phình bộ nhớ
// vô hạn nếu tiến trình chạy nhiều ngày không restart — KHÔNG phải giới hạn nghiệp vụ, chỉ
// là trần an toàn cho bộ nhớ.
const MAX_RECORDS = 5000;

const records: RequestDurationRecord[] = [];

export function recordRequestDuration(entry: RequestDurationRecord): void {
  records.push(entry);
  if (records.length > MAX_RECORDS) {
    records.shift();
  }
}

// Chỉ dùng nội bộ cho test — xoá sạch bộ đếm để mỗi lần đo trong test không lẫn dữ liệu của
// lần chạy trước.
export function resetMetricsStoreForTest(): void {
  records.length = 0;
}

function isSameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// p95 kiểu "nearest-rank": sắp xếp tăng dần rồi lấy phần tử ở vị trí ceil(0.95 * n) — không
// cần thư viện thống kê, đúng định nghĩa percentile dùng trong PRD §8.
function percentile(sortedAscending: readonly number[], p: number): number {
  if (sortedAscending.length === 0) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedAscending.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedAscending.length - 1);
  return sortedAscending[index];
}

export interface MetricsSnapshot {
  readonly date: string;
  readonly sampleSize: number;
  readonly p95DurationMs: number;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
}

// `now` chỉ để test tiêm ngày giả — mặc định là thời điểm gọi thật.
export function getTodayMetrics(now: Date = new Date()): MetricsSnapshot {
  const todaysDurations = records
    .filter((record) => isSameUtcDate(record.recordedAt, now))
    .map((record) => record.durationMs)
    .sort((a, b) => a - b);

  return {
    date: now.toISOString().slice(0, 10),
    sampleSize: todaysDurations.length,
    p95DurationMs: percentile(todaysDurations, 95),
    minDurationMs: todaysDurations.length > 0 ? todaysDurations[0] : 0,
    maxDurationMs: todaysDurations.length > 0 ? todaysDurations[todaysDurations.length - 1] : 0,
  };
}
