FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN MONGOMS_DISABLE_POSTINSTALL=1 npm ci
COPY apps ./apps
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/public/catalog.json /app/public/categories.json /app/public/catalog-image-corrections.json /app/public/custom-products.json ./public/
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
