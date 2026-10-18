require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];
const PORT = Number(process.env.PORT || 3001);
const SECRET_API_KEY = process.env.NEOCARE_API_KEY || 'neocare-super-secret-key-2026';

const parseAllowedOrigins = (value) => {
  if (!value) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

if (!process.env.NEOCARE_API_KEY) {
  console.warn('NEOCARE_API_KEY is not set. Falling back to a development-only key. Set it in your environment before deployment.');
}

let units = [
  { id: 'nicu-1', status: 'stable', heartRate: 140, oxygen: 98, updatedAt: new Date().toISOString() },
  { id: 'nicu-2', status: 'critical', heartRate: 180, oxygen: 88, updatedAt: new Date().toISOString() }
];
let alerts = [
  { id: 'alert-1', unitId: 'nicu-2', severity: 'critical', message: 'High heart rate detected', createdAt: new Date().toISOString() }
];

const authenticateRequest = (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  const providedKey = req.headers['x-api-key'];
  if (providedKey !== SECRET_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }

  return next();
};

app.use(authenticateRequest);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'neocare-backend',
    timestamp: new Date().toISOString(),
    connectedUnits: units.length
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'NeoCare backend is running', status: 'ok' });
});

app.get('/api/units', (req, res) => {
  res.json(units);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

app.use((err, req, res, next) => {
  if (err) {
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return next();
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers['x-api-key'];
  if (token === SECRET_API_KEY) {
    return next();
  }

  return next(new Error('Unauthorized: Invalid WebSocket Token'));
});

io.on('connection', (socket) => {
  console.log(`Frontend connected securely: ${socket.id}`);
  socket.emit('connection_status', { connected: true, timestamp: new Date().toISOString() });

  const telemetryLoop = setInterval(() => {
    units = units.map((unit) => {
      const heartRate = Math.max(60, Math.min(220, unit.heartRate + Math.floor(Math.random() * 9) - 4));
      const oxygen = Math.max(80, Math.min(100, unit.oxygen + Math.floor(Math.random() * 5) - 2));

      return {
        ...unit,
        heartRate,
        oxygen,
        status: oxygen < 90 || heartRate > 170 ? 'critical' : 'stable',
        updatedAt: new Date().toISOString()
      };
    });

    alerts = units
      .filter((unit) => unit.status === 'critical')
      .map((unit) => ({
        id: `alert-${unit.id}`,
        unitId: unit.id,
        severity: 'critical',
        message: `${unit.id} requires attention`,
        createdAt: new Date().toISOString()
      }));

    io.emit('telemetry_update', units);
    io.emit('alerts_update', alerts);
  }, 2000);

  socket.on('disconnect', () => {
    console.log(`Frontend disconnected: ${socket.id}`);
    clearInterval(telemetryLoop);
  });
});

const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Secure NeoCare backend running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };