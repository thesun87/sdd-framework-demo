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
FROM node:24.21.0-bookworm-slim AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
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
