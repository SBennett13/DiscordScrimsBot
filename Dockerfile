FROM node:lts
LABEL maintainer="Scott Bennett, scottbennett027@gmail.com"
USER root

# Make the apps directory
RUN mkdir /app
WORKDIR /app

# Copy files and install modules
COPY . .
RUN npm i; \
    npm i -g pm2

CMD "pm2 index.js"
