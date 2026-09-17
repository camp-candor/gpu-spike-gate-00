FROM pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime

# Install system packages
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    ca-certificates \
    wget \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS via official nodesource setup script
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install s5cmd binary (v2.2.2 Linux-64bit) directly to /usr/local/bin/s5cmd
RUN wget -qO- https://github.com/peak/s5cmd/releases/download/v2.2.2/s5cmd_2.2.2_Linux-64bit.tar.gz | tar -xz -C /usr/local/bin/ s5cmd

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package.json, install dependencies globally and locally
COPY package.json .
RUN npm install -g tsx && npm install --omit=dev

# Copy all application files
COPY harness.ts .
COPY headless_runner.py .
COPY benchmarks/ benchmarks/

ENTRYPOINT ["tsx", "/app/harness.ts"]
