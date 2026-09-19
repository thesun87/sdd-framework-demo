# Specification Quality Checklist: Walking Skeleton

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-19
**Last validated**: 2026-09-19 (iteration 2 — sau khi hai câu hỏi mở được trả lời)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Baseline traceability (bổ sung của repo này — protocol §A10 exit gate, validator BV003)

- [x] Mọi FR truy về một `FR-xxx` của `docs/baseline/prd.md` — FR-001…FR-004 ← PRD FR-4; FR-005…FR-008 ← PRD FR-5
- [x] Không FR nào phát minh yêu cầu ngoài PRD (không có PRODUCT_CONFLICT)
- [x] Ràng buộc kiến trúc tách riêng thành `AC-AD*`, không trộn vào danh sách FR
- [x] Thuật ngữ dùng cột *Canonical term (EN)* của `glossary.md` (`Stock`, không phải `inventory`)
- [x] Phạm vi khớp hàng `000-walking-skeleton` của `feature-map.md` (FR-4, FR-5 *một phần*)
- [x] Không mục nào của AD-29 bị nới lỏng — quyết định hoãn ứng dụng quản trị giữ nguyên nghĩa vụ header

## Notes

**Hai câu hỏi mở đã đóng ngày 2026-09-19, người quyết: Tuan Nguyen.**

1. **Trang chi tiết Sản phẩm — CÓ trong phạm vi** (bản tối giản, không nút thêm vào giỏ).
   Dày hơn mức `feature-map.md` hứa; đổi lại FR-4 không còn nợ sang `001`. → `FR-003`.
2. **Ứng dụng quản trị — KHÔNG dựng ở `000`**, hoãn tới `006`. Reverse proxy vẫn phát đủ
   header cho **cả hai đường dẫn** ngay từ `000`, nên AD-29 giữ nguyên. → `AC-AD29`.
   **Hệ quả đã ghi vào spec:** `006` chỉ cắm bundle vào một đường dẫn đã được bảo vệ sẵn.

Cả hai quyết định đã ghi vào mục **Assumptions** của `spec.md` kèm ngày và tên người quyết,
để `/speckit-converge` còn đối chiếu được.

**Ghi chú không chặn — chặn môi trường, không phải khuyết tật của spec:** tiêu chí nghiệm thu
cần Docker + kho dữ liệu thật (`verification.md` §Prerequisites). `docs/tooling-versions.md`
ghi Docker chưa dùng được trong distro WSL hiện tại. Phải gỡ trước cổng nghiệm thu của `000`.
