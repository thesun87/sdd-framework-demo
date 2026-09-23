// db/schema/index.ts — điểm nhập lược đồ duy nhất cho Drizzle Kit và cho code ứng dụng.
// Task sau import bảng/enum từ đây (hoặc trực tiếp từ ./catalog.js / ./stock.js).

export * from './catalog.js';
export * from './stock.js';
export * from './identity.js';
