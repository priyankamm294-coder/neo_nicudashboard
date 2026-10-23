import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Power, Users, AlertTriangle, 
  CheckCircle, Baby, Stethoscope, ChevronRight, X, Radio, 
  Bell, Check, AlertOctagon, Cpu, Database
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import socket from './socket';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Comprehensive 10-Baby Synthetic NICU Dataset with varied conditions (Normal, Temp Anomaly, Movement Anomaly, Sensor Offline)
const formatDemoTime = (minute) => `14:${String(minute).padStart(2, '0')}:00`;

const INITIAL_NICU_UNITS = [
  {
    incubatorId: "INC-001",
    babyId: "B001",
    babyName: "Aarav Sharma",
    prematurity: "28 wks 4 days",
    weight: "1,120 g",
    admissionTime: "Oct 12, 2023 08:30",
    doctor: "Dr. Sarah Jenkins",
    notes: "Stable pre-term infant under continuous radiant warmth.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, (_, i) => ({
      timestamp: formatDemoTime(i),
      incTemp: parseFloat((32.1 + (i % 3) * 0.1).toFixed(1)),
      babyTemp: parseFloat((36.8 + (i % 2) * 0.05).toFixed(2)),
      movement: "Still",
      anomalyScore: 0.02,
      status: "NORMAL"
    }))
  },
  {
    incubatorId: "INC-002",
    babyId: "B002",
    babyName: "Anaya Patel",
    prematurity: "31 wks 1 day",
    weight: "1,450 g",
    admissionTime: "Oct 12, 2023 09:15",
    doctor: "Dr. Marcus Vance",
    notes: "Mild temperature drop detected; thermal regulation watch active.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "MODERATE",
    readings: Array.from({ length: 15 }, (_, i) => {
      let t = 36.8 - (i * 0.04);
      let stat = t < 36.5 ? "WARNING" : "NORMAL";
      if (t < 36.2) stat = "CRITICAL";
      return {
        timestamp: formatDemoTime(i),
        incTemp: parseFloat((32.0 - (i * 0.02)).toFixed(1)),
        babyTemp: parseFloat(Math.max(35.9, t).toFixed(2)),
        movement: i % 2 === 0 ? "Active" : "Still",
        anomalyScore: stat === "CRITICAL" ? 0.94 : 0.45,
        status: stat
      };
    })
  },
  {
    incubatorId: "INC-003",
    babyId: "B003",
    babyName: "Vihaan Verma",
    prematurity: "26 wks 2 days",
    weight: "920 g",
    admissionTime: "Oct 10, 2023 14:00",
    doctor: "Dr. Sarah Jenkins",
    notes: "Extreme low birth weight infant, rigorous movement tracking enabled.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, (_, i) => ({
      timestamp: formatDemoTime(i),
      incTemp: 32.3,
      babyTemp: 36.9,
      movement: i % 3 === 0 ? "Abnormal" : "Active",
      anomalyScore: 0.78,
      status: "WARNING"
    }))
  },
  {
    incubatorId: "INC-004",
    babyId: "B004",
    babyName: "Diya Iyer",
    prematurity: "32 wks 0 days",
    weight: "1,680 g",
    admissionTime: "Oct 11, 2023 11:20",
    doctor: "Dr. Emily Chen",
    notes: "Post-feeding metabolic thermal rise monitored. Fever alert triggered.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, (_, i) => {
      let t = 37.0 + (i * 0.08);
      let stat = t > 37.5 ? "CRITICAL" : "NORMAL";
      return {
        timestamp: formatDemoTime(i),
        incTemp: 32.5,
        babyTemp: parseFloat(Math.min(38.2, t).toFixed(2)),
        movement: "Still",
        anomalyScore: stat === "CRITICAL" ? 0.98 : 0.1,
        status: stat
      };
    })
  },
  {
    incubatorId: "INC-005",
    babyId: "B005",
    babyName: "Kabir Das",
    prematurity: "25 wks 3 days",
    weight: "840 g",
    admissionTime: "Oct 09, 2023 16:45",
    doctor: "Dr. Marcus Vance",
    notes: "Micro-preemie under high humidity isolation protocol. Sensor offline test.",
    power: 0,
    sensorStatus: "DISCONNECTED",
    signalQuality: "OFFLINE",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 0.0,
      babyTemp: 0.0,
      movement: "Offline",
      anomalyScore: 1.0,
      status: "OFFLINE"
    }))
  },
  {
    incubatorId: "INC-006",
    babyId: "B006",
    babyName: "Myra Nair",
    prematurity: "30 wks 4 days",
    weight: "1,310 g",
    admissionTime: "Oct 12, 2023 06:10",
    doctor: "Dr. Emily Chen",
    notes: "Scheduled for morning bilirubin phototherapy checks.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 32.2,
      babyTemp: 36.8,
      movement: "Still",
      anomalyScore: 0.03,
      status: "NORMAL"
    }))
  },
  {
    incubatorId: "INC-007",
    babyId: "B007",
    babyName: "Arjun Reddy",
    prematurity: "29 wks 1 day",
    weight: "1,250 g",
    admissionTime: "Oct 11, 2023 19:30",
    doctor: "Dr. Sarah Jenkins",
    notes: "Stable cardiorespiratory status.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 32.3,
      babyTemp: 36.9,
      movement: "Still",
      anomalyScore: 0.01,
      status: "NORMAL"
    }))
  },
  {
    incubatorId: "INC-008",
    babyId: "B008",
    babyName: "Ishani Gupta",
    prematurity: "33 wks 2 days",
    weight: "1,820 g",
    admissionTime: "Oct 08, 2023 10:00",
    doctor: "Dr. Marcus Vance",
    notes: "Preparing for transition to open cot evaluation.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 32.4,
      babyTemp: 37.0,
      movement: "Still",
      anomalyScore: 0.04,
      status: "NORMAL"
    }))
  },
  {
    incubatorId: "INC-009",
    babyId: "B009",
    babyName: "Reyansh Malhotra",
    prematurity: "27 wks 5 days",
    weight: "990 g",
    admissionTime: "Oct 12, 2023 02:15",
    doctor: "Dr. Emily Chen",
    notes: "Requires regular surfactant monitoring.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 32.1,
      babyTemp: 36.7,
      movement: "Still",
      anomalyScore: 0.02,
      status: "NORMAL"
    }))
  },
  {
    incubatorId: "INC-010",
    babyId: "B010",
    babyName: "Aadhya Kulkarni",
    prematurity: "31 wks 3 days",
    weight: "1,500 g",
    admissionTime: "Oct 11, 2023 15:40",
    doctor: "Dr. Sarah Jenkins",
    notes: "Routine incubator telemetry active.",
    power: 1,
    sensorStatus: "CONNECTED",
    signalQuality: "GOOD",
    readings: Array.from({ length: 15 }, () => ({
      timestamp: "14:00:00",
      incTemp: 32.2,
      babyTemp: 36.8,
      movement: "Still",
      anomalyScore: 0.01,
      status: "NORMAL"
    }))
  }
];

