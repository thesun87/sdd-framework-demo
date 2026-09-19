# ops/api.Dockerfile — image cho dịch vụ `api` (apps/api, NestJS).
#
# Đặt ở `ops/` chứ không phải `apps/api/` vì T002 bị cấm chạm `apps/**` và không task nào
# khác sở hữu file này (Ruling R5). Build context là GỐC REPO (xem `context: ..` trong
# ops/compose.yaml) vì image cần `npm ci` từ workspace root (package-lock.json dùng chung)
# rồi mới build riêng workspace `apps/api`.
#
# LƯU Ý CHO NGƯỜI ĐỌC SAU: ở đặc trưng 000, `apps/api` CHƯA CÓ mã nguồn (T001 chỉ dựng
# workspace rỗng). Dockerfile này đúng về HÌNH DẠNG và được xác thực bằng
# `docker compose -f ops/compose.yaml config`, nhưng KHÔNG cần build thành công hôm nay —
# `npm ci`/`npm run build` ở các stage dưới sẽ lỗi cho tới khi apps/api có package.json và
# mã nguồn thật. T011 và T015 là nơi image này thực sự dựng và chạy được.

# ---- deps: cài dependency của toàn workspace (dùng chung package-lock.json gốc) ----
FROM node:24.21.0-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=apps/api --include-workspace-root=true

# ---- build: biên dịch apps/api (và packages/shared mà nó phụ thuộc) ----
# THỨ TỰ COPY CÓ Ý NGHĨA: `COPY . .` đứng TRƯỚC, `COPY --from=deps .../node_modules` đứng
# SAU — để layer `node_modules` cài trong container (đúng OS/arch, tái lập được) luôn LÀ
# LỚP CUỐI GHI ĐÈ, kể cả khi `ops/api.Dockerfile.dockerignore` không được BuildKit đọc (ví
# dụ BuildKit bị tắt). Đảo ngược thứ tự này sẽ để `COPY . .` ghi đè `node_modules` thật của
# host (sai OS/arch, có thể thiếu gói) lên trên node_modules vừa `npm ci` — xem
# ops/api.Dockerfile.dockerignore để biết phần loại trừ context tương ứng.
FROM node:24.21.0-bookworm-slim AS build
WORKDIR /repo
COPY . .
COPY --from=deps /repo/node_modules ./node_modules
RUN npm run build --workspace=apps/api

# ---- run: runtime tối giản, chỉ mang theo dist + node_modules đã cài ----
FROM node:24.21.0-bookworm-slim AS run
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
