FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

COPY requirements.txt ./
RUN python -m pip install --upgrade pip && python -m pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "stream_processor.py", "--watch", "--poll-seconds", "8"]
