# Build the static site, then serve it at /island with nginx on port 80;
# nginx.conf sends every other path to /island
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/island
EXPOSE 80