export default function NeoCareAdvancedDashboard() {
  const [units, setUnits] = useState(() =>
    INITIAL_NICU_UNITS.map(unit => ({
      ...unit,
      status: unit.power === 0 || unit.sensorStatus === 'DISCONNECTED'
        ? 'OFFLINE'
        : (unit.readings[unit.readings.length - 1]?.status || 'NORMAL')
    }))
  );
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, NORMAL, WARNING, CRITICAL, OFFLINE
  const [activeTab, setActiveTab] = useState('grid'); // 'grid', 'alerts', 'analytics'
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());


  // Alert Log State (Phase 1 Requirement)
  const [alerts, setAlerts] = useState([
    {
      id: 'ALM-101',
      incubatorId: 'INC-004',
      babyName: 'Diya Iyer',
      type: 'TEMPERATURE_HIGH',
      message:
        'Simulated baby temperature exceeded the demo threshold (Current: 38.12°C)',
      timestamp: '14:02:10',
      severity: 'CRITICAL',
      acknowledged: false
    },
    {
      id: 'ALM-102',
      incubatorId: 'INC-002',
      babyName: 'Anaya Patel',
      type: 'TEMPERATURE_LOW',
      message:
        'Simulated baby temperature dropped below the demo threshold (Current: 36.1°C)',
      timestamp: '14:01:45',
      severity: 'WARNING',
      acknowledged: false
    },
    {
      id: 'ALM-104',
      incubatorId: 'INC-005',
      babyName: 'Kabir Das',
      type: 'SENSOR_OFFLINE',
      message:
        'Demo sensor disconnected. No live readings are available.',
      timestamp: '14:03:00',
      severity: 'WARNING',
      acknowledged: false
    }
  ]);


  // New Baby Registration Form State
  const [newBabyForm, setNewBabyForm] = useState({
    babyName: '',
    incubatorId: 'INC-005',
    prematurity: '28 wks',
    weight: '',
    doctor: 'Dr. Sarah Jenkins',
    notes: 'Admitted via emergency intake triage.'
  });

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 5-Second Livestream Telemetry Simulation Loop (Backend Anomaly Detection + REST/WebSocket simulation)
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.power === 0 || unit.sensorStatus === 'DISCONNECTED') {
            return unit; // Offline sensor handling
          }

          // Simulate minor random fluctuation
          const delta = (Math.random() * 0.2) - 0.1;
          const newBabyTemp = parseFloat(Math.max(35.8, Math.min(38.3, unit.readings[unit.readings.length - 1].babyTemp + delta)).toFixed(2));
          const newIncTemp = parseFloat((32.2 + (Math.random() * 0.4) - 0.2).toFixed(1));
          let currentStatus = 'NORMAL';
          let anomaly = 0.05;
          // Demo temperature-anomaly detection
          if (newBabyTemp < 36.5 || newBabyTemp > 37.5) {
            currentStatus =newBabyTemp < 36.2 || newBabyTemp > 37.8? 'CRITICAL': 'WARNING';
            anomaly = currentStatus === 'CRITICAL' ? 0.95 : 0.65;
          }

