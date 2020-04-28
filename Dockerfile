FROM node:lts
LABEL maintainer="Scott Bennett, scottbennett027@gmail.com"

# Make the apps directory
WORKDIR /apps/PugsBot

# Copy files and install modules
COPY . .
RUN npm i --only=prod; \
    npm i -g pm2

ENV DEV=false

RUN mkdir logs; \
    chmod -R 0777 logs

CMD ["pm2-runtime", "index.js"]
