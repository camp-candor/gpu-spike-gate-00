FROM pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime

RUN apt-get update && apt-get install -y \
    curl \
    tar \
    ca-certificates \
    wget \
    procps \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/peak/s5cmd/releases/download/v2.2.2/s5cmd_2.2.2_Linux-64bit.tar.gz -O /tmp/s5cmd.tar.gz \
    && tar -xzf /tmp/s5cmd.tar.gz -C /usr/local/bin s5cmd \
    && rm /tmp/s5cmd.tar.gz

WORKDIR /app

COPY package.json .
RUN npm install -g tsx && npm install --omit=dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY harness.ts headless_runner.py /app/
COPY benchmarks /app/benchmarks/
COPY scripts /app/scripts/

ENTRYPOINT ["tsx", "/app/harness.ts"]
