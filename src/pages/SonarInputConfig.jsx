import React, { useState, useMemo } from 'react';
import { useSonar } from '../SonarContext';
import { calculateAbsorption } from '../acousticModel';
import { 
  Check, 
  Info, 
  Waves, 
  Zap,
  Activity,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function SonarInputConfig({ onNavigateToAnalysis }) {
  const { config, updateConfig, resetToDefaults, triggerCalculate, isCalculating, results, hasCalculated, isOutdated } = useSonar();
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [activeChart, setActiveChart] = useState('attenuation'); // 'attenuation' | 'resolution' | 'margin'

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const validateInputs = () => {
    const errs = {};
    if (config.targetDistanceM <= 0) errs.targetDistanceM = 'Must be > 0 m';
    if (config.batteryCapacityAh <= 0) errs.batteryCapacityAh = 'Must be > 0 Ah';
    if (config.batteryVoltageV <= 0) errs.batteryVoltageV = 'Must be > 0 V';
    if (config.minFreqKhz <= 0) errs.minFreqKhz = 'Must be > 0 kHz';
    if (config.maxFreqKhz <= 0) errs.maxFreqKhz = 'Must be > 0 kHz';
    else if (config.maxFreqKhz <= config.minFreqKhz) errs.maxFreqKhz = 'Must be > Min Freq';
    if (config.desiredRangeResM <= 0) errs.desiredRangeResM = 'Must be > 0 m';
    if (config.desiredMissionHours <= 0) errs.desiredMissionHours = 'Must be > 0 h';
    if (config.chirpBandwidthKhz <= 0) errs.chirpBandwidthKhz = 'Must be > 0 kHz';
    if (config.pulseDurationMs <= 0) errs.pulseDurationMs = 'Must be > 0 ms';
    if (config.transmitPowerLimitW <= 0) errs.transmitPowerLimitW = 'Must be > 0 W';
    if (config.usableCapacityPct <= 0 || config.usableCapacityPct > 100) errs.usableCapacityPct = '1 to 100%';
    if (config.amplifierEfficiencyPct <= 0 || config.amplifierEfficiencyPct > 100) errs.amplifierEfficiencyPct = '1 to 100%';
    if (config.depthM < 0 || config.depthM > 1000) errs.depthM = '0 to 1000m';
    if (config.turbidityNtu < 0 || config.turbidityNtu > 100) errs.turbidityNtu = '0 to 100 NTU';
    if (config.tempC < 0 || config.tempC > 40) errs.tempC = '0 to 40°C';
    if (config.salinityPsu < 0 || config.salinityPsu > 50) errs.salinityPsu = '0 to 50 PSU';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCalculate = () => {
    if (validateInputs()) {
      triggerCalculate();
      showNotification('Sonar performance successfully calculated! Outputs and graphs updated.');
    } else {
      showNotification('Validation Error: Target distance, battery, frequencies and voltages must be > 0 to calculate.');
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setErrors({});
    showNotification('Reset to defaults successfully.');
  };

  // Generate Frequency Sweep Data Points for the Graph
  const chartPoints = useMemo(() => {
    if (!hasCalculated || results.maxF <= results.minF) {
      return [];
    }
    const pts = [];
    const minF = results.minF;
    const maxF = results.maxF;
    const step = Math.max(5, Math.floor((maxF - minF) / 10));

    for (let f = minF; f <= maxF; f += step) {
      const alpha_dB_m = calculateAbsorption(f, config.tempC, config.salinityPsu, config.depthM, config.turbidityNtu);
      const alpha_dB_km = alpha_dB_m * 1000.0;
      const availableBwKhz = Math.min(config.chirpBandwidthKhz, Math.max(10, f * 0.25));
      const resM = results.effectiveSoundSpeed / (2 * (availableBwKhz * 1000));
      const twoWayTL = 2 * (20 * Math.log10(Math.max(1, config.targetDistanceM)) + alpha_dB_m * config.targetDistanceM);
      const pAcoustic = Math.max(0.1, results.activeTransmitPowerW * 0.5);
      const sl = 170.8 + 10 * Math.log10(pAcoustic) + 15.0;
      const el = sl - twoWayTL + config.targetStrengthDb;
      const pg = 10 * Math.log10(availableBwKhz * 1000 * (config.pulseDurationMs / 1000));
      const snr = (el - 45.0) + pg;

      pts.push({
        freq: f,
        alpha_dB_km,
        resCm: resM * 100,
        snr: Math.max(-10, snr)
      });
    }
    return pts;
  }, [results, config, hasCalculated]);

  const maxAlpha = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.alpha_dB_km), 10) : 10;
  const minAlpha = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.alpha_dB_km), 0) : 0;
  const maxRes = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.resCm), 10) : 10;
  const minRes = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.resCm), 1) : 1;
  const maxSnr = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.snr), 35) : 35;
  const minSnr = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.snr), -5) : -5;

  return (
    <div className="aquasense-main">
      {/* Page Header */}
      <div className="page-header-block" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>
              Input &amp; Configuration
            </h1>
            <p className="page-description" style={{ fontSize: 11, color: 'var(--slate-muted)' }}>
              Configure your environmental conditions, sonar parameters and power settings. Click 'Calculate' to analyze and get optimized results.
            </p>
          </div>
          <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
            Low-Power Adaptive SDR Sonar Transmitter for AUVs
          </span>
        </div>
      </div>

      {notification && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '8px 12px', borderRadius: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Check size={14} />
          <span>{notification}</span>
        </div>
      )}

      {isOutdated && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span><strong>Inputs have changed:</strong> Output results reflect previous calculation. Click <strong>'Calculate Sonar Performance'</strong> to recalculate results.</span>
        </div>
      )}

      {!hasCalculated && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '10px 14px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span><strong>Initial State (All 0):</strong> Numerical inputs and outputs are initially 0. Enter your parameters and click <strong>'Calculate Sonar Performance'</strong> to compute acoustic and power metrics.</span>
        </div>
      )}

      {/* 3-COLUMN INPUTS GRID MATCHING THE REFERENCE IMAGE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 }}>
        {/* COLUMN 1: Environmental Inputs */}
        <div className="aqua-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--navy-dark)' }}>1. Environmental Inputs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.depthM ? '#dc2626' : 'var(--slate-text)' }}>Water Depth (m)</label>
                <input
                  type="number"
                  value={config.depthM}
                  onChange={(e) => updateConfig('depthM', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.depthM ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.depthM && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.depthM}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.turbidityNtu ? '#dc2626' : 'var(--slate-text)' }}>Water Turbidity (NTU)</label>
                <input
                  type="number"
                  value={config.turbidityNtu}
                  onChange={(e) => updateConfig('turbidityNtu', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.turbidityNtu ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.turbidityNtu && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.turbidityNtu}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.tempC ? '#dc2626' : 'var(--slate-text)' }}>Water Temperature (°C)</label>
                <input
                  type="number"
                  value={config.tempC}
                  onChange={(e) => updateConfig('tempC', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.tempC ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.tempC && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.tempC}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.salinityPsu ? '#dc2626' : 'var(--slate-text)' }}>Water Salinity (PSU)</label>
                <input
                  type="number"
                  value={config.salinityPsu}
                  onChange={(e) => updateConfig('salinityPsu', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.salinityPsu ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.salinityPsu && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.salinityPsu}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10.5, color: 'var(--slate-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Speed of Sound <Info size={11} color="var(--slate-muted)" title="Calculated automatically via Mackenzie empirical formula" />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--navy-dark)', fontFamily: 'monospace' }}>
                {results.calculatedSoundSpeed.toFixed(0)} m/s
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 10.5, color: 'var(--slate-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                Acoustic Attenuation <Info size={11} color="var(--slate-muted)" title="Calculated automatically via Francois-Garrison model" />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--navy-dark)', fontFamily: 'monospace' }}>
                {results.calculatedAlpha_dB_km.toFixed(1)} dB/km
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Sonar Configuration */}
        <div className="aqua-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--navy-dark)' }}>2. Sonar Configuration</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.minFreqKhz ? '#dc2626' : 'var(--slate-text)' }}>Min Frequency (kHz)</label>
                <input
                  type="number"
                  value={config.minFreqKhz}
                  onChange={(e) => updateConfig('minFreqKhz', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.minFreqKhz ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.minFreqKhz && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.minFreqKhz}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.maxFreqKhz ? '#dc2626' : 'var(--slate-text)' }}>Max Frequency (kHz)</label>
                <input
                  type="number"
                  value={config.maxFreqKhz}
                  onChange={(e) => updateConfig('maxFreqKhz', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.maxFreqKhz ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.maxFreqKhz && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.maxFreqKhz}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.targetDistanceM ? '#dc2626' : 'var(--slate-text)' }}>Target Distance (m)</label>
                <input
                  type="number"
                  value={config.targetDistanceM}
                  onChange={(e) => updateConfig('targetDistanceM', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.targetDistanceM ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.targetDistanceM && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.targetDistanceM}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.desiredRangeResM ? '#dc2626' : 'var(--slate-text)' }}>Range Resolution (m)</label>
                <input
                  type="number"
                  step="0.01"
                value={config.desiredRangeResM}
                  onChange={(e) => updateConfig('desiredRangeResM', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.desiredRangeResM ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.desiredRangeResM && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.desiredRangeResM}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.chirpBandwidthKhz ? '#dc2626' : 'var(--slate-text)' }}>Chirp Bandwidth (kHz)</label>
                <input
                  type="number"
                  value={config.chirpBandwidthKhz}
                  onChange={(e) => updateConfig('chirpBandwidthKhz', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.chirpBandwidthKhz ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.chirpBandwidthKhz && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.chirpBandwidthKhz}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.pulseDurationMs ? '#dc2626' : 'var(--slate-text)' }}>Pulse Duration (ms)</label>
                <input
                  type="number"
                  value={config.pulseDurationMs}
                  onChange={(e) => updateConfig('pulseDurationMs', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.pulseDurationMs ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.pulseDurationMs && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.pulseDurationMs}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 10.5, color: 'var(--slate-text)' }}>Transmission Mode</label>
              <select
                value={config.transmissionMode}
                onChange={(e) => updateConfig('transmissionMode', e.target.value)}
                style={{ width: 90, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 11, background: '#fff' }}
              >
                <option value="Pulsed">Pulsed</option>
                <option value="Continuous">Continuous</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.transmitPowerLimitW ? '#dc2626' : 'var(--slate-text)' }}>Transmit Power Limit (W)</label>
                <input
                  type="number"
                  value={config.transmitPowerLimitW}
                  onChange={(e) => updateConfig('transmitPowerLimitW', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.transmitPowerLimitW ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.transmitPowerLimitW && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.transmitPowerLimitW}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.targetStrengthDb ? '#dc2626' : 'var(--slate-text)' }}>Target Strength (dB)</label>
                <input
                  type="number"
                  value={config.targetStrengthDb}
                  onChange={(e) => updateConfig('targetStrengthDb', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.targetStrengthDb ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.targetStrengthDb && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.targetStrengthDb}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.receiverSensitivityDb ? '#dc2626' : 'var(--slate-text)' }}>Receiver Sensitivity (dB)</label>
                <input
                  type="number"
                  value={config.receiverSensitivityDb}
                  onChange={(e) => updateConfig('receiverSensitivityDb', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.receiverSensitivityDb ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.receiverSensitivityDb && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.receiverSensitivityDb}</div>}
            </div>
          </div>
        </div>

        {/* COLUMN 3: Battery & Power Inputs */}
        <div className="aqua-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--navy-dark)' }}>3. Battery &amp; Power Inputs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.batteryVoltageV ? '#dc2626' : 'var(--slate-text)' }}>Battery Voltage (V)</label>
                <input
                  type="number"
                  value={config.batteryVoltageV}
                  onChange={(e) => updateConfig('batteryVoltageV', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.batteryVoltageV ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.batteryVoltageV && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.batteryVoltageV}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.batteryCapacityAh ? '#dc2626' : 'var(--slate-text)' }}>Battery Capacity (Ah)</label>
                <input
                  type="number"
                  value={config.batteryCapacityAh}
                  onChange={(e) => updateConfig('batteryCapacityAh', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.batteryCapacityAh ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.batteryCapacityAh && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.batteryCapacityAh}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.usableCapacityPct ? '#dc2626' : 'var(--slate-text)' }}>Usable Capacity (%)</label>
                <input
                  type="number"
                  value={config.usableCapacityPct}
                  onChange={(e) => updateConfig('usableCapacityPct', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.usableCapacityPct ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.usableCapacityPct && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.usableCapacityPct}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.desiredMissionHours ? '#dc2626' : 'var(--slate-text)' }}>Mission Duration (h)</label>
                <input
                  type="number"
                  value={config.desiredMissionHours}
                  onChange={(e) => updateConfig('desiredMissionHours', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.desiredMissionHours ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.desiredMissionHours && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.desiredMissionHours}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.amplifierEfficiencyPct ? '#dc2626' : 'var(--slate-text)' }}>Amplifier Efficiency (%)</label>
                <input
                  type="number"
                  value={config.amplifierEfficiencyPct}
                  onChange={(e) => updateConfig('amplifierEfficiencyPct', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.amplifierEfficiencyPct ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.amplifierEfficiencyPct && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.amplifierEfficiencyPct}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.electronicsPowerW ? '#dc2626' : 'var(--slate-text)' }}>Electronics &amp; Sensor Power (W)</label>
                <input
                  type="number"
                  value={config.electronicsPowerW}
                  onChange={(e) => updateConfig('electronicsPowerW', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.electronicsPowerW ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.electronicsPowerW && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.electronicsPowerW}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10.5, color: errors.dutyCyclePct ? '#dc2626' : 'var(--slate-text)' }}>Duty Cycle (%)</label>
                <input
                  type="number"
                  value={config.dutyCyclePct}
                  onChange={(e) => updateConfig('dutyCyclePct', Number(e.target.value))}
                  style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: `1px solid ${errors.dutyCyclePct ? '#ef4444' : 'var(--border-color)'}`, fontSize: 11, textAlign: 'right' }}
                />
              </div>
              {errors.dutyCyclePct && <div style={{ fontSize: 9, color: '#dc2626', textAlign: 'right', marginTop: 2 }}>{errors.dutyCyclePct}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURATION SUMMARY BOX & ACTION BUTTONS MATCHING REFERENCE IMAGE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        {/* Left: Configuration Summary Card */}
        <div className="aqua-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--mint-green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9 }}>✓</span>
            <strong style={{ fontSize: 11, color: 'var(--navy-dark)' }}>Configuration Summary</strong>
          </div>
          <div style={{ fontSize: 10, color: 'var(--slate-text)', lineHeight: 1.6, fontFamily: 'monospace' }}>
            <div>Depth: {config.depthM} m &nbsp;|&nbsp; Temp: {config.tempC} °C &nbsp;|&nbsp; Salinity: {config.salinityPsu} PSU</div>
            <div>Turbidity: {config.turbidityNtu} NTU &nbsp;|&nbsp; Target: {config.targetDistanceM} m</div>
            <div>Freq. Range: {config.minFreqKhz} – {config.maxFreqKhz} kHz &nbsp;|&nbsp; Resolution: {(config.desiredRangeResM * 100).toFixed(1)} cm</div>
            <div>Battery: {config.batteryVoltageV} V, {config.batteryCapacityAh} Ah ({config.usableCapacityPct}%) &nbsp;|&nbsp; Mission: {config.desiredMissionHours} h</div>
          </div>
        </div>

        {/* Right: Calculate & Reset Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn-primary-teal"
              onClick={handleCalculate}
              disabled={isCalculating}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8 }}
            >
              <Check size={14} />
              {isCalculating ? 'Calculating Performance...' : 'Calculate Sonar Performance'}
            </button>

            <button 
              className="filter-pill"
              onClick={handleReset}
              style={{ padding: '10px 16px', fontSize: 11, borderRadius: 8, background: '#ffffff' }}
            >
              Reset to Defaults
            </button>
          </div>

          <div style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🔒</span>
            <span>All values are saved and will be used across all pages.</span>
          </div>
        </div>
      </div>

      {/* DEDICATED CALCULATED OUTPUTS SECTION */}
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid var(--primary-teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'var(--primary-teal)', color: '#ffffff', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' }}>
              OUTPUT RESULTS
            </span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-dark)', margin: 0 }}>
              Calculated Sonar &amp; Power Performance
            </h2>
          </div>
          <span style={{ fontSize: 10, color: 'var(--slate-muted)', fontFamily: 'monospace' }}>
            🔒 Read-Only • Derived Automatically from Inputs
          </span>
        </div>

        <section className="metrics-grid-2x2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 4 }}>
        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">RECOMMENDED FREQUENCY</span>
            <Waves size={14} color="var(--primary-teal)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.recommendedFreqKhz}</span>
            <span className="metric-card-unit">kHz</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Optimal Propagation</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">ACHIEVABLE RESOLUTION</span>
            <Activity size={14} color="var(--mint-green-dark)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{hasCalculated ? (results.achievableRangeResolutionM * 100).toFixed(1) : '0.0'}</span>
            <span className="metric-card-unit">cm</span>
          </div>
          <div className="metric-card-footnote">
            <span>Target: {(config.desiredRangeResM * 100).toFixed(1)} cm</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">ACOUSTIC ATTENUATION</span>
            <Activity size={14} color="var(--accent-cyan)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{hasCalculated ? results.effectiveAlpha_dB_km.toFixed(1) : '0.0'}</span>
            <span className="metric-card-unit">dB/km</span>
          </div>
          <div className="metric-card-footnote">
            <span>2TL: {hasCalculated ? results.twoWayTL.toFixed(1) : '0.0'} dB</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">TRANSMITTER POWER</span>
            <Zap size={14} color="var(--primary-teal)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{hasCalculated ? results.activeTransmitPowerW : 0}</span>
            <span className="metric-card-unit">W</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Limit: {config.transmitPowerLimitW} W</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">AVERAGE SYSTEM POWER</span>
            <Zap size={14} color="var(--accent-cyan)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{hasCalculated ? results.totalAverageSystemPowerW.toFixed(1) : '0.0'}</span>
            <span className="metric-card-unit">W</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>{hasCalculated ? `-${results.powerSavingPct.toFixed(1)}% vs 80W Base` : '0% vs 80W Base'}</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">EST. BATTERY RUNTIME</span>
            <Clock size={14} color="var(--mint-green-dark)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{hasCalculated ? results.estimatedRuntimeHours.toFixed(1) : '0.0'}</span>
            <span className="metric-card-unit">hrs</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Target: {config.desiredMissionHours} hrs</span>
          </div>
        </div>
      </section>
    </div>

      {/* INTERACTIVE GRAPHS ON PAGE 1 */}
      <section className="aqua-card">
        <div className="aqua-card-header">
          <div>
            <h2 className="aqua-card-title">Calculated Performance Graphs</h2>
            <p className="aqua-card-subtitle">
              Dynamic plots automatically updated when clicking 'Calculate Sonar Performance'.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`filter-pill ${activeChart === 'attenuation' ? 'active' : ''}`}
              onClick={() => setActiveChart('attenuation')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              📉 Freq vs Attenuation
            </button>
            <button
              className={`filter-pill ${activeChart === 'resolution' ? 'active' : ''}`}
              onClick={() => setActiveChart('resolution')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              📏 Freq vs Resolution
            </button>
            <button
              className={`filter-pill ${activeChart === 'margin' ? 'active' : ''}`}
              onClick={() => setActiveChart('margin')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              🎯 Detection Margin
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 210, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px' }}>
          <svg viewBox="0 0 500 190" style={{ width: '100%', height: '100%' }}>
            <line x1="50" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="50" y1="65" x2="480" y2="65" stroke="#f1f5f9" />
            <line x1="50" y1="110" x2="480" y2="110" stroke="#f1f5f9" />
            <line x1="50" y1="155" x2="480" y2="155" stroke="#cbd5e1" strokeWidth="1.2" />

            {(!hasCalculated || chartPoints.length === 0) ? (
              <g>
                <text x="265" y="80" fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  EMPTY GRAPH — ZERO STATE
                </text>
                <text x="265" y="105" fill="#94a3b8" fontSize="10" textAnchor="middle">
                  Enter parameters and click 'Calculate Sonar Performance' to plot dynamic curves
                </text>
              </g>
            ) : (
              <>
            {/* CHART 1: Frequency vs Attenuation */}
            {activeChart === 'attenuation' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxAlpha.toFixed(1)}</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxAlpha + minAlpha) / 2).toFixed(1)}</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minAlpha.toFixed(1)} dB/km</text>

                <polyline
                  fill="none"
                  stroke="#085464"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 155 - ((pt.alpha_dB_km - minAlpha) / Math.max(1, maxAlpha - minAlpha)) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {(() => {
                  const recX = 50 + ((results.recommendedFreqKhz - results.minF) / (results.maxF - results.minF)) * 430;
                  const recY = 155 - ((results.effectiveAlpha_dB_km - minAlpha) / Math.max(1, maxAlpha - minAlpha)) * 135;
                  return (
                    <g>
                      <line x1={recX} y1="20" x2={recX} y2="155" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={recX} cy={recY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                      <text x={recX} y="15" fill="#d97706" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                        Rec: {results.recommendedFreqKhz} kHz
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART 2: Frequency vs Range Resolution */}
            {activeChart === 'resolution' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxRes.toFixed(1)} cm</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxRes + minRes) / 2).toFixed(1)}</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minRes.toFixed(1)} cm</text>

                <polyline
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 155 - ((pt.resCm - minRes) / Math.max(1, maxRes - minRes)) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {(() => {
                  const targetCm = config.desiredRangeResM * 100;
                  const targetY = 155 - ((targetCm - minRes) / Math.max(1, maxRes - minRes)) * 135;
                  return (
                    <g>
                      <line x1="50" y1={targetY} x2="480" y2={targetY} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="475" y={targetY - 4} fill="#059669" fontSize="8" fontFamily="monospace" textAnchor="end">
                        Target: {targetCm.toFixed(1)} cm
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART 3: Detection Margin */}
            {activeChart === 'margin' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxSnr.toFixed(1)} dB</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxSnr + minSnr) / 2).toFixed(1)}</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minSnr.toFixed(1)} dB</text>

                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 155 - ((pt.snr - minSnr) / Math.max(1, maxSnr - minSnr)) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {(() => {
                  const snr20Y = 155 - ((20 - minSnr) / Math.max(1, maxSnr - minSnr)) * 135;
                  return (
                    <g>
                      <line x1="50" y1={snr20Y} x2="480" y2={snr20Y} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="475" y={snr20Y - 4} fill="#dc2626" fontSize="8" fontFamily="monospace" textAnchor="end">
                        20 dB Target SNR Lock
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* X Axis Frequency Labels */}
            {chartPoints.map(pt => {
              const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
              return (
                <text key={pt.freq} x={x} y="170" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  {pt.freq}k
                </text>
              );
            })}
              </>
            )}
          </svg>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="filter-pill"
            onClick={onNavigateToAnalysis}
            style={{ background: '#f0f9ff', color: 'var(--accent-cyan)', borderColor: '#bae6fd', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11 }}
          >
            <span>Continue to Page 2: Adaptive Analysis</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
