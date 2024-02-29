FROM node:18.14-alpine as install

WORKDIR /usr/src/app

# Install necessary packages
RUN apk add --update --no-cache python3 build-base gcc && ln -sf /usr/bin/python3 /usr/bin/python

# Copy package files
COPY package*.json ./
COPY yarn*.lock ./

# Install dependencies
RUN yarn install --production=false

FROM node:18.14-alpine as build

WORKDIR /usr/src/app

# Copy installed node_modules and source code
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY . .

# Build the application
RUN yarn build

FROM node:18.14-alpine as prod-install

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY yarn*.lock ./

# Install only production dependencies
RUN yarn install --production=true --frozen-lockfile

FROM node:18.14-alpine as prod-build

WORKDIR /usr/src/app

# Create a non-root user and switch to it
# Note: You might need to adjust permissions more restrictively depending on your app's specific needs
RUN adduser -D indexer && chown -R indexer:indexer /usr/src/app
USER indexer

# Copy necessary files
COPY package*.json ./
COPY yarn*.lock ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=prod-install /usr/src/app/node_modules ./node_modules

EXPOSE 5000

CMD ["yarn", "start"]