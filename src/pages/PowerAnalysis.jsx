import React, { useState } from 'react';
import { useSonar } from '../SonarContext';
import { Battery, Zap, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function PowerAnalysis({ onNavigateToAnalysis, onNavigateToDashboard }) {
  const { config, results, hasCalculated, isOutdated } = useSonar();
  const [activeChart, setActiveChart] = useState('power'); // 'power' | 'runtime' | 'discharge' | 'mission_energy'

  // Generate Mission Discharge Curve (Hours 0 to desiredMissionHours)
  const dischargePoints = [];
  if (hasCalculated && config.desiredMissionHours > 0 && results.usableBatteryEnergyWh > 0) {
    const hoursStep = Math.max(0.5, config.desiredMissionHours / 8);
    for (let h = 0; h <= config.desiredMissionHours; h += hoursStep) {
      const adaptiveRemaining = Math.max(0, results.usableBatteryEnergyWh - (results.totalAverageSystemPowerW * h));
      const baselineRemaining = Math.max(0, results.usableBatteryEnergyWh - (results.baselineAvgPowerW * h));
      dischargePoints.push({
        hour: h,
        adaptiveWh: adaptiveRemaining,
        baselineWh: baselineRemaining
      });
    }
  }

  return (
    <div className="aquasense-main">
      {/* Top Header Block */}
      <div className="page-header-block">
        <div className="page-header-badge-row">
          <span className="badge-tag-blue">● PAGE 3: POWER &amp; BATTERY OPTIMIZATION</span>
          <span className="badge-tag-green">MEASURED EFFICIENCY &gt;82% CLASS D</span>
        </div>
        <h1 className="page-title">Low-Power Optimization &amp; Battery Analysis</h1>
        <p className="page-description">
          Calculates battery energy storage, average electrical power draw, Class D amplifier losses, runtime endurance, and energy savings over the fixed baseline.
        </p>
      </div>

      {/* Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
        <button 
          className="filter-pill"
          onClick={onNavigateToAnalysis}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 11 }}
        >
          <ArrowLeft size={14} />
          Back to Page 2: Adaptive Analysis
        </button>

        <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--slate-muted)' }}>
          Battery: {config.batteryVoltageV}V × {config.batteryCapacityAh}Ah ({results.nominalBatteryEnergyWh} Wh)
        </span>

        <button 
          className="btn-primary-teal"
          onClick={onNavigateToDashboard}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11 }}
        >
          <span>Continue to Page 4: Performance Dashboard</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {isOutdated && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span><strong>Inputs have changed:</strong> Output results reflect previous calculation. Return to Page 1 and click <strong>'Calculate Sonar Performance'</strong> to update.</span>
        </div>
      )}

      {!hasCalculated && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '10px 14px', borderRadius: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span><strong>Initial Zero State:</strong> Power analysis has not been calculated yet. Output cards and discharge curves initially show zero values. Return to Page 1 and click <strong>'Calculate Sonar Performance'</strong>.</span>
        </div>
      )}

      {/* WARNINGS BANNER */}
      {hasCalculated && (!results.meetsMissionDuration || !results.isPowerWithinLimit) && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', marginBottom: 4 }}>
            <AlertTriangle size={18} />
            <strong style={{ fontSize: 12 }}>System Warnings &amp; Model Limitations</strong>
          </div>
          <ul style={{ fontSize: 10.5, color: '#78350f', paddingLeft: 20, lineHeight: 1.5 }}>
            {!results.meetsMissionDuration && (
              <li>
                <strong>Battery Runtime Alert:</strong> Estimated runtime ({results.estimatedRuntimeHours.toFixed(1)} hrs) is below the configured mission target ({config.desiredMissionHours} hrs). Consider reducing transmission duty cycle or increasing battery capacity.
              </li>
            )}
            {!results.isPowerWithinLimit && (
              <li>
                <strong>Power Limit Alert:</strong> Required transmit power ({results.requiredTransmitterPowerW.toFixed(1)} W) exceeds hardware limit ({config.transmitPowerLimitW} W).
              </li>
            )}
            <li>
              <strong>Acoustic Model Assumption:</strong> Power consumption is estimated using empirical acoustic formulas and Class D electrical models. Not a substitute for physical tank or ocean trials.
            </li>
          </ul>
        </div>
      )}

      {/* 1. BATTERY ENERGY & 2. POWER MODEL CARDS */}
      <div className="desktop-two-col-grid" style={{ marginBottom: 14 }}>
        {/* Battery Energy Model */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Battery size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">1. Battery Energy Storage</h2>
            </div>
            <span className="badge-tag-green">LI-ION {config.batteryVoltageV}V</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="formula-stat-tile">
              <div>
                <strong>Nominal Battery Energy:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Voltage (V) × Capacity (Ah)</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{results.nominalBatteryEnergyWh} Wh</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Usable Battery Energy:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Nominal × {config.usableCapacityPct}% DoD</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary-teal)' }}>
                {results.usableBatteryEnergyWh.toFixed(1)} Wh
              </span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Estimated Mission Energy:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Average Power × {config.desiredMissionHours} hrs</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                {results.estimatedMissionEnergyWh.toFixed(1)} Wh
              </span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Remaining Energy at Mission End:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Usable - Mission Energy</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: results.remainingBatteryEnergyWh > 0 ? 'var(--mint-green-dark)' : '#dc2626' }}>
                {results.remainingBatteryEnergyWh.toFixed(1)} Wh
              </span>
            </div>
          </div>
        </section>

        {/* Electrical Power Consumption Breakdown */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">2. Power Consumption Breakdown</h2>
            </div>
            <span className="badge-tag-blue">AVERAGE SYSTEM: {results.totalAverageSystemPowerW.toFixed(1)} W</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="formula-stat-tile">
              <div>
                <strong>Acoustic Transmit Power (Peak):</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Active Transmit during pulse</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{results.activeTransmitPowerW} W</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Electrical Input during Pulse:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>P_acoustic / {config.amplifierEfficiencyPct}% Class D eff</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{results.txElectricalPowerDuringPulseW.toFixed(1)} W</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Average Transmit Power:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>
                  Pulse Electrical × {config.transmissionMode === 'Continuous' ? '100% CW' : `${config.dutyCyclePct}% Duty Cycle`}
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary-teal)' }}>
                {results.averageTransmitPowerW.toFixed(1)} W
              </span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Electronics &amp; Sensors:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>STM32H7 + Artix-7 + Sensors</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{results.electronicsPowerW.toFixed(1)} W</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Total Average System Power:</strong>
                <div style={{ fontSize: 9.5, color: 'var(--slate-muted)' }}>Average Transmit + Electronics</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--mint-green-dark)' }}>
                {results.totalAverageSystemPowerW.toFixed(1)} W
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* 4. FIXED VS ADAPTIVE COMPARISON TILES */}
      <section className="aqua-card" style={{ marginBottom: 14 }}>
        <div className="aqua-card-header">
          <div>
            <h2 className="aqua-card-title">4. Fixed Baseline vs. Adaptive SDR Sonar Comparison</h2>
            <p className="aqua-card-subtitle">
              Comparing 80W full-power fixed frequency baseline against the cognitive adaptive transmitter under identical conditions.
            </p>
          </div>
          <span className="badge-tag-green">
            {results.powerSavingPct > 0 ? `+${results.powerSavingPct.toFixed(1)}% POWER SAVINGS` : 'BASELINE COMPARABLE'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {/* Average Power Comparison */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--slate-muted)' }}>AVERAGE SYSTEM POWER</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Adaptive:</span>
                <strong style={{ fontSize: 16, color: 'var(--primary-teal)', display: 'block' }}>
                  {results.totalAverageSystemPowerW.toFixed(1)} W
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Fixed Baseline:</span>
                <strong style={{ fontSize: 16, color: '#dc2626', display: 'block' }}>
                  {results.baselineAvgPowerW.toFixed(1)} W
                </strong>
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--mint-green-dark)', marginTop: 6, fontWeight: 'bold' }}>
              Reduction: {results.powerSavingPct.toFixed(1)}%
            </div>
          </div>

          {/* Operating Runtime Comparison */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--slate-muted)' }}>ESTIMATED BATTERY RUNTIME</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Adaptive:</span>
                <strong style={{ fontSize: 16, color: 'var(--mint-green-dark)', display: 'block' }}>
                  {results.estimatedRuntimeHours.toFixed(1)} hrs
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Fixed Baseline:</span>
                <strong style={{ fontSize: 16, color: '#64748b', display: 'block' }}>
                  {results.baselineRuntimeHours.toFixed(1)} hrs
                </strong>
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--primary-teal)', marginTop: 6, fontWeight: 'bold' }}>
              Gain: +{(results.estimatedRuntimeHours - results.baselineRuntimeHours).toFixed(1)} hrs (+{((results.estimatedRuntimeHours / results.baselineRuntimeHours - 1) * 100).toFixed(0)}%)
            </div>
          </div>

          {/* Mission Energy Comparison */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--slate-muted)' }}>{config.desiredMissionHours}H MISSION ENERGY</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Adaptive:</span>
                <strong style={{ fontSize: 16, color: 'var(--primary-teal)', display: 'block' }}>
                  {results.estimatedMissionEnergyWh.toFixed(1)} Wh
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, color: 'var(--slate-muted)' }}>Fixed Baseline:</span>
                <strong style={{ fontSize: 16, color: '#dc2626', display: 'block' }}>
                  {results.baselineMissionEnergyWh.toFixed(1)} Wh
                </strong>
              </div>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--mint-green-dark)', marginTop: 6, fontWeight: 'bold' }}>
              Saved: {(results.baselineMissionEnergyWh - results.estimatedMissionEnergyWh).toFixed(1)} Wh
            </div>
          </div>

          {/* Mission Feasibility */}
          <div style={{ background: results.meetsMissionDuration ? '#f0fdf4' : '#fef2f2', padding: 12, borderRadius: 8, border: `1px solid ${results.meetsMissionDuration ? '#bbf7d0' : '#fecaca'}` }}>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: hasCalculated ? (results.meetsMissionDuration ? '#166534' : '#991b1b') : 'var(--slate-muted)' }}>MISSION FEASIBILITY</span>
            <strong style={{ fontSize: 14, color: hasCalculated ? (results.meetsMissionDuration ? '#15803d' : '#dc2626') : 'var(--navy-dark)', display: 'block', marginTop: 4 }}>
              {hasCalculated ? (results.meetsMissionDuration ? 'FEASIBLE' : 'DEFICIT') : 'NOT CALCULATED'}
            </strong>
            <div style={{ fontSize: 9.5, color: results.meetsMissionDuration ? '#14532d' : '#7f1d1d', marginTop: 6 }}>
              {hasCalculated ? (results.meetsMissionDuration 
                ? `Satisfies target ${config.desiredMissionHours}h with ${(results.estimatedRuntimeHours - config.desiredMissionHours).toFixed(1)}h reserve`
                : `Short by ${(config.desiredMissionHours - results.estimatedRuntimeHours).toFixed(1)}h`) : 'Simulation not calculated yet'}
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE POWER CHARTS */}
      <section className="aqua-card">
        <div className="aqua-card-header">
          <div>
            <h2 className="aqua-card-title">5. Interactive Battery &amp; Power Visualizations</h2>
            <p className="aqua-card-subtitle">
              Calculated dynamically from configured {config.batteryVoltageV}V {config.batteryCapacityAh}Ah pack and {config.transmissionMode} power model.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`filter-pill ${activeChart === 'power' ? 'active' : ''}`}
              onClick={() => setActiveChart('power')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              ⚡ Fixed vs Adaptive Power
            </button>
            <button
              className={`filter-pill ${activeChart === 'discharge' ? 'active' : ''}`}
              onClick={() => setActiveChart('discharge')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              🔋 Battery Discharge Curve
            </button>
            <button
              className={`filter-pill ${activeChart === 'runtime' ? 'active' : ''}`}
              onClick={() => setActiveChart('runtime')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              ⏱️ Runtime Comparison
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 210, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px' }}>
          <svg viewBox="0 0 500 190" style={{ width: '100%', height: '100%' }}>
            {/* Grid Lines */}
            <line x1="50" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="50" y1="65" x2="480" y2="65" stroke="#f1f5f9" />
            <line x1="50" y1="110" x2="480" y2="110" stroke="#f1f5f9" />
            <line x1="50" y1="155" x2="480" y2="155" stroke="#cbd5e1" strokeWidth="1.2" />

            {(!hasCalculated || results.usableBatteryEnergyWh <= 0) ? (
              <g>
                <text x="265" y="85" fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  EMPTY GRAPH — ZERO STATE
                </text>
                <text x="265" y="110" fill="#94a3b8" fontSize="10" textAnchor="middle">
                  Configure battery parameters and click 'Calculate Sonar Performance' on Page 1 to generate power profiles
                </text>
              </g>
            ) : (
              <>
            {/* CHART 1: Fixed vs Adaptive Power Bar Chart */}
            {activeChart === 'power' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">50W</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">25W</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0W</text>

                {/* Adaptive Power Bar */}
                {(() => {
                  const h = (results.totalAverageSystemPowerW / 50) * 135;
                  const y = 155 - h;
                  return (
                    <g>
                      <rect x="130" y={y} width="90" height={h} fill="#085464" rx="4" />
                      <text x="175" y={y - 6} fill="#085464" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.totalAverageSystemPowerW.toFixed(1)} W
                      </text>
                      <text x="175" y="172" fill="#085464" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Adaptive SDR
                      </text>
                    </g>
                  );
                })()}

                {/* Baseline Power Bar */}
                {(() => {
                  const h = (results.baselineAvgPowerW / 50) * 135;
                  const y = 155 - h;
                  return (
                    <g>
                      <rect x="290" y={y} width="90" height={h} fill="#cbd5e1" rx="4" />
                      <text x="335" y={y - 6} fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
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

            {/* CHART 2: Battery Discharge Curve over Time */}
            {activeChart === 'discharge' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{results.usableBatteryEnergyWh.toFixed(0)}</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{(results.usableBatteryEnergyWh / 2).toFixed(0)}</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0 Wh</text>

                {/* Adaptive Discharge Line */}
                <polyline
                  fill="none"
                  stroke="#085464"
                  strokeWidth="2.5"
                  points={dischargePoints.map(p => {
                    const x = 50 + (p.hour / config.desiredMissionHours) * 430;
                    const y = 155 - (p.adaptiveWh / results.usableBatteryEnergyWh) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Baseline Discharge Line */}
                <polyline
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  points={dischargePoints.map(p => {
                    const x = 50 + (p.hour / config.desiredMissionHours) * 430;
                    const y = 155 - (p.baselineWh / results.usableBatteryEnergyWh) * 135;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* X Axis Time Labels */}
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

            {/* CHART 3: Runtime Hours Comparison */}
            {activeChart === 'runtime' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">30h</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">15h</text>
                <text x="42" y="155" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">0h</text>

                {/* Adaptive Runtime Bar */}
                {(() => {
                  const h = Math.min(135, (results.estimatedRuntimeHours / 30) * 135);
                  const y = 155 - h;
                  return (
                    <g>
                      <rect x="130" y={y} width="90" height={h} fill="#10b981" rx="4" />
                      <text x="175" y={y - 6} fill="#059669" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.estimatedRuntimeHours.toFixed(1)} hrs
                      </text>
                      <text x="175" y="172" fill="#059669" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Adaptive SDR
                      </text>
                    </g>
                  );
                })()}

                {/* Baseline Runtime Bar */}
                {(() => {
                  const h = Math.min(135, (results.baselineRuntimeHours / 30) * 135);
                  const y = 155 - h;
                  return (
                    <g>
                      <rect x="290" y={y} width="90" height={h} fill="#94a3b8" rx="4" />
                      <text x="335" y={y - 6} fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {results.baselineRuntimeHours.toFixed(1)} hrs
                      </text>
                      <text x="335" y="172" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        Fixed Baseline
                      </text>
                    </g>
                  );
                })()}

                {/* Desired Mission Reference Line */}
                {(() => {
                  const y = 155 - (config.desiredMissionHours / 30) * 135;
                  return (
                    <g>
                      <line x1="50" y1={y} x2="480" y2={y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="475" y={y - 4} fill="#d97706" fontSize="8" fontFamily="monospace" textAnchor="end">
                        Desired Mission: {config.desiredMissionHours}h
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
              </>
            )}
          </svg>
        </div>
      </section>
    </div>
  );
}
