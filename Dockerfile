# Building
FROM node:20-slim
RUN apt-get update -y
RUN apt-get install -y openssl
RUN apt-get install -y curl
RUN apt-get install -y unzip
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.1"
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /root/app

COPY package.json .
COPY bun.lock .

RUN bun install --prod --frozen-lockfile

COPY . .

CMD bun start