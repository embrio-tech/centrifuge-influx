FROM node:18.14-alpine as install

WORKDIR /usr/src/app

RUN apk add --update --no-cache python3 build-base gcc && ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./
COPY yarn*.lock ./
RUN yarn install --production=false

FROM node:18.14-alpine as build

WORKDIR /usr/src/app
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM node:18.14-alpine as prod-install

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn*.lock ./
RUN yarn install --production=true --frozen-lockfile

FROM node:18.14-alpine as prod-build

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn*.lock ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=prod-install /usr/src/app/node_modules ./node_modules

EXPOSE 5000

USER node

CMD ["yarn", "start"]
