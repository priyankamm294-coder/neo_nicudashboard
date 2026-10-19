
require("dotenv").config();

const express = require("express");
const XLSX = require("xlsx");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3001);
const SECRET_API_KEY =
  process.env.NEOCARE_API_KEY || "neocare-dev-key-change-me";

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  })
);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

// --------------------------------------------------
// IN-MEMORY DATA
// No MongoDB and no Excel reading in this backend.
// Another service will send telemetry to the API.
// --------------------------------------------------

const incubators = Array.from({ length: 10 }, (_, index) => ({
  incubatorId: `INC-${String(index + 1).padStart(3, "0")}`,
  incubatorPower: null,
  sensorStatus: "UNKNOWN",
  status: "OFFLINE",
  currentReading: null,
  lastSeenAt: null,
}));

const babies = [];
const telemetryHistory = [];
const alerts = [];

const MAX_HISTORY = 5000;

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

function authenticateRequest(req, res, next) {
  if (req.path === "/health" || req.path === "/") {
    return next();
  }

  const providedKey = req.headers["x-api-key"];

  if (
    typeof providedKey !== "string" ||
    !crypto.timingSafeEqual(
      Buffer.from(providedKey.padEnd(256, "\0").slice(0, 256)),
      Buffer.from(SECRET_API_KEY.padEnd(256, "\0").slice(0, 256))
    ) ||
    providedKey.length !== SECRET_API_KEY.length
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid API key",
    });
  }

  next();
}

app.use(authenticateRequest);

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function findIncubator(incubatorId) {
  return incubators.find(
    (item) => item.incubatorId === incubatorId
  );
}

function normalizeMovement(value) {
  if (value === 1 || value === true) return 1;
  if (value === 0 || value === false) return 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      ["1", "movement", "moving", "yes", "true", "active"].includes(
        normalized
      )
    ) {
      return 1;
    }

    if (
      ["0", "still", "no movement", "no", "false", "inactive"].includes(
        normalized
      )
    ) {
      return 0;
    }
  }

  return null;
}

function createAlert(incubatorId, babyId, type, severity, message) {
  // Do not create repeated alerts for the same active condition.
  const existing = alerts.find(
    (alert) =>
      alert.incubatorId === incubatorId &&
      alert.type === type &&
      !alert.resolvedAt
  );

  if (existing) {
    existing.severity = severity;
    existing.message = message;
    return existing;
  }

  const alert = {
    id: crypto.randomUUID(),
    incubatorId,
    babyId,
    type,
    severity,
    message,
    acknowledged: false,
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
  };

  alerts.unshift(alert);
  return alert;
}

function processTelemetry(input) {
  const {
    babyId,
    babyName = "",
    incubatorId,
    timestamp,
    incubatorPower,
    incubatorTemp,
    babyTemp,
    movement,
  } = input;

  const baby = babies.find(
  (item) => item.babyId === babyId
);
console.log("Telemetry babyId:", babyId);
console.log("Registered babies:", babies.map((item) => item.babyId));
if (!baby) {
  return {
    error: `Unknown baby: ${babyId}`
  };
}

if (baby.incubatorId !== incubatorId) {
  return {
    error: `Baby ${babyId} is not assigned to incubator ${incubatorId}`
  };
}

  const unit = findIncubator(incubatorId);

  if (!unit) {
    return {
      error: `Unknown incubator: ${incubatorId}. Expected INC-001 to INC-010.`,
    };
  }

  if (
    !babyId ||
    typeof babyId !== "string" ||
    !timestamp ||
    Number.isNaN(Date.parse(timestamp)) ||
    !Number.isFinite(incubatorTemp) ||
    !Number.isFinite(babyTemp)
  ) {
    return {
      error:
        "Valid babyId, timestamp, incubatorTemp and babyTemp are required.",
    };
  }

  const normalizedMovement = normalizeMovement(movement);

  if (normalizedMovement === null) {
    return {
      error: "movement must be 0, 1, Still or Movement.",
    };
  }

  // Demo rules from the project's agreed data specification.
  // These are not clinically validated medical thresholds.
  const temperatureAlarm = babyTemp < 36.5 || babyTemp > 37.5 ? 1 : 0;
  const movementAlarm = normalizedMovement === 1 ? 1 : 0;
  const overallAlarm = temperatureAlarm || movementAlarm ? 1 : 0;

  // Extreme values are labelled CRITICAL for demonstration only.
  const criticalTemperature = babyTemp < 36.0 || babyTemp > 38.0;

  const status = criticalTemperature
    ? "CRITICAL"
    : overallAlarm
      ? "WARNING"
      : "NORMAL";

  const reading = {
    babyId,
    babyName,
    incubatorId,
    timestamp: new Date(timestamp).toISOString(),
    incubatorPower: incubatorPower ?? null,
    incubatorTemp,
    babyTemp,
    temperatureAlarm,
    movement: normalizedMovement,
    movementAlarm,
    overallAlarm,
    status,
  };

  // Update latest state for this incubator.
  unit.incubatorPower = reading.incubatorPower;
  unit.currentReading = reading;
  unit.lastSeenAt = reading.timestamp;
  unit.sensorStatus = "CONNECTED";
  unit.status = status;

  // Keep historical readings in memory.
  telemetryHistory.push(reading);

  if (telemetryHistory.length > MAX_HISTORY) {
    telemetryHistory.shift();
  }

  // Temperature alarm lifecycle.
  const temperatureType = "TEMPERATURE";

  if (temperatureAlarm) {
    createAlert(
      incubatorId,
      babyId,
      temperatureType,
      criticalTemperature ? "CRITICAL" : "WARNING",
      `Baby temperature is ${babyTemp}°C`
    );
  } else {
    alerts.forEach((alert) => {
      if (
        alert.incubatorId === incubatorId &&
        alert.type === temperatureType &&
        !alert.resolvedAt
      ) {
        alert.resolvedAt = new Date().toISOString();
      }
    });
  }

  // Movement alarm lifecycle.
  const movementType = "MOVEMENT";

  if (movementAlarm) {
    createAlert(
      incubatorId,
      babyId,
      movementType,
      "WARNING",
      "Movement detected"
    );
  } else {
    alerts.forEach((alert) => {
      if (
        alert.incubatorId === incubatorId &&
        alert.type === movementType &&
        !alert.resolvedAt
      ) {
        alert.resolvedAt = new Date().toISOString();
      }
    });
  }

  // Broadcast updates for future frontend integration.
  io.emit("telemetry_update", reading);
  io.emit("incubator_update", unit);
  io.emit("alerts_update", alerts);

  return { reading, unit };
}


