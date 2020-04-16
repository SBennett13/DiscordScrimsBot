FROM node:lts
LABEL maintainer="Scott Bennett, scottbennett027@gmail.com"

# Make the apps directory
WORKDIR /apps/DiscordBot

# Copy files and install modules
COPY . .
RUN npm i; \
    npm i -g pm2

CMD ["pm2-runtime", "index.js"]
