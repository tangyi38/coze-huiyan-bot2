FROM node:20-slim

# 安装 better-sqlite3 编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装依赖（利用 Docker 缓存层）
COPY package.json ./
RUN npm install

# 再复制源码
COPY . .

# 构建时初始化数据库
RUN node db/init.js

EXPOSE 3000

CMD ["node", "server.js"]
