suppressWarnings({
  options(stringsAsFactors = FALSE)
})

library(stats)

resolve_shared_dir <- function() {
  from_env <- Sys.getenv("SHARED_DATA_DIR")
  if (from_env != "") {
    return(list(input_dir = from_env, output_dir = from_env))
  }

  args <- commandArgs(trailingOnly = FALSE)
  file_arg <- grep("^--file=", args, value = TRUE)
  script_dir <- getwd()
  if (length(file_arg) > 0) {
    script_path <- normalizePath(sub("^--file=", "", file_arg[1]), winslash = "/", mustWork = FALSE)
    script_dir <- dirname(script_path)
  }

  input_dir <- normalizePath(file.path(script_dir, "..", "spark-engine", "data"), winslash = "/", mustWork = FALSE)
  output_dir <- normalizePath(file.path(script_dir, "output"), winslash = "/", mustWork = FALSE)
  list(input_dir = input_dir, output_dir = output_dir)
}

# --- PATH SETUP ---
paths <- resolve_shared_dir()
input_dir <- paths$input_dir
output_dir <- paths$output_dir

if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

input_path <- file.path(input_dir, "spark_features.csv")

if (!file.exists(input_path)) {
  message("Waiting for Spark to generate features...")
  quit(save = "no", status = 0)
}

df <- read.csv(input_path)

# --- GEO DATA (SIMPLIFIED, NO tidyr) ---
set.seed(42)

cities <- data.frame(
  city = c("Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai"),
  latitude = c(19.0760, 28.6139, 12.9716, 17.3850, 13.0827),
  longitude = c(72.8777, 77.2090, 77.5946, 78.4867, 80.2707)
)

# Assign random city per row
rand_idx <- sample(1:nrow(cities), nrow(df), replace = TRUE)
df$city <- cities$city[rand_idx]
df$latitude <- cities$latitude[rand_idx]
df$longitude <- cities$longitude[rand_idx]

# --- DATA BALANCING (NO DMwR2) ---
fraud <- df[df$cloud_rule_risk == 1, ]
normal <- df[df$cloud_rule_risk == 0, ]

if (nrow(fraud) > 0) {
  extra <- fraud[sample(1:nrow(fraud), size = min(nrow(normal), nrow(fraud)*2), replace = TRUE), ]
  smote_df <- rbind(df, extra)
} else {
  smote_df <- df
}

# --- CLUSTERING ---
features <- scale(smote_df[, c("amount", "device_risk", "location_risk", "rolling_total_spend_24h")])
km <- kmeans(features, centers = 3, nstart = 10)
smote_df$cluster <- km$cluster

# --- NORMALIZATION FUNCTION ---
norm <- function(x) {
  if (max(x) == min(x)) return(rep(0, length(x)))
  (x - min(x)) / (max(x) - min(x))
}

# --- RISK SCORE ---
smote_df$risk_score <- 100 * (
  0.30 * norm(smote_df$amount) +
  0.25 * norm(smote_df$rolling_total_spend_24h) +
  0.20 * norm(smote_df$location_risk) +
  0.20 * norm(smote_df$device_risk) +
  0.05 * smote_df$cloud_rule_risk # Add bonus risk if Spark flagged it
)

# --- USER RISK ---
user_risk <- aggregate(risk_score ~ user_id, data = smote_df, FUN = mean)

# --- HOTSPOTS ---
if ("hour" %in% colnames(smote_df)) {
  hotspots <- aggregate(cloud_rule_risk ~ hour, data = smote_df, FUN = sum)
  colnames(hotspots) <- c("hour", "fraud_events")
} else {
  hotspots <- data.frame(hour = integer(), fraud_events = integer())
}

# --- BLACKLIST ---
high_risk_users <- user_risk[user_risk$risk_score > 75, "user_id"]

if (length(high_risk_users) > 0) {
  blacklist_df <- data.frame(
    user_id = high_risk_users,
    flagged_at = rep(Sys.time(), length(high_risk_users)),
    reason = rep("Cluster anomaly detected by R", length(high_risk_users))
  )
} else {
  blacklist_df <- data.frame(
    user_id = character(),
    flagged_at = as.POSIXct(character()),
    reason = character()
  )
}

# --- OUTPUT FILES ---
write.csv(blacklist_df, file.path(output_dir, "blacklist.csv"), row.names = FALSE)
write.csv(smote_df, file.path(output_dir, "risk_enriched_transactions.csv"), row.names = FALSE)
write.csv(user_risk[order(-user_risk$risk_score), ], file.path(output_dir, "user_risk_scores.csv"), row.names = FALSE)
write.csv(hotspots, file.path(output_dir, "fraud_hotspots.csv"), row.names = FALSE)

message("✅ R analytics output generated successfully!")