import React, { useState, useMemo } from 'react';
import { useSonar } from '../SonarContext';
import { 
  calculateAbsorption 
} from '../acousticModel';
import { 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  Activity, 
  Waves, 
  Zap, 
  Battery, 
  Clock, 
  Sliders,
  Check
} from 'lucide-react';

export default function Dashboard({ onNavigateToInputs, onNavigateToAnalysis, onNavigateToPower }) {
  const { config, results } = useSonar();
  const [activeChart, setActiveChart] = useState('power'); // 'power' | 'battery_discharge' | 'attenuation' | 'resolution' | 'runtime'
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Generate Data for Frequency vs Attenuation
  const freqPoints = useMemo(() => {
    const pts = [];
    const minF = results.minF;
    const maxF = results.maxF;
    const step = Math.max(5, Math.floor((maxF - minF) / 8));
    for (let f = minF; f <= maxF; f += step) {
      const alpha_m = calculateAbsorption(f, config.tempC, config.salinityPsu, config.depthM, config.turbidityNtu);
      pts.push({
        freq: f,
        alpha_km: alpha_m * 1000.0
      });
    }
    return pts;
  }, [results, config]);

  // Battery Energy Discharge Points
  const dischargePoints = [];
  const hoursStep = Math.max(0.5, config.desiredMissionHours / 6);
  for (let h = 0; h <= config.desiredMissionHours; h += hoursStep) {
    const remainingWh = Math.max(0, results.usableBatteryEnergyWh - (results.totalAverageSystemPowerW * h));
    dischargePoints.push({
      hour: h,
      remainingWh
    });
  }

  // Export Complete Performance Report to CSV
  const handleExportReport = () => {
    const csv = "data:text/csv;charset=utf-8,"
      + "Report: Low-Power Adaptive SDR Sonar Transmitter for AUVs - Performance Report\n"
      + "Generated: " + new Date().toISOString() + "\n\n"
      + "--- 1. INPUT CONFIGURATION ---\n"
      + `Water Depth,${config.depthM},m\n`
      + `Water Turbidity,${config.turbidityNtu},NTU\n`
      + `Water Temperature,${config.tempC},°C\n`
      + `Water Salinity,${config.salinityPsu},PSU\n`
      + `Effective Sound Speed,${results.effectiveSoundSpeed.toFixed(2)},m/s\n`
      + `Acoustic Attenuation (alpha),${results.effectiveAlpha_dB_km.toFixed(2)},dB/km\n`
      + `Target Distance,${config.targetDistanceM},m\n`
      + `Configured Frequency Range,${config.minFreqKhz}-${config.maxFreqKhz},kHz\n`
      + `Desired Range Resolution,${(config.desiredRangeResM * 100).toFixed(1)},cm\n`
      + `Chirp Bandwidth,${results.effectiveBandwidthKhz},kHz\n`
      + `Pulse Duration,${config.pulseDurationMs},ms\n`
      + `Transmission Mode,${config.transmissionMode},\n`
      + `Transmit Power Limit,${config.transmitPowerLimitW},W\n`
      + `Battery Pack Specs,${config.batteryVoltageV}V ${config.batteryCapacityAh}Ah (${results.nominalBatteryEnergyWh} Wh),\n`
      + `Usable Capacity,${config.usableCapacityPct},% (${results.usableBatteryEnergyWh.toFixed(1)} Wh)\n`
      + `Amplifier Efficiency,${config.amplifierEfficiencyPct},% Class D\n`
      + `Desired Mission Duration,${config.desiredMissionHours},hrs\n\n`
      + "--- 2. CALCULATED PERFORMANCE RESULTS ---\n"
      + `Recommended Operating Frequency,${results.recommendedFreqKhz},kHz\n`
      + `Estimated Achievable Range Resolution,${(results.achievableRangeResolutionM * 100).toFixed(2)},cm\n`
      + `Achieves Desired Resolution,${results.satisfiesResolution ? 'YES' : 'NO'},\n`
      + `Required Acoustic Transmit Power,${results.requiredTransmitterPowerW.toFixed(1)},W\n`
      + `Active Transmit Power (Clamped),${results.activeTransmitPowerW},W\n`
      + `Round-Trip Attenuation (2TL),${results.twoWayTL.toFixed(1)},dB\n`
      + `Average Electrical System Power,${results.totalAverageSystemPowerW.toFixed(1)},W\n`
      + `Baseline Fixed Power (80W),${results.baselineAvgPowerW.toFixed(1)},W\n`
      + `Power Saving vs Baseline,${results.powerSavingPct.toFixed(1)},%\n`
      + `Estimated Battery Runtime,${results.estimatedRuntimeHours.toFixed(1)},hrs\n`
      + `Estimated Mission Energy (${config.desiredMissionHours}h),${results.estimatedMissionEnergyWh.toFixed(1)},Wh\n`
      + `Mission Feasibility Status,${results.feasibilityStatus},\n`
      + `Feasibility Assessment,${results.feasibilityExplanation.replace(/,/g, ';')},\n\n`
      + "--- 3. MODEL ASSUMPTIONS & LIMITATIONS ---\n"
      + "Model: Mackenzie (1981) Sound Speed; Francois-Garrison Seawater Absorption; Sonar Active Equation\n"
      + "Notice: Simulated acoustic model - physical oceanic validation required.\n";

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `SDR_Sonar_Performance_Report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Complete Performance Report exported successfully (.CSV).');
  };

  return (
    <div className="aquasense-main">
      {/* Top Header Block */}
      <div className="page-header-block">
        <div className="page-header-badge-row">
          <span className="badge-tag-blue">● PAGE 4: PERFORMANCE DASHBOARD</span>
          <span className="badge-tag-green">LOW-POWER ADAPTIVE SDR SONAR FOR AUVS</span>
        </div>
        <h1 className="page-title">Sonar Performance Dashboard</h1>
        <p className="page-description">
          Consolidated performance metrics, mission feasibility validation, multi-dimensional charts, and downloadable technical reports.
        </p>
      </div>

      {notification && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Check size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Control Bar with Back & Export Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
        <button 
          className="filter-pill"
          onClick={onNavigateToInputs}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 11 }}
        >
          <ArrowLeft size={14} />
          Back to Page 1: Inputs &amp; Configuration
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="filter-pill"
            onClick={onNavigateToAnalysis}
            style={{ fontSize: 10.5, padding: '8px 10px' }}
          >
            Page 2: Adaptive Analysis
          </button>
          <button 
            className="filter-pill"
            onClick={onNavigateToPower}
            style={{ fontSize: 10.5, padding: '8px 10px' }}
          >
            Page 3: Power Analysis
          </button>
        </div>

        <button 
          className="btn-primary-teal"
          onClick={handleExportReport}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11.5 }}
        >
          <Download size={14} />
          Download Performance Report (.CSV)
        </button>
      </div>

      {/* 4. MISSION FEASIBILITY STATUS BANNER */}
      <section className="aqua-card" style={{ marginBottom: 14, borderLeft: `4px solid ${results.meetsMissionDuration && results.isPowerWithinLimit ? 'var(--mint-green)' : '#f59e0b'}` }}>
        <div className="aqua-card-header" style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {results.meetsMissionDuration && results.isPowerWithinLimit ? (
              <CheckCircle2 size={18} color="var(--mint-green-dark)" />
            ) : (
              <AlertTriangle size={18} color="#d97706" />
            )}
            <h2 className="aqua-card-title">Mission Feasibility Status: {results.feasibilityStatus}</h2>
          </div>
          <span className={`badge-tag-${results.meetsMissionDuration && results.isPowerWithinLimit ? 'green' : 'blue'}`}>
            {results.meetsMissionDuration ? 'RUNTIME MET' : 'ATTENTION REQUIRED'}
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--slate-text)', lineHeight: 1.5 }}>
          {results.feasibilityExplanation}
        </p>
      </section>

      {/* 1. PERFORMANCE SUMMARY CARDS (9 KEY METRICS) */}
      <section className="metrics-grid-2x2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
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
            <span>Range: {config.minFreqKhz}–{config.maxFreqKhz} kHz</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">ACHIEVABLE RESOLUTION</span>
            <Activity size={14} color="var(--mint-green-dark)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{(results.achievableRangeResolutionM * 100).toFixed(1)}</span>
            <span className="metric-card-unit">cm</span>
          </div>
          <div className="metric-card-footnote">
            <span>Desired: {(config.desiredRangeResM * 100).toFixed(1)} cm</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">ACOUSTIC ATTENUATION</span>
            <Activity size={14} color="var(--accent-cyan)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.effectiveAlpha_dB_km.toFixed(1)}</span>
            <span className="metric-card-unit">dB/km</span>
          </div>
          <div className="metric-card-footnote">
            <span>Round-Trip 2TL: {results.twoWayTL.toFixed(1)} dB</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">EST. TRANSMIT POWER</span>
            <Zap size={14} color="var(--primary-teal)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.requiredTransmitterPowerW.toFixed(1)}</span>
            <span className="metric-card-unit">W</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Clamped Limit: {config.transmitPowerLimitW} W</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">AVERAGE SYSTEM POWER</span>
            <Zap size={14} color="var(--accent-cyan)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.totalAverageSystemPowerW.toFixed(1)}</span>
            <span className="metric-card-unit">W</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Baseline: {results.baselineAvgPowerW.toFixed(1)} W</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">USABLE BATTERY ENERGY</span>
            <Battery size={14} color="var(--mint-green)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.usableBatteryEnergyWh.toFixed(0)}</span>
            <span className="metric-card-unit">Wh</span>
          </div>
          <div className="metric-card-footnote">
            <span>Nominal: {results.nominalBatteryEnergyWh} Wh</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">BATTERY RUNTIME</span>
            <Clock size={14} color="var(--mint-green-dark)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.estimatedRuntimeHours.toFixed(1)}</span>
            <span className="metric-card-unit">hrs</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>Target: {config.desiredMissionHours} hrs</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">EST. MISSION ENERGY</span>
            <Battery size={14} color="var(--primary-teal)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.estimatedMissionEnergyWh.toFixed(1)}</span>
            <span className="metric-card-unit">Wh</span>
          </div>
          <div className="metric-card-footnote">
            <span>For {config.desiredMissionHours}h Dive</span>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-card-top">
            <span className="metric-card-label">POWER SAVINGS</span>
            <ShieldCheck size={14} color="var(--mint-green-dark)" />
          </div>
          <div className="metric-card-val-row">
            <span className="metric-card-number">{results.powerSavingPct.toFixed(1)}</span>
            <span className="metric-card-unit">%</span>
          </div>
          <div className="metric-card-footnote text-savings">
            <span>vs 80W Fixed Baseline</span>
          </div>
        </div>
      </section>

      {/* 2. PERFORMANCE GRAPHS */}
      <section className="aqua-card" style={{ marginBottom: 14 }}>
        <div className="aqua-card-header">
          <div>
            <h2 className="aqua-card-title">2. Interactive Performance Graphs</h2>
            <p className="aqua-card-subtitle">
              Responsive visualizations generated directly from current inputs and calculations.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button
              className={`filter-pill ${activeChart === 'power' ? 'active' : ''}`}
              onClick={() => setActiveChart('power')}
              style={{ fontSize: 9.5, padding: '4px 7px' }}
            >
              ⚡ Power (Adaptive vs Fixed)
            </button>
            <button
              className={`filter-pill ${activeChart === 'battery_discharge' ? 'active' : ''}`}
              onClick={() => setActiveChart('battery_discharge')}
              style={{ fontSize: 9.5, padding: '4px 7px' }}
            >
              🔋 Battery Over Mission
            </button>
            <button
              className={`filter-pill ${activeChart === 'attenuation' ? 'active' : ''}`}
              onClick={() => setActiveChart('attenuation')}
              style={{ fontSize: 9.5, padding: '4px 7px' }}
            >
              📉 Freq vs Attenuation
            </button>
            <button
              className={`filter-pill ${activeChart === 'resolution' ? 'active' : ''}`}
              onClick={() => setActiveChart('resolution')}
              style={{ fontSize: 9.5, padding: '4px 7px' }}
            >
              📏 Desired vs Achievable Res
            </button>
            <button
              className={`filter-pill ${activeChart === 'runtime' ? 'active' : ''}`}
              onClick={() => setActiveChart('runtime')}
              style={{ fontSize: 9.5, padding: '4px 7px' }}
            >
              ⏱️ Runtime vs Target
            </button>
          </div>
        </div>

        {/* Dynamic SVG Plot */}
        <div style={{ width: '100%', height: 210, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px' }}>
          <svg viewBox="0 0 500 190" style={{ width: '100%', height: '100%' }}>
            {/* Grid */}
            <line x1="50" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="50" y1="65" x2="480" y2="65" stroke="#f1f5f9" />
            <line x1="50" y1="110" x2="480" y2="110" stroke="#f1f5f9" />
            <line x1="50" y1="155" x2="480" y2="155" stroke="#cbd5e1" strokeWidth="1.2" />

            {/* CHART A: Fixed vs Adaptive Power */}
            {activeChart === 'power' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">50W</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">25W</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0W</text>

                {(() => {
                  const hAdapt = (results.totalAverageSystemPowerW / 50) * 135;
                  const hBase = (results.baselineAvgPowerW / 50) * 135;
                  return (
                    <g>
                      <rect x="130" y={155 - hAdapt} width="90" height={hAdapt} fill="#085464" rx="4" />
                      <text x="175" y={155 - hAdapt - 6} fill="#085464" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.totalAverageSystemPowerW.toFixed(1)} W
                      </text>
                      <text x="175" y="172" fill="#085464" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Adaptive SDR
                      </text>

                      <rect x="290" y={155 - hBase} width="90" height={hBase} fill="#cbd5e1" rx="4" />
                      <text x="335" y={155 - hBase - 6} fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.baselineAvgPowerW.toFixed(1)} W
                      </text>
                      <text x="335" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Fixed Baseline (80W)
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART B: Battery Energy Consumption Over Mission */}
            {activeChart === 'battery_discharge' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{results.usableBatteryEnergyWh.toFixed(0)}</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{(results.usableBatteryEnergyWh / 2).toFixed(0)}</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0 Wh</text>

                <polyline
                  fill="none"
                  stroke="#085464"
                  strokeWidth="2.5"
                  points={dischargePoints.map(p => {
                    const x = 50 + (p.hour / config.desiredMissionHours) * 430;
                    const y = 155 - (p.remainingWh / results.usableBatteryEnergyWh) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {dischargePoints.map(p => {
                  const x = 50 + (p.hour / config.desiredMissionHours) * 430;
                  return (
                    <text key={p.hour} x={x} y="170" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      {p.hour}h
                    </text>
                  );
                })}
              </g>
            )}

            {/* CHART C: Freq vs Attenuation */}
            {activeChart === 'attenuation' && (
              <g>
                {(() => {
                  const maxA = Math.max(...freqPoints.map(p => p.alpha_km), 10);
                  const minA = Math.min(...freqPoints.map(p => p.alpha_km), 0);
                  return (
                    <g>
                      <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxA.toFixed(1)}</text>
                      <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minA.toFixed(1)} dB/km</text>

                      <polyline
                        fill="none"
                        stroke="#085464"
                        strokeWidth="2.5"
                        points={freqPoints.map(p => {
                          const x = 50 + ((p.freq - results.minF) / (results.maxF - results.minF)) * 430;
                          const y = 155 - ((p.alpha_km - minA) / (maxA - minA)) * 135;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {freqPoints.map(p => {
                        const x = 50 + ((p.freq - results.minF) / (results.maxF - results.minF)) * 430;
                        return (
                          <text key={p.freq} x={x} y="170" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                            {p.freq}k
                          </text>
                        );
                      })}
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART D: Desired vs Achievable Resolution */}
            {activeChart === 'resolution' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">20 cm</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">10 cm</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0 cm</text>

                {(() => {
                  const desiredCm = config.desiredRangeResM * 100;
                  const achCm = results.achievableRangeResolutionM * 100;
                  const hDesired = Math.min(135, (desiredCm / 20) * 135);
                  const hAch = Math.min(135, (achCm / 20) * 135);
                  return (
                    <g>
                      <rect x="130" y={155 - hDesired} width="90" height={hDesired} fill="#cbd5e1" rx="4" />
                      <text x="175" y={155 - hDesired - 6} fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {desiredCm.toFixed(1)} cm
                      </text>
                      <text x="175" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Desired Target
                      </text>

                      <rect x="290" y={155 - hAch} width="90" height={hAch} fill="#085464" rx="4" />
                      <text x="335" y={155 - hAch - 6} fill="#085464" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {achCm.toFixed(1)} cm
                      </text>
                      <text x="335" y="172" fill="#085464" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Achievable Result
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART E: Estimated Runtime vs Mission Duration */}
            {activeChart === 'runtime' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">30 hrs</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">15 hrs</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0 hrs</text>

                {(() => {
                  const hRuntime = Math.min(135, (results.estimatedRuntimeHours / 30) * 135);
                  const hMission = Math.min(135, (config.desiredMissionHours / 30) * 135);
                  return (
                    <g>
                      <rect x="130" y={155 - hRuntime} width="90" height={hRuntime} fill="#10b981" rx="4" />
                      <text x="175" y={155 - hRuntime - 6} fill="#059669" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.estimatedRuntimeHours.toFixed(1)} hrs
                      </text>
                      <text x="175" y="172" fill="#059669" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Estimated Runtime
                      </text>

                      <rect x="290" y={155 - hMission} width="90" height={hMission} fill="#cbd5e1" rx="4" />
                      <text x="335" y={155 - hMission - 6} fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {config.desiredMissionHours} hrs
                      </text>
                      <text x="335" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Target Mission
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      </section>

      {/* 3. ADAPTIVE SONAR RECOMMENDATIONS & 5. INPUT SUMMARY */}
      <div className="desktop-two-col-grid">
        {/* Adaptive Sonar Recommendations */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">3. Model Recommendations</h2>
            </div>
            <span className="badge-tag-blue">COGNITIVE ADAPTATION</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10.5 }}>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong style={{ color: 'var(--navy-dark)' }}>Frequency &amp; Attenuation Tuning:</strong>
              <p style={{ color: 'var(--slate-text)', marginTop: 2 }}>
                At {config.targetDistanceM}m target distance and {config.turbidityNtu} NTU turbidity, optimal carrier is {results.recommendedFreqKhz} kHz. Operating above 450 kHz would produce {calculateAbsorption(480, config.tempC, config.salinityPsu, config.depthM, config.turbidityNtu).toFixed(2)} dB/m loss, requiring significant power scaling.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong style={{ color: 'var(--navy-dark)' }}>Range Resolution Advice:</strong>
              <p style={{ color: 'var(--slate-text)', marginTop: 2 }}>
                {results.satisfiesResolution 
                  ? `Configured bandwidth (${results.effectiveBandwidthKhz} kHz) satisfies the target resolution of ${(config.desiredRangeResM * 100).toFixed(1)} cm.` 
                  : `Desired resolution of ${(config.desiredRangeResM * 100).toFixed(1)} cm requires ${results.requiredBandwidthKhz.toFixed(1)} kHz bandwidth. Recommend increasing chirp bandwidth to ${Math.min(config.maxFreqKhz - config.minFreqKhz, Math.ceil(results.requiredBandwidthKhz))} kHz or relaxing resolution target.`}
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <strong style={{ color: 'var(--navy-dark)' }}>Power &amp; Battery Advice:</strong>
              <p style={{ color: 'var(--slate-text)', marginTop: 2 }}>
                {results.meetsMissionDuration
                  ? `Current average consumption (${results.totalAverageSystemPowerW.toFixed(1)}W) safely satisfies the ${config.desiredMissionHours}h mission with ${(results.estimatedRuntimeHours - config.desiredMissionHours).toFixed(1)}h reserve.`
                  : `Mission duration of ${config.desiredMissionHours}h exceeds battery endurance (${results.estimatedRuntimeHours.toFixed(1)}h). Recommend lowering pulse duty cycle to ${Math.max(5, Math.floor(config.dutyCyclePct * 0.7))}% or utilizing a higher capacity battery.`}
              </p>
            </div>
          </div>
        </section>

        {/* 5. Compact Input Configuration Summary */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">5. Active Configuration Summary</h2>
            </div>
            <button 
              className="filter-pill"
              onClick={onNavigateToInputs}
              style={{ fontSize: 9.5, padding: '4px 8px' }}
            >
              Edit Inputs
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10.5 }}>
            <div className="formula-stat-tile">
              <div>
                <strong>Water Depth:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.depthM} m</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Water Temp:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.tempC} °C</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Turbidity:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.turbidityNtu} NTU</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Salinity:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.salinityPsu} PSU</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Target Range:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.targetDistanceM} m</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Chirp BW:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{results.effectiveBandwidthKhz} kHz</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Battery Pack:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.batteryVoltageV}V / {config.batteryCapacityAh}Ah</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Class D Eff:</strong>
              </div>
              <span style={{ fontFamily: 'monospace' }}>{config.amplifierEfficiencyPct}%</span>
            </div>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button 
              className="btn-primary-teal"
              onClick={onNavigateToInputs}
              style={{ width: '100%', padding: '9px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} />
              Back to Inputs &amp; Reconfigure
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
