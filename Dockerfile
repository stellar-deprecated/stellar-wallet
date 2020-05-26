FROM ubuntu:16.04

MAINTAINER SDF Ops Team <ops@stellar.org>

ADD . /app/src
WORKDIR /app/src

RUN apt-get update && apt-get install -y curl git apt-transport-https make gcc g++ && \
    curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
    echo "deb https://deb.nodesource.com/node_6.x xenial main" | tee /etc/apt/sources.list.d/nodesource.list && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y nodejs yarn && \
    npm install && \
    NODE_ENV=production ./node_modules/.bin/gulp dist && \
    apt-get autoremove -y curl git apt-transport-https make gcc g++

RUN ln -s /secrets/environment.json config/prd.json

ENV NODE_ENV=prd
EXPOSE 8080

ENTRYPOINT ["/app/src/node_modules/.bin/stex"]
CMD ["www"]