const EXCEL_FILE_PATH = require("path").join(
  __dirname,
  "data",
  "NeoCare_4_Babies_1_Second_Mixed_Dummy_Dataset (1).xlsx"
);

const REPLAY_INTERVAL_MS = 5000;

function loadExcelReadings() {
  const workbook = XLSX.readFile(EXCEL_FILE_PATH, {
    cellDates: true,
  });

  const sheet = workbook.Sheets["Readings"];

  if (!sheet) {
    throw new Error('Excel workbook does not contain a "Readings" sheet.');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  const readings = rows.map((row) => {
    const rawIncubatorId = String(row["Incubator ID"] ?? "").trim();
    const match = rawIncubatorId.match(/^INC-?(\d+)$/i);

    if (!match) {
      throw new Error(`Invalid incubator ID in Excel: ${rawIncubatorId}`);
    }

    const incubatorId = `INC-${match[1].padStart(3, "0")}`;

    const rawTimestamp = row["Timestamp"];
    const timestamp =
      rawTimestamp instanceof Date
        ? rawTimestamp.toISOString()
        : String(rawTimestamp ?? "");

    return {
      babyId: String(row["Baby ID"] ?? "").trim(),
      babyName: String(row["Baby Name"] ?? "").trim(),
      incubatorId,
      timestamp,
      incubatorPower:
        row["Incubator Power"] === null
          ? null
          : Number(row["Incubator Power"]),
      incubatorTemp: Number(row["Incubator Temperature (°C)"]),
      babyTemp: Number(row["Baby Temperature (°C)"]),
      movement: row["Movement"],
    };
  });

  return readings;
}

function startExcelReplay() {
  let readings;

  try {
    readings = loadExcelReadings();
  } catch (error) {
    console.error("Could not load Excel dataset:", error.message);
    return;
  }

  if (readings.length === 0) {
    console.error("Excel dataset contains no readings.");
    return;
  }

  // Group readings by baby so all four babies advance together.
  const readingsByBaby = new Map();

  for (const reading of readings) {
    if (!readingsByBaby.has(reading.babyId)) {
      readingsByBaby.set(reading.babyId, []);
    }

    readingsByBaby.get(reading.babyId).push(reading);
  }

  const babyGroups = [...readingsByBaby.values()];

  if (babyGroups.length !== 4) {
    console.error(
      `Expected 4 babies in the dataset, found ${babyGroups.length}.`
    );
    return;
  }

  const totalTicks = Math.max(
    ...babyGroups.map((group) => group.length)
  );

  // Register babies before replaying, if they aren't already registered.
  for (const group of babyGroups) {
    const firstReading = group[0];

    const existingBaby = babies.find(
      (baby) => baby.babyId === firstReading.babyId
    );

    if (existingBaby) {
      if (existingBaby.incubatorId !== firstReading.incubatorId) {
        console.error(
          `Baby ${firstReading.babyId} is assigned to ${existingBaby.incubatorId}, ` +
          `but the dataset uses ${firstReading.incubatorId}.`
        );
        return;
      }

      continue;
    }

    const unit = findIncubator(firstReading.incubatorId);

    if (!unit) {
      console.error(`Unknown incubator: ${firstReading.incubatorId}`);
      return;
    }

    if (
      unit.currentBabyId &&
      unit.currentBabyId !== firstReading.babyId
    ) {
      console.error(
        `Incubator ${firstReading.incubatorId} is already assigned to ` +
        `${unit.currentBabyId}.`
      );
      return;
    }

    babies.push({
      babyId: firstReading.babyId,
      babyName: firstReading.babyName,
      incubatorId: firstReading.incubatorId,
    });

    unit.currentBabyId = firstReading.babyId;
  }

  let tick = 0;

  console.log(`Excel replay starting: ${readings.length} readings.`);
  console.log(`Babies: ${babyGroups.length}`);
  console.log(`Interval: ${REPLAY_INTERVAL_MS / 1000} seconds`);

  const replayTimer = setInterval(() => {
    if (tick >= totalTicks) {
      clearInterval(replayTimer);
      console.log("Excel replay finished.");
      return;
    }

    for (const group of babyGroups) {
      const sourceReading = group[tick];

      if (!sourceReading) {
        continue;
      }

      // Use replay time so the dashboard shows fresh timestamps.
      const result = processTelemetry({
        ...sourceReading,
        timestamp: new Date().toISOString(),
      });

      if (result.error) {
        console.error(
          `Replay error for ${sourceReading.babyId}: ${result.error}`
        );
      }
    }

    tick++;

    if (tick % 10 === 0 || tick === totalTicks) {
      console.log(`Excel replay progress: ${tick}/${totalTicks} ticks`);
    }

    if (tick >= totalTicks) {
      clearInterval(replayTimer);
      console.log("Excel replay finished.");
    }
  }, REPLAY_INTERVAL_MS);
}

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NeoCare backend is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "neocare-backend",
    timestamp: new Date().toISOString(),
    incubatorCount: incubators.length,
    storage: "in-memory",
  });
});

