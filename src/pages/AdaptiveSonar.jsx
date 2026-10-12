import React, { useState, useMemo } from 'react';
import { useSonar } from '../SonarContext';
import { calculateAbsorption } from '../acousticModel';
import { Waves, Zap, Activity, ArrowLeft, ArrowRight } from 'lucide-react';

export default function AdaptiveSonar({ onNavigateToInputs, onNavigateToPower }) {
  const { config, results, hasCalculated, isOutdated } = useSonar();
  const [activeChart, setActiveChart] = useState('attenuation'); // 'attenuation' | 'resolution' | 'margin'

  // Generate Frequency Sweep Points for Charts (from minFreqKhz to maxFreqKhz)
  const chartPoints = useMemo(() => {
    if (!hasCalculated || results.maxF <= results.minF) {
      return [];
    }
    const pts = [];
    const minF = results.minF;
    const maxF = results.maxF;
    const step = Math.max(5, Math.floor((maxF - minF) / 10));

    for (let f = minF; f <= maxF; f += step) {
      // 1. Estimated Attenuation alpha in dB/km
      const alpha_dB_m = calculateAbsorption(
        f, 
        config.tempC, 
        config.salinityPsu, 
        config.depthM, 
        config.turbidityNtu
      );
      const alpha_dB_km = alpha_dB_m * 1000.0;

      // 2. Range Resolution for bandwidth B = min(config.chirpBandwidthKhz, f * 0.25)
      // High frequency enables higher achievable bandwidth:
      const availableBwKhz = Math.min(config.chirpBandwidthKhz, Math.max(10, f * 0.25));
      const resM = results.effectiveSoundSpeed / (2 * (availableBwKhz * 1000));

      // 3. Detection Margin / SNR at this frequency
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

  // Scaled max/min for SVG charts
  const maxAlpha = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.alpha_dB_km), 10) : 10;
  const minAlpha = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.alpha_dB_km), 0) : 0;
  const maxRes = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.resCm), 10) : 10;
  const minRes = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.resCm), 1) : 1;
  const maxSnr = chartPoints.length > 0 ? Math.max(...chartPoints.map(p => p.snr), 35) : 35;
  const minSnr = chartPoints.length > 0 ? Math.min(...chartPoints.map(p => p.snr), -5) : -5;

  return (
    <div className="aquasense-main">
      {/* Top Header Block */}
      <div className="page-header-block">
        <div className="page-header-badge-row">
          <span className="badge-tag-blue">● PAGE 2: ADAPTIVE SONAR ANALYSIS</span>
          <span className="badge-tag-green">SHARED STATE ACTIVE</span>
        </div>
        <h1 className="page-title">Adaptive Sonar Analysis &amp; Waveform Optimization</h1>
        <p className="page-description">
          Evaluates frequency-dependent acoustic propagation loss, range resolution constraints, cognitive frequency recommendations, and required transmission power.
        </p>
      </div>

      {/* Top Navigation Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
        <button 
          className="filter-pill"
          onClick={onNavigateToInputs}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 11 }}
        >
          <ArrowLeft size={14} />
          Back to Page 1: Input &amp; Configuration
        </button>

        <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--slate-muted)' }}>
          State Synced: Target {config.targetDistanceM}m • Turbidity {config.turbidityNtu} NTU
        </span>

        <button 
          className="btn-primary-teal"
          onClick={onNavigateToPower}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 11 }}
        >
          <span>Continue to Page 3: Power Analysis</span>
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
          <span><strong>Initial Zero State:</strong> Simulation has not been calculated yet. Output cards and plots initially show zero values. Return to Page 1 and click <strong>'Calculate Sonar Performance'</strong> to evaluate live data.</span>
        </div>
      )}

      {/* 1. ENVIRONMENT SUMMARY CARD */}
      <section className="aqua-card" style={{ marginBottom: 14 }}>
        <div className="aqua-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Waves size={16} color="var(--primary-teal)" />
            <h2 className="aqua-card-title">1. Environment &amp; Configuration Summary (From Page 1)</h2>
          </div>
          <span className="badge-tag-blue">INPUT REPOSITORY</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 11 }}>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>WATER DEPTH</span>
            <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>{config.depthM} m</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>TEMPERATURE</span>
            <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>{config.tempC} °C</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>SALINITY</span>
            <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>{config.salinityPsu} PSU</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>TURBIDITY</span>
            <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>{config.turbidityNtu} NTU</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>TARGET DISTANCE</span>
            <strong style={{ fontSize: 13, color: 'var(--accent-cyan)' }}>{config.targetDistanceM} m</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>FREQ RANGE</span>
            <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>{config.minFreqKhz}–{config.maxFreqKhz} kHz</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 9.5, color: 'var(--slate-muted)', display: 'block' }}>DESIRED RESOLUTION</span>
            <strong style={{ fontSize: 13, color: 'var(--mint-green-dark)' }}>{(config.desiredRangeResM * 100).toFixed(1)} cm</strong>
          </div>
        </div>
      </section>

      {/* 2. ADAPTIVE FREQUENCY & RESOLUTION ANALYSIS CARDS */}
      <div className="desktop-two-col-grid" style={{ marginBottom: 14 }}>
        {/* Left: Adaptive Frequency Decision Analysis */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">2. Adaptive Frequency Analysis</h2>
            </div>
            <span className="badge-tag-green">RECOMMENDED: {hasCalculated ? results.recommendedFreqKhz : 0} kHz</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 'bold', color: 'var(--primary-teal)' }}>RECOMMENDED CARRIER</span>
                <strong style={{ fontSize: 16, color: 'var(--primary-teal)' }}>{hasCalculated ? results.recommendedFreqKhz : 0} kHz</strong>
              </div>
              <p style={{ fontSize: 10, color: 'var(--slate-text)', marginTop: 4, lineHeight: 1.45 }}>
                <strong>Reason:</strong> At {config.targetDistanceM}m target distance and {config.turbidityNtu} NTU turbidity, {results.recommendedFreqKhz} kHz achieves the optimum compromise between molecular absorption loss ({results.effectiveAlpha_dB_km.toFixed(1)} dB/km) and acoustic image resolution.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <strong style={{ fontSize: 10.5, color: 'var(--navy-dark)' }}>Resolution vs. Attenuation Trade-off:</strong>
              <p style={{ fontSize: 9.5, color: 'var(--slate-muted)', marginTop: 3, lineHeight: 1.4 }}>
                Higher frequencies (&gt;350 kHz) allow higher bandwidth and finer imaging, but experience severe attenuation (viscous &amp; MgSO₄ relaxation) and particulate backscattering. Lower frequencies (100–200 kHz) penetrate murky water and long ranges with minimal attenuation but yield broader range resolution.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10.5 }}>
              <div className="mode-spec-box">
                <span className="mode-spec-label">Round-Trip Attenuation</span>
                <span className="mode-spec-val">{hasCalculated ? results.twoWayTL.toFixed(1) : '0.0'} dB</span>
                <span className="mode-sub">Geometric Spreading + Absorption</span>
              </div>
              <div className="mode-spec-box">
                <span className="mode-spec-label">Absorption Rate (α)</span>
                <span className="mode-spec-val">{hasCalculated ? results.effectiveAlpha_dB_km.toFixed(2) : '0.00'} dB/km</span>
                <span className="mode-sub">Francois-Garrison Model</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Range Resolution & Transmit Power Analysis */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">3. Range Resolution &amp; Transmit Power</h2>
            </div>
            <span className={`badge-tag-${hasCalculated ? (results.satisfiesResolution ? 'green' : 'blue') : 'blue'}`}>
              {hasCalculated ? (results.satisfiesResolution ? 'RESOLUTION SATISFIED' : 'BANDWIDTH LIMITED') : 'NOT CALCULATED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Range Resolution Calculation */}
            <div style={{ background: results.satisfiesResolution ? '#f0fdf4' : '#fffbeb', border: `1px solid ${results.satisfiesResolution ? '#bbf7d0' : '#fde68a'}`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 'bold', color: results.satisfiesResolution ? '#166534' : '#92400e' }}>
                  ΔR = c / (2 · Bandwidth)
                </span>
                <strong style={{ fontSize: 15, color: hasCalculated ? (results.satisfiesResolution ? '#15803d' : '#b45309') : 'var(--slate-muted)' }}>
                  {hasCalculated ? (results.achievableRangeResolutionM * 100).toFixed(1) : '0.0'} cm
                </strong>
              </div>
              <div style={{ fontSize: 9.5, color: results.satisfiesResolution ? '#14532d' : '#78350f', marginTop: 4 }}>
                Required Bandwidth: <strong>{hasCalculated ? results.requiredBandwidthKhz.toFixed(1) : '0.0'} kHz</strong> • Configured Bandwidth: <strong>{hasCalculated ? results.effectiveBandwidthKhz : 0} kHz</strong>
              </div>
              {!results.satisfiesResolution && (
                <div style={{ fontSize: 9, color: '#b45309', marginTop: 4 }}>
                  ⚠️ Notice: Current bandwidth ({results.effectiveBandwidthKhz} kHz) cannot achieve desired {(config.desiredRangeResM * 100).toFixed(1)} cm resolution. Achievable is {(results.achievableRangeResolutionM * 100).toFixed(1)} cm.
                </div>
              )}
            </div>

            {/* Transmission Power Analysis */}
            <div style={{ background: results.isPowerWithinLimit ? '#f8fafc' : '#fef2f2', border: `1px solid ${results.isPowerWithinLimit ? '#e2e8f0' : '#fecaca'}`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 'bold', color: 'var(--navy-dark)' }}>Estimated Transmit Power</span>
                <strong style={{ fontSize: 15, color: hasCalculated ? (results.isPowerWithinLimit ? 'var(--primary-teal)' : '#dc2626') : 'var(--slate-muted)' }}>
                  {hasCalculated ? results.requiredTransmitterPowerW.toFixed(1) : '0.0'} W
                </strong>
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--slate-muted)', marginTop: 4 }}>
                Configured Power Limit: <strong>{config.transmitPowerLimitW} W</strong> • Active Power: <strong>{hasCalculated ? results.activeTransmitPowerW : 0} W</strong>
              </div>
              {!results.isPowerWithinLimit && (
                <div style={{ fontSize: 9, color: '#dc2626', marginTop: 4 }}>
                  ⚠️ Warning: Estimated required power ({results.requiredTransmitterPowerW.toFixed(1)}W) exceeds the configured {config.transmitPowerLimitW}W limit. Signal will operate at clamped power.
                </div>
              )}
            </div>

            {/* Sonar Equation Parameters Readout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10.5 }}>
              <div className="mode-spec-box">
                <span className="mode-spec-label">Target Strength (TS)</span>
                <span className="mode-spec-val">{config.targetStrengthDb} dB</span>
                <span className="mode-sub">Model Assumption</span>
              </div>
              <div className="mode-spec-box">
                <span className="mode-spec-label">Matched Filter Gain</span>
                <span className="mode-spec-val">+{hasCalculated ? results.processingGain.toFixed(1) : '0.0'} dB</span>
                <span className="mode-sub">10·log₁₀(B·τ)</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      
      {/* 4. CANDIDATE FREQUENCY EVALUATION TABLE */}
      <section className="aqua-card" style={{ marginBottom: 14 }}>
        <div className="aqua-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--primary-teal)" />
            <h2 className="aqua-card-title">4. Candidate Frequency Evaluation Table</h2>
          </div>
          <span className="badge-tag-blue">SPAN: {results.minF} to {results.maxF} kHz</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border-color)', color: 'var(--navy-dark)' }}>
                <th style={{ padding: '8px 10px' }}>Candidate Freq</th>
                <th style={{ padding: '8px 10px' }}>Attenuation (α)</th>
                <th style={{ padding: '8px 10px' }}>Round-Trip Loss (2TL)</th>
                <th style={{ padding: '8px 10px' }}>Achievable Res.</th>
                <th style={{ padding: '8px 10px' }}>Meets Res.?</th>
                <th style={{ padding: '8px 10px' }}>Req. Power</th>
                <th style={{ padding: '8px 10px' }}>Within Limit?</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(!hasCalculated || !results.candidateFrequencies || results.candidateFrequencies.length === 0) ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '18px', color: '#64748b', fontSize: 11 }}>
                    No candidate frequencies evaluated yet. Run calculation on Page 1 to populate candidate spectrum analysis.
                  </td>
                </tr>
              ) : (
                results.candidateFrequencies.map((cand) => {
                const isSelected = Math.abs(cand.freqKhz - results.recommendedFreqKhz) < ((results.maxF - results.minF) / 8);
                return (
                  <tr 
                    key={cand.freqKhz}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      fontWeight: isSelected ? '600' : 'normal'
                    }}
                  >
                    <td style={{ padding: '8px 10px', color: isSelected ? '#15803d' : 'var(--navy-dark)' }}>
                      {cand.freqKhz} kHz {isSelected ? '★ (Rec)' : ''}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{cand.alpha_dB_km.toFixed(1)} dB/km</td>
                    <td style={{ padding: '8px 10px' }}>{cand.twoWayTL_dB.toFixed(1)} dB</td>
                    <td style={{ padding: '8px 10px' }}>{cand.achievableResCm.toFixed(1)} cm</td>
                    <td style={{ padding: '8px 10px', color: cand.meetsResolution ? '#166534' : '#b45309' }}>
                      {cand.meetsResolution ? '✓ Yes' : '✕ No'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{cand.requiredPowerW.toFixed(1)} W</td>
                    <td style={{ padding: '8px 10px', color: cand.meetsPowerLimit ? '#166534' : '#dc2626' }}>
                      {cand.meetsPowerLimit ? '✓ Within Limit' : '⚠️ Exceeds Limit'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className="badge-tag-blue">
                        {isSelected ? 'RECOMMENDED' : (cand.meetsResolution && cand.meetsPowerLimit ? 'FEASIBLE' : 'CONSTRAINED')}
                      </span>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. INTERACTIVE DATA-DRIVEN CHARTS */}
      <section className="aqua-card">
        <div className="aqua-card-header">
          <div>
            <h2 className="aqua-card-title">5. Interactive Sonar Analysis Charts</h2>
            <p className="aqua-card-subtitle">
              Dynamic plots calculated across candidate frequencies ({results.minF} to {results.maxF} kHz).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`filter-pill ${activeChart === 'attenuation' ? 'active' : ''}`}
              onClick={() => setActiveChart('attenuation')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              📉 Frequency vs Attenuation
            </button>
            <button
              className={`filter-pill ${activeChart === 'resolution' ? 'active' : ''}`}
              onClick={() => setActiveChart('resolution')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              📏 Frequency vs Resolution
            </button>
            <button
              className={`filter-pill ${activeChart === 'margin' ? 'active' : ''}`}
              onClick={() => setActiveChart('margin')}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              🎯 Frequency vs Detection SNR
            </button>
          </div>
        </div>

        {/* Dynamic SVG Chart */}
        <div style={{ width: '100%', height: 220, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px' }}>
          <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
            {/* Grid Lines */}
            <line x1="50" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="50" y1="65" x2="480" y2="65" stroke="#f1f5f9" />
            <line x1="50" y1="110" x2="480" y2="110" stroke="#f1f5f9" />
            <line x1="50" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1.2" />

            {(!hasCalculated || chartPoints.length === 0) ? (
              <g>
                <text x="265" y="85" fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  EMPTY GRAPH — ZERO STATE
                </text>
                <text x="265" y="110" fill="#94a3b8" fontSize="10" textAnchor="middle">
                  Configure parameters and click 'Calculate Sonar Performance' on Page 1 to generate acoustic plots
                </text>
              </g>
            ) : (
              <>
            {/* CHART A: Frequency vs Attenuation (dB/km) */}
            {activeChart === 'attenuation' && (
              <g>
                {/* Y Axis Labels */}
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxAlpha.toFixed(1)}</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxAlpha + minAlpha) / 2).toFixed(1)}</text>
                <text x="42" y="162" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minAlpha.toFixed(1)} dB/km</text>

                {/* Polyline */}
                <polyline
                  fill="none"
                  stroke="#085464"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 160 - ((pt.alpha_dB_km - minAlpha) / Math.max(1, maxAlpha - minAlpha)) * 140;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Highlight Recommended Frequency */}
                {(() => {
                  const recX = 50 + ((results.recommendedFreqKhz - results.minF) / (results.maxF - results.minF)) * 430;
                  const recY = 160 - ((results.effectiveAlpha_dB_km - minAlpha) / Math.max(1, maxAlpha - minAlpha)) * 140;
                  return (
                    <g>
                      <line x1={recX} y1="20" x2={recX} y2="160" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={recX} cy={recY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                      <text x={recX} y="15" fill="#d97706" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                        Rec: {results.recommendedFreqKhz} kHz
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CHART B: Frequency vs Range Resolution (cm) */}
            {activeChart === 'resolution' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxRes.toFixed(1)} cm</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxRes + minRes) / 2).toFixed(1)}</text>
                <text x="42" y="162" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minRes.toFixed(1)} cm</text>

                <polyline
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 160 - ((pt.resCm - minRes) / Math.max(1, maxRes - minRes)) * 140;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Desired Resolution Reference Line */}
                {(() => {
                  const targetCm = config.desiredRangeResM * 100;
                  const targetY = 160 - ((targetCm - minRes) / Math.max(1, maxRes - minRes)) * 140;
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

            {/* CHART C: Frequency vs Detection SNR (dB) */}
            {activeChart === 'margin' && (
              <g>
                <text x="42" y="24" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{maxSnr.toFixed(1)} dB</text>
                <text x="42" y="90" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{((maxSnr + minSnr) / 2).toFixed(1)}</text>
                <text x="42" y="162" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">{minSnr.toFixed(1)} dB</text>

                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  points={chartPoints.map(pt => {
                    const x = 50 + ((pt.freq - results.minF) / (results.maxF - results.minF)) * 430;
                    const y = 160 - ((pt.snr - minSnr) / Math.max(1, maxSnr - minSnr)) * 140;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* 20 dB Target SNR Threshold */}
                {(() => {
                  const snr20Y = 160 - ((20 - minSnr) / Math.max(1, maxSnr - minSnr)) * 140;
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
                <text key={pt.freq} x={x} y="176" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  {pt.freq}k
                </text>
              );
            })}
              </>
            )}
          </svg>
        </div>
      </section>
    </div>
  );
}
