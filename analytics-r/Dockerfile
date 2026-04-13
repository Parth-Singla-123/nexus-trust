# analytics-r/Dockerfile
FROM rocker/r-base:4.4.1

# Install system dependencies required for R packages
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install SMOTE dependency
RUN R -e "install.packages('DMwR2', repos='https://cloud.r-project.org/')"

WORKDIR /app

# Copy the R script into the container
COPY risk_analysis.R .

# Create a run script to execute the R analytics in a continuous loop
RUN echo '#!/bin/sh\n\
while true; do \n\
  echo "[R-Analytics] Running risk analysis pipeline..." \n\
  Rscript risk_analysis.R \n\
  echo "[R-Analytics] Sleeping for 15 seconds..." \n\
  sleep 15 \n\
done' > /app/run.sh

RUN chmod +x /app/run.sh

CMD ["/app/run.sh"]