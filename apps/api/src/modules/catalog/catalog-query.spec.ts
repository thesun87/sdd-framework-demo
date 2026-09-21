// apps/api/src/modules/catalog/catalog-query.spec.ts
//
// Tests for Product list query parsing (T008).
// Constraints from data-model.md §ProductListQuery and contracts/storefront-http.md.

import { parseProductListQuery } from './catalog-query';

describe('parseProductListQuery', () => {
  describe('categoryId', () => {
    it('chấp nhận categoryId là số nguyên dương hợp lệ', () => {
      const parsed = parseProductListQuery({ categoryId: '2' });
      expect(parsed.categoryId).toBe(2);
    });

    it('bỏ qua categoryId khi <= 0 hoặc không phải số', () => {
      expect(parseProductListQuery({ categoryId: '0' }).categoryId).toBeUndefined();
      expect(parseProductListQuery({ categoryId: '-5' }).categoryId).toBeUndefined();
      expect(parseProductListQuery({ categoryId: 'abc' }).categoryId).toBeUndefined();
    });

    it('khi có tìm kiếm nonblank q, categoryId bị xoá về undefined (tìm kiếm trên toàn bộ catalog)', () => {
      const parsed = parseProductListQuery({ categoryId: '2', q: 'binh giu nhiet' });
      expect(parsed.categoryId).toBeUndefined();
      expect(parsed.q).toBe('binh giu nhiet');
    });
  });

  describe('q (search query)', () => {
    it('trả về chuỗi tìm kiếm đã trim khi q không rỗng', () => {
      const parsed = parseProductListQuery({ q: '  ca phe sua da  ' });
      expect(parsed.q).toBe('ca phe sua da');
    });

    it('chuỗi rỗng hoặc chỉ chứa khoảng trắng được coi như không tìm kiếm (undefined)', () => {
      expect(parseProductListQuery({ q: '' }).q).toBeUndefined();
      expect(parseProductListQuery({ q: '   ' }).q).toBeUndefined();
      expect(parseProductListQuery({}).q).toBeUndefined();
    });
  });

  describe('page', () => {
    it('mặc định page = 1 khi không truyền', () => {
      expect(parseProductListQuery({}).page).toBe(1);
    });

    it('chấp nhận page hợp lệ >= 1', () => {
      expect(parseProductListQuery({ page: '3' }).page).toBe(3);
    });

    it('các giá trị page < 1 hoặc không hợp lệ được xử lý thành page = 1', () => {
      expect(parseProductListQuery({ page: '0' }).page).toBe(1);
      expect(parseProductListQuery({ page: '-2' }).page).toBe(1);
      expect(parseProductListQuery({ page: 'invalid' }).page).toBe(1);
    });
  });

  describe('pageSize', () => {
    it('mặc định pageSize = 24 khi không truyền', () => {
      expect(parseProductListQuery({}).pageSize).toBe(24);
    });

    it('chấp nhận pageSize hợp lệ trong khoảng 1..100', () => {
      expect(parseProductListQuery({ pageSize: '50' }).pageSize).toBe(50);
      expect(parseProductListQuery({ pageSize: '1' }).pageSize).toBe(1);
      expect(parseProductListQuery({ pageSize: '100' }).pageSize).toBe(100);
    });

    it('pageSize > 100 tự động clamp về 100, không gây lỗi (FR-013)', () => {
      expect(parseProductListQuery({ pageSize: '150' }).pageSize).toBe(100);
      expect(parseProductListQuery({ pageSize: '9999' }).pageSize).toBe(100);
    });

    it('pageSize <= 0 hoặc không hợp lệ được gán mặc định 24', () => {
      expect(parseProductListQuery({ pageSize: '0' }).pageSize).toBe(24);
      expect(parseProductListQuery({ pageSize: '-10' }).pageSize).toBe(24);
      expect(parseProductListQuery({ pageSize: 'xyz' }).pageSize).toBe(24);
    });
  });
});