// --------------------------------------------------
// INCUBATOR APIs
// --------------------------------------------------

app.get("/api/incubators", (req, res) => {
  res.json({
    success: true,
    count: incubators.length,
    data: incubators,
  });
});

// Backward-compatible endpoint from your old backend.
app.get("/api/units", (req, res) => {
  res.json(incubators);
});

app.get("/api/incubators/:incubatorId", (req, res) => {
  const unit = findIncubator(req.params.incubatorId);

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: "Incubator not found",
    });
  }

  res.json({ success: true, data: unit });
});

// --------------------------------------------------
// BABY APIs
// --------------------------------------------------

app.post("/api/babies", (req, res) => {
  const { babyId, babyName, incubatorId } = req.body;

  if (!babyId || !babyName || !incubatorId) {
    return res.status(400).json({
      success: false,
      message: "babyId, babyName and incubatorId are required",
    });
  }

  if (babies.some((baby) => baby.babyId === babyId)) {
    return res.status(409).json({
      success: false,
      message: "Baby ID already exists",
    });
  }

  const unit = findIncubator(incubatorId);

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: "Incubator not found",
    });
  }

  if (unit.currentBabyId) {
    return res.status(409).json({
      success: false,
      message: "Incubator already has an assigned baby",
    });
  }

  const baby = {
    ...req.body,
    admissionStatus: "ADMITTED",
    registeredAt: new Date().toISOString(),
  };

  babies.push(baby);
  unit.currentBabyId = babyId;

  res.status(201).json({
    success: true,
    message: "Baby registered successfully",
    data: baby,
  });
});

app.get("/api/babies", (req, res) => {
  res.json({
    success: true,
    count: babies.length,
    data: babies,
  });
});


app.get("/api/babies/:babyId", (req, res) => {
  const baby = babies.find(
    (item) => item.babyId === req.params.babyId
  );

  if (!baby) {
    return res.status(404).json({
      success: false,
      message: "Baby not found",
    });
  }

  res.json({
    success: true,
    data: baby,
  });
});

app.patch("/api/babies/:babyId", (req, res) => {
  const baby = babies.find(
    (item) => item.babyId === req.params.babyId
  );

  if (!baby) {
    return res.status(404).json({
      success: false,
      message: "Baby not found",
    });
  }

  const allowedFields = [
    "babyName",
    "prematurity",
    "weight",
    "doctor",
    "notes",
    "admissionStatus",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      baby[field] = req.body[field];
    }
  }

  res.json({
    success: true,
    message: "Baby updated successfully",
    data: baby,
  });
});

