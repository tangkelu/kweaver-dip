# ── Stage 1: builder ────────────────────────────────────────────

FROM node:25.9-bookworm AS builder

WORKDIR /build

COPY . .

RUN npm config set registry https://registry.npmmirror.com \
    && npm install -g pnpm \
    && pnpm install \
    && pnpm run build \
    && pnpm prune --prod

# ── Stage 2: runtime ────────────────────────────────────────────

FROM node:25.9-bookworm AS runtime

WORKDIR /app

COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/assets ./assets
COPY --from=builder /build/templates ./templates
COPY --from=builder /build/built-in ./built-in
COPY --from=builder /build/extensions ./extensions
COPY --from=builder /build/scripts ./scripts
COPY --from=builder /build/node_modules ./node_modules

RUN ln -sf /app/node_modules/openclaw/openclaw.mjs /usr/local/bin/openclaw \
    && chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

CMD ["/app/scripts/docker-entrypoint.sh"]