// Demo movement-anomaly detection
const movement =
  Math.random() > 0.9
    ? 'Abnormal'
    : Math.random() > 0.5
      ? 'Active'
      : 'Still';

if (movement === 'Abnormal' && currentStatus === 'NORMAL') {
  currentStatus = 'WARNING';
  anomaly = 0.75;
}

          const timestampStr = new Date().toLocaleTimeString();
          const newReading = {
            timestamp: timestampStr,
            incTemp: newIncTemp,
            babyTemp: newBabyTemp,
            movement: movement,
            anomalyScore: anomaly,
            status: currentStatus
          };

          const updatedReadings = [...unit.readings.slice(1), newReading];

          return {
            ...unit,
            incubatorTemp: newIncTemp,
            babyTemp: newBabyTemp,
            status: currentStatus,
            readings: updatedReadings
          };
        });
      });
    }, 5000);

    return () => clearInterval(telemetryInterval);
  }, []);

  // Create an alarm when a unit changes into a warning or critical state.
  // These are demonstration thresholds only; they must be validated for real clinical use.
  useEffect(() => {
    units.forEach(unit => {
      if (unit.power === 0 || unit.sensorStatus === 'DISCONNECTED') return;
      if (unit.status !== 'WARNING' && unit.status !== 'CRITICAL') return;

      const severity = unit.status;
      const alreadyLogged = alerts.some(alert =>
        alert.incubatorId === unit.incubatorId &&
        alert.severity === severity
      );
      if (alreadyLogged) return;

      const latest = unit.readings[unit.readings.length - 1];
      const alertType = latest.babyTemp > 37.5
        ? 'TEMPERATURE_HIGH'
        : latest.babyTemp < 36.5
          ? 'TEMPERATURE_LOW'
          : 'MOVEMENT_ABNORMAL';
      const message = alertType === 'TEMPERATURE_HIGH'
        ? `Baby temperature is above the demo threshold (current: ${latest.babyTemp}°C).`
        : alertType === 'TEMPERATURE_LOW'
          ? `Baby temperature is below the demo threshold (current: ${latest.babyTemp}°C).`
          : 'Unusual movement status detected in simulated readings.';

      setAlerts(previous => {
        const duplicate = previous.some(alert =>
          alert.incubatorId === unit.incubatorId &&
          alert.severity === severity
        );
        if (duplicate) return previous;
        return [{
          id: `ALM-${Date.now()}-${unit.incubatorId}`,
          incubatorId: unit.incubatorId,
          babyName: unit.babyName,
          type: alertType,
          message,
          timestamp: new Date().toLocaleTimeString(),
          severity,
          acknowledged: false
        }, ...previous];
      });
    });
  }, [units]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers for Alert Acknowledgment
  const acknowledgeAlert = (alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  };

  const handleRegisterBaby = (e) => {
    e.preventDefault();
    if (!newBabyForm.babyName || !newBabyForm.weight) return;

    setUnits(prev => prev.map(u => {
      if (u.incubatorId === newBabyForm.incubatorId) {
        return {
          ...u,
          babyId: `B${newBabyForm.incubatorId.slice(-3)}`,
          babyName: newBabyForm.babyName,
          prematurity: newBabyForm.prematurity,
          weight: newBabyForm.weight + ' g',
          doctor: newBabyForm.doctor,
          notes: newBabyForm.notes,
          power: 1,
          sensorStatus: 'CONNECTED',
          signalQuality: 'GOOD',
          readings: Array.from({ length: 15 }, () => ({
            timestamp: new Date().toLocaleTimeString(),
            incTemp: 32.2,
            babyTemp: 36.8,
            movement: 'Still',
            anomalyScore: 0.02,
            status: 'NORMAL'
          })),
          incubatorTemp: 32.2,
          babyTemp: 36.8,
          status: 'NORMAL'
        };
      }
      return u;
    }));

    setIsRegisterModalOpen(false);
    setNewBabyForm({ babyName: '', incubatorId: 'INC-005', prematurity: '28 wks', weight: '', doctor: 'Dr. Sarah Jenkins', notes: 'Newly admitted.' });
  };


  // KPI Calculations
  const occupiedCount = units.filter(
    u => u.power === 1 && u.sensorStatus === 'CONNECTED'
  ).length;

  const stableCount = units.filter(
    u => u.status === 'NORMAL' && u.power === 1
  ).length;

  const warningCount = units.filter(
    u => u.status === 'WARNING'
  ).length;

  const criticalUnitCount = units.filter(
    u => u.status === 'CRITICAL'
  ).length;

  const offlineCount = units.filter(
    u =>
      u.status === 'OFFLINE' ||
      u.sensorStatus === 'DISCONNECTED' ||
      u.power === 0
  ).length;

  const criticalCount = criticalUnitCount + offlineCount;

  const unacknowledgedAlarms = alerts.filter(
    a => !a.acknowledged
  ).length;

  const filteredUnits = units.filter(u => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'NORMAL') return u.status === 'NORMAL';
    if (filterStatus === 'WARNING') return u.status === 'WARNING';
    if (filterStatus === 'CRITICAL') return u.status === 'CRITICAL';
    if (filterStatus === 'OFFLINE') {
      return (
        u.status === 'OFFLINE' ||
        u.sensorStatus === 'DISCONNECTED' ||
        u.power === 0
      );
    }
    return true;
  });


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F9FF', color: '#172B4D', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-xs" style={{ borderColor: '#E2E8F0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: '#0B2545' }}>
              <Baby className="w-6 h-6 text-[#00A6C7]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tight" style={{ color: '#0B2545' }}>Neo<span style={{ color: '#00A6C7' }}>Care</span></span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#E0F2FE', color: '#1976D2' }}>NICU Unit-4 Hospital Suite</span>
              </div>
              <p className="text-xs font-medium" style={{ color: '#64748B' }}>NICU Monitoring Dashboard • Simulated Telemetry</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border font-mono" style={{ borderColor: '#E2E8F0', color: '#64748B', backgroundColor: '#F8FAFC' }}>
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>LIVE: {currentTime.toLocaleTimeString()}</span>
            </div>

            <button 
              onClick={() => setActiveTab('alerts')}
              className="relative px-3.5 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 border transition-all cursor-pointer"
              style={{ borderColor: '#E2E8F0', backgroundColor: unacknowledgedAlarms > 0 ? '#FEF2F2' : '#FFFFFF', color: unacknowledgedAlarms > 0 ? '#EF4444' : '#0B2545' }}
            >
              <Bell className="w-4 h-4" />
              <span>Alarms</span>
              {unacknowledgedAlarms > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                  {unacknowledgedAlarms}
                </span>
              )}
            </button>

            <button 
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center space-x-2 shadow-md transition-all cursor-pointer hover:opacity-95"
              style={{ backgroundColor: '#1976D2' }}
            >
              <span>+ Register New Baby / Assign Incubator</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Critical Alarm Banner (Visually Distinct & Prominent) */}
      {(criticalCount > 0 || unacknowledgedAlarms > 0) && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-red-600 text-white shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-900">ALERT: {criticalCount} Critical or Offline Unit(s) Require Review</h4>
                <p className="text-xs text-red-700 font-medium">Simulated alerts detected. Review unit status, temperature readings,and sensor connectivity.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              Review Alert Log ({unacknowledgedAlarms} pending)
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-20">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-3 mb-6 border-b pb-4" style={{ borderColor: '#E2E8F0' }}>
          <button 
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${activeTab === 'grid' ? 'text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
            style={{ backgroundColor: activeTab === 'grid' ? '#0B2545' : '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <Cpu className="w-4 h-4 text-[#00A6C7]" />
            <span>Incubator Monitoring Grid (10 Units)</span>
          </button>

          <button 
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${activeTab === 'alerts' ? 'text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
            style={{ backgroundColor: activeTab === 'alerts' ? '#0B2545' : '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Alert Management & History Log ({alerts.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${activeTab === 'analytics' ? 'text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
            style={{ backgroundColor: activeTab === 'analytics' ? '#0B2545' : '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>AI Anomaly & Telemetry Dataset Insights</span>
          </button>
        </div>

        {/* Tab 1: Incubator Monitoring Grid */}
        {activeTab === 'grid' && (
          <div>
            {/* Top Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              
              <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between" style={{ borderColor: '#D9E4EF' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Occupied Units</p>
                  <h3 className="text-2xl font-black mt-1" style={{ color: '#0B2545' }}>{occupiedCount} <span className="text-xs font-normal" style={{ color: '#64748B' }}>/ 10 active</span></h3>
                  <p className="text-xs font-semibold mt-1 flex items-center text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Demo Telemetry Active
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50 text-[#1976D2]">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between" style={{ borderColor: '#D9E4EF' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Stable Units</p>
                  <h3 className="text-2xl font-black mt-1" style={{ color: '#10B981' }}>{stableCount} <span className="text-xs font-normal" style={{ color: '#64748B' }}>optimal</span></h3>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>Within normal 36.5°–37.5°C</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between" style={{ borderColor: '#D9E4EF' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Warning & Critical</p>
                  <h3 className="text-2xl font-black mt-1" style={{ color: warningCount + criticalCount > 0 ? '#EF4444' : '#0B2545' }}>
                    {warningCount + criticalCount}
                  </h3>
                  <p className="text-xs mt-1 font-semibold" style={{ color: warningCount + criticalCount > 0 ? '#EF4444' : '#64748B' }}>
                    {warningCount + criticalUnitCount + offlineCount > 0
                    ? `${warningCount} warnings, ${criticalUnitCount} critical, ${offlineCount} offline`
                    : 'All systems clear'}
                  </p>
                </div>
                <div className={`p-3.5 rounded-2xl ${warningCount + criticalCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between" style={{ borderColor: '#D9E4EF' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Sensor Offline / Fault</p>
                  <h3 className="text-2xl font-black mt-1" style={{ color: '#64748B' }}>
                    {units.filter(u => u.sensorStatus === 'DISCONNECTED' || u.power === 0).length}
                  </h3>
                  <p className="text-xs font-semibold mt-1 text-slate-500">Auto-detected offline handling</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
                  <Radio className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border shadow-2xs" style={{ borderColor: '#D9E4EF' }}>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase text-slate-500 mr-2">Filter Units:</span>
                {['ALL', 'NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterStatus === status ? 'bg-[#0B2545] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-500">
                Showing {filteredUnits.length} of {units.length} Incubators
              </div>
            </div>

            {/* Incubator Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredUnits.map((unit) => {
                const latest = unit.readings[unit.readings.length - 1];
                let statusBg = '#D1FAE5';
                let statusColor = '#10B981';
                let statusText = 'NORMAL';

                if (unit.power === 0 || unit.sensorStatus === 'DISCONNECTED') {
                  statusBg = '#F1F5F9';
                  statusColor = '#64748B';
                  statusText = 'OFFLINE / NO SIGNAL';
                } else if (unit.status === 'CRITICAL') {
                  statusBg = '#FEE2E2';
                  statusColor = '#EF4444';
                  statusText = 'CRITICAL ALERT';
                } else if (unit.status === 'WARNING') {
                  statusBg = '#FEF3C7';
                  statusColor = '#F59E0B';
                  statusText = 'WARNING';
                }

                // Chart data config
                const chartLabels = unit.readings.map(r => r.timestamp);
                const babyTempData = unit.readings.map(r => r.babyTemp);
                const incTempData = unit.readings.map(r => r.incTemp);

                const babyChartConfig = {
                  labels: chartLabels,
                  datasets: [{
                    label: 'Baby Temp (°C)',
                    data: babyTempData,
                    borderColor: '#1976D2',
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    borderWidth: 2,
                    pointRadius: 2,
                    fill: true,
                    tension: 0.3
                  }]
                };

                const incChartConfig = {
                  labels: chartLabels,
                  datasets: [{
                    label: 'Incubator Temp (°C)',
                    data: incTempData,
                    borderColor: '#00A6C7',
                    backgroundColor: 'rgba(0, 166, 199, 0.08)',
                    borderWidth: 2,
                    pointRadius: 2,
                    fill: true,
                    tension: 0.3
                  }]
                };

                const chartOptions = {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { display: false },
                    y: { min: 30, max: 40, ticks: { font: { size: 9 }, stepSize: 5 } }
                  }
                };

                return (
                  <div 
                    key={unit.incubatorId}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden ${unit.status === 'CRITICAL' ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
                    style={{ borderColor: unit.status === 'CRITICAL' ? '#EF4444' : '#D9E4EF' }}
                  >
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                      <div className="flex items-center space-x-3">
                        <span className="font-black text-sm px-3 py-1 rounded-xl border bg-white shadow-2xs text-[#0B2545]" style={{ borderColor: '#D9E4EF' }}>
                          {unit.incubatorId}
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-[#0B2545]">
                            {unit.babyName} <span className="text-xs font-normal text-slate-500">({unit.babyId})</span>
                          </h3>
                          <p className="text-xs font-medium text-slate-500">{unit.prematurity} • {unit.weight}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Power Badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 border ${unit.power === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                          <Power className="w-3 h-3" />
                          <span>{unit.power === 1 ? 'ON' : 'OFF'}</span>
                        </span>

                        {/* Status Badge */}
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black border" style={{ backgroundColor: statusBg, color: statusColor, borderColor: statusColor }}>
                          {statusText}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      {unit.sensorStatus === 'DISCONNECTED' || unit.power === 0 ? (
                        <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 my-2">
                          <AlertOctagon className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-700">Sensor Disconnected or Unit Powered Off</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Automated sensor failure detector active. Telemetry stream suspended.</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="p-3 rounded-xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                              <p className="text-[10px] font-bold uppercase text-slate-500">Incubator Temp</p>
                              <p className="text-lg font-black text-[#0B2545] mt-0.5">{latest.incTemp}°C</p>
                            </div>

                            <div className={`p-3 rounded-xl border ${latest.babyTemp < 36.5 || latest.babyTemp > 37.5 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <p className="text-[10px] font-bold uppercase text-slate-500">Baby Temp</p>
                              <p className={`text-lg font-black mt-0.5 ${latest.babyTemp < 36.5 || latest.babyTemp > 37.5 ? 'text-amber-600' : 'text-[#0B2545]'}`}>
                                {latest.babyTemp}°C
                              </p>
                            </div>

                            <div className="p-3 rounded-xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                              <p className="text-[10px] font-bold uppercase text-slate-500">Movement AI</p>
                              <p className="text-xs font-black text-[#0B2545] mt-1">{latest.movement}</p>
                            </div>
                          </div>

                          {/* Mini Charts */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: '#D9E4EF' }}>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-[#0B2545]">Baby Temp Trend</span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">Normal Band 36.5°-37.5°C</span>
                              </div>
                              <div className="h-16 w-full relative">
                                <Line data={babyChartConfig} options={chartOptions} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-[#0B2545]">Incubator Temp Trend</span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-50 text-[#1976D2]">Demo Updates 5s</span>
                              </div>
                              <div className="h-16 w-full relative">
                                <Line data={incChartConfig} options={chartOptions} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: '#D9E4EF', color: '#64748B' }}>
                        <span className="flex items-center font-medium">
                          <Stethoscope className="w-3.5 h-3.5 mr-1 text-[#1976D2]" />
                          {unit.doctor}
                        </span>
                        <button 
                          onClick={() => setSelectedUnit(unit)}
                          className="font-bold flex items-center text-[#1976D2] hover:underline cursor-pointer"
                        >
                          <span>Detailed Vitals & History</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Alert Management & History Log */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-2xl border p-6 shadow-xs" style={{ borderColor: '#D9E4EF' }}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
              <div>
                <h3 className="text-lg font-black text-[#0B2545]">NICU Active Alarms & Incident History Log</h3>
                <p className="text-xs text-slate-500">Demo alerts generated from simulated readings. Backend/WebSocket integration is not connected yet. Nurses can review and acknowledge incidents.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-700">
                  {unacknowledgedAlarms} Unacknowledged
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.map(alert => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${alert.acknowledged ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-red-50/60 border-red-200 shadow-xs'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl ${alert.acknowledged ? 'bg-slate-200 text-slate-600' : 'bg-red-600 text-white animate-pulse'}`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-[#0B2545]">{alert.incubatorId}</span>
                        <h4 className="font-bold text-sm text-[#0B2545]">{alert.babyName} — {alert.type}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 font-medium">{alert.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">Timestamp: {alert.timestamp}</p>
                    </div>
                  </div>

                  <div>
                    {alert.acknowledged ? (
                      <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Check className="w-4 h-4 mr-1" /> Acknowledged by Nurse
                      </span>
                    ) : (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Acknowledge Incident
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: AI Anomaly & Telemetry Dataset Insights */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border p-6 shadow-xs" style={{ borderColor: '#D9E4EF' }}>
              <h3 className="text-lg font-black text-[#0B2545] mb-2">Phase 1 AI/ML Anomaly Detector & Dataset Architecture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">This dashboard demonstrates rule-based temperature alerts, simulated movement anomalies, and sensor-disconnection handling using synthetic data. It does not use a trained AI/ML model or provide validated clinical predictions.</p>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="p-5 rounded-2xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                  <div className="p-3 bg-blue-100 text-[#1976D2] rounded-xl w-fit mb-3">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0B2545] mb-1">1. Rule-Based Alert Engine</h4>
                  <p className="text-xs text-slate-600">Instantly triggers critical warnings when thermal or motor sensor readings deviate past medical safety boundaries.</p>
                </div>

                <div className="p-5 rounded-2xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl w-fit mb-3">
                    <Database className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0B2545] mb-1">2. Synthetic Dataset Pipeline</h4>
                  <p className="text-xs text-slate-600">Built using multi-variate time-series distributions referencing PhysioNet & UCI machine learning benchmarks for clinical robustness.</p>
                </div>

                <div className="p-5 rounded-2xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-xl w-fit mb-3">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0B2545] mb-1">3. Sensor Fault Detection</h4>
                  <p className="text-xs text-slate-600">Automatically identifies dropped packets or disconnected probes (INC-005) and flags the unit as offline instead of displaying stale data.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Baby Registration Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border" style={{ borderColor: '#D9E4EF' }}>
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sky-50 text-[#1976D2]">
                  <Baby className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0B2545]">Register New Baby & Assign Incubator</h3>
                  <p className="text-xs text-slate-500">Admit a newborn patient into an available NICU unit.</p>
                </div>
              </div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterBaby} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Select Incubator Unit</label>
                <select 
                  value={newBabyForm.incubatorId}
                  onChange={(e) => setNewBabyForm({...newBabyForm, incubatorId: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                  style={{ borderColor: '#D9E4EF' }}
                >
                  {units.map(u => (
                    <option key={u.incubatorId} value={u.incubatorId}>{u.incubatorId} — Current: {u.babyName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Baby Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Baby Oliver Smith"
                  value={newBabyForm.babyName}
                  onChange={(e) => setNewBabyForm({...newBabyForm, babyName: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                  style={{ borderColor: '#D9E4EF' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Gestational Age</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 28 wks"
                    value={newBabyForm.prematurity}
                    onChange={(e) => setNewBabyForm({...newBabyForm, prematurity: e.target.value})}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                    style={{ borderColor: '#D9E4EF' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Weight (grams)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., 1250"
                    value={newBabyForm.weight}
                    onChange={(e) => setNewBabyForm({...newBabyForm, weight: e.target.value})}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                    style={{ borderColor: '#D9E4EF' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Attending Physician</label>
                <select 
                  value={newBabyForm.doctor}
                  onChange={(e) => setNewBabyForm({...newBabyForm, doctor: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                  style={{ borderColor: '#D9E4EF' }}
                >
                  <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                  <option value="Dr. Marcus Vance">Dr. Marcus Vance</option>
                  <option value="Dr. Emily Chen">Dr. Emily Chen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[#0B2545]">Clinical Notes</label>
                <textarea 
                  rows="3"
                  placeholder="Enter initial vitals notes..."
                  value={newBabyForm.notes}
                  onChange={(e) => setNewBabyForm({...newBabyForm, notes: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-slate-50 text-[#0B2545]"
                  style={{ borderColor: '#D9E4EF' }}
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                <button 
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                  style={{ borderColor: '#D9E4EF' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-95"
                  style={{ backgroundColor: '#1976D2' }}
                >
                  Complete Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border" style={{ borderColor: '#D9E4EF' }}>
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex items-center space-x-3">
                <span className="font-black text-sm px-3 py-1 rounded-xl border bg-slate-50 text-[#0B2545]" style={{ borderColor: '#D9E4EF' }}>
                  {selectedUnit.incubatorId}
                </span>
                <div>
                  <h3 className="font-bold text-base text-[#0B2545]">{selectedUnit.babyName} ({selectedUnit.babyId})</h3>
                  <p className="text-xs text-slate-500">Telemetry History & Sensor Diagnostics</p>
                </div>
              </div>
              <button onClick={() => setSelectedUnit(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-slate-50" style={{ borderColor: '#D9E4EF' }}>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Sensor Status</span>
                  <p className={`text-sm font-black mt-0.5 ${
                    selectedUnit.sensorStatus === 'CONNECTED'
                    ? 'text-emerald-600': 'text-red-600'
                    }`
                    }
                    >
                      {selectedUnit.sensorStatus}
                      </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Attending Doctor</span>
                  <p className="text-sm font-black text-[#0B2545] mt-0.5">{selectedUnit.doctor}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Gestational Age</span>
                  <p className="text-sm font-black text-[#0B2545] mt-0.5">{selectedUnit.prematurity} ({selectedUnit.weight})</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Admission Time</span>
                  <p className="text-sm font-black text-[#0B2545] mt-0.5">{selectedUnit.admissionTime}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-sky-50 border-sky-200">
                <h4 className="text-xs font-bold uppercase text-[#1976D2] mb-1">Clinical Notes & Care Plan</h4>
                <p className="text-xs text-sky-900">{selectedUnit.notes}</p>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase text-[#0B2545] mb-2">Recent Livestream Readings Log</h4>
                <div className="border rounded-xl p-3 text-xs font-mono space-y-1 bg-slate-50 max-h-48 overflow-y-auto" style={{ borderColor: '#D9E4EF' }}>
                  <div className="flex justify-between font-bold pb-1 border-b text-slate-500" style={{ borderColor: '#D9E4EF' }}>
                    <span>Timestamp</span>
                    <span>Baby Temp</span>
                    <span>Incubator Temp</span>
                    <span>AI Status</span>
                  </div>
                  {selectedUnit.readings.slice(-6).map((r, idx) => (
                    <div key={idx} className="flex justify-between text-[#0B2545]">
                      <span>{r.timestamp}</span>
                      <span className="font-bold text-[#1976D2]">{r.babyTemp}°C</span>
                      <span className="font-bold text-[#00A6C7]">{r.incTemp}°C</span>
                      <span className={`font-bold ${r.status === 'CRITICAL' ? 'text-red-600' : 'text-emerald-600'}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setSelectedUnit(null)}
                  className="px-5 py-2 text-white rounded-xl text-sm font-bold hover:opacity-95"
                  style={{ backgroundColor: '#0B2545' }}
                >
                  Close Vitals Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