// --------------------------------------------------
// TELEMETRY APIs
// --------------------------------------------------

app.post("/api/telemetry", (req, res) => {
  const result = processTelemetry(req.body);

  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  res.status(201).json({
    success: true,
    message: "Telemetry processed successfully",
    data: result.reading,
  });
});

app.get("/api/telemetry/latest", (req, res) => {
  const latestReading = telemetryHistory.length
    ? telemetryHistory[telemetryHistory.length - 1]
    : null;

  res.json({
    success: true,
    data: latestReading,
  });
});

app.get("/api/telemetry", (req, res) => {
  const { incubatorId } = req.query;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;

  let readings = telemetryHistory;

  if (incubatorId) {
    readings = readings.filter(
      (item) => item.incubatorId === incubatorId
    );
  }

  res.json({
    success: true,
    count: Math.min(readings.length, limit),
    data: readings.slice(-limit).reverse(),
  });
});

app.get("/api/telemetry/:incubatorId", (req, res) => {
  const unit = findIncubator(req.params.incubatorId);

  if (!unit) {
    return res.status(404).json({
      success: false,
      message: "Incubator not found",
    });
  }

  const readings = telemetryHistory
    .filter((item) => item.incubatorId === unit.incubatorId)
    .slice(-100)
    .reverse();

  res.json({
    success: true,
    count: readings.length,
    data: readings,
  });
});

// --------------------------------------------------
// ALERT APIs
// --------------------------------------------------

app.get("/api/alerts", (req, res) => {
  let result = alerts;

  if (req.query.acknowledged === "true") {
    result = result.filter((alert) => alert.acknowledged);
  } else if (req.query.acknowledged === "false") {
    result = result.filter((alert) => !alert.acknowledged);
  }

  if (req.query.active === "true") {
    result = result.filter((alert) => !alert.resolvedAt);
  }

  res.json({
    success: true,
    count: result.length,
    data: result,
  });
});

app.patch("/api/alerts/:alertId/acknowledge", (req, res) => {
  const alert = alerts.find(
    (item) => item.id === req.params.alertId
  );

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Alert not found",
    });
  }

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();

  io.emit("alerts_update", alerts);

  res.json({
    success: true,
    message: "Alert acknowledged",
    data: alert,
  });
});

app.patch("/api/alerts/:alertId/resolve", (req, res) => {
  const alert = alerts.find(
    (item) => item.id === req.params.alertId
  );

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: "Alert not found",
    });
  }

  alert.resolvedAt = new Date().toISOString();

  io.emit("alerts_update", alerts);

  res.json({
    success: true,
    message: "Alert resolved",
    data: alert,
  });
});

// --------------------------------------------------
// DASHBOARD SUMMARY
// --------------------------------------------------

app.get("/api/dashboard/summary", (req, res) => {
  const summary = {
    totalIncubators: incubators.length,
    normal: incubators.filter((item) => item.status === "NORMAL").length,
    warning: incubators.filter((item) => item.status === "WARNING").length,
    critical: incubators.filter((item) => item.status === "CRITICAL").length,
    offline: incubators.filter((item) => item.status === "OFFLINE").length,
    totalBabies: babies.length,
    activeAlerts: alerts.filter((alert) => !alert.resolvedAt).length,
    unacknowledgedAlerts: alerts.filter(
      (alert) => !alert.acknowledged && !alert.resolvedAt
    ).length,
    totalReadings: telemetryHistory.length,
  };

  res.json({ success: true, data: summary });
});

// --------------------------------------------------
// SOCKET.IO AUTHENTICATION
// --------------------------------------------------

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["x-api-key"];

  if (
    typeof token === "string" &&
    token.length === SECRET_API_KEY.length &&
    crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(SECRET_API_KEY)
    )
  ) {
    return next();
  }

  next(new Error("Unauthorized: Invalid WebSocket Token"));
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.emit("connection_status", {
    connected: true,
    timestamp: new Date().toISOString(),
  });

  // Send the current state. No per-client simulation timer.
  socket.emit("incubator_update", incubators);
  socket.emit("alerts_update", alerts);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error("Request error:", err.message);

  const status = err.message === "CORS origin not allowed" ? 403 : 500;

  res.status(status).json({
    success: false,
    message:
      status === 403 ? "CORS origin not allowed" : "Internal server error",
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

function startServer() {
  server.listen(PORT, () => {
    console.log(`NeoCare backend running at http://localhost:${PORT}`);
    console.log(`Registered incubators: ${incubators.length}`);
    console.log("Storage: in-memory; no database connection required");
    startExcelReplay();
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  server,
  io,
  startServer,
  processTelemetry,
};
