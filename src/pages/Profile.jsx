import React, { useState } from 'react';
import { Battery, Cpu, LogOut, Download, Zap } from 'lucide-react';
import { calculateMissionDuration } from '../acousticModel';

export default function Profile({ onLogout }) {
  const [missionPwrW] = useState(24);
  const [batteryLevelPct] = useState(88);

  const mission = calculateMissionDuration({
    transmitPowerW: missionPwrW,
    amplifierEfficiency: 0.82,
    batteryCapacityWh: 480
  });

  const remainingWh = (480 * (batteryLevelPct / 100)).toFixed(0);
  const remainingHours = (remainingWh * 0.90 / Math.max(1, mission.avgSystemPowerW)).toFixed(1);

  const handleExportMissionReport = () => {
    const csv = "data:text/csv;charset=utf-8,"
      + "Metric,Value,Unit\n"
      + `Total Battery Pack Capacity,480,Wh\n`
      + `Battery State of Charge,${batteryLevelPct},%\n`
      + `Remaining Usable Energy,${remainingWh},Wh\n`
      + `Average System Draw,${mission.avgSystemPowerW.toFixed(1)},W\n`
      + `Class D Amplifier Efficiency,>82,%\n`
      + `Estimated Remaining Mission,${remainingHours},hrs\n`
      + `Power Rails,3.3V / 5.0V / 12.0V / 48.0V,\n`
      + `Core MCU,STM32H7 @ 168 MHz,\n`
      + `Co-Processor,Xilinx Artix-7 FPGA,\n`;

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `AUV_Mission_Battery_Status_${0}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="aquasense-main">
      <div className="page-header-block">
        <div className="page-header-badge-row">
          <span className="badge-tag-blue">● AUV MISSION STATION</span>
          <span className="badge-tag-green">CLEARANCE: LEVEL 4 (OPERATOR)</span>
        </div>
        <h1 className="page-title">AUV Mission Station &amp; Battery Telemetry</h1>
        <p className="page-description">
          Autonomous Underwater Vehicle payload power diagnostics, Li-ion 48V battery fuel gauge, and active mission endurance estimation.
        </p>
      </div>

      {/* Hero Battery Fuel Gauge Card */}
      <section className="duration-hero-card" style={{ marginBottom: 14 }}>
        <div className="duration-hero-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="duration-icon-box" style={{ background: 'var(--primary-teal)', color: '#ffffff' }}>
              <Battery size={24} />
            </div>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--slate-muted)' }}>
                LI-ION 48V / 10Ah PACK (480 Wh)
              </div>
              <div className="duration-val-block">
                <span className="duration-number">{remainingHours}</span>
                <span className="duration-unit">hrs remaining</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="duration-gain-badge">SOC: {batteryLevelPct}%</span>
            <div style={{ fontSize: 9.5, color: 'var(--slate-muted)', marginTop: 4 }}>
              Usable: {remainingWh} Wh
            </div>
          </div>
        </div>

        {/* Dual Battery Progress Bar */}
        <div className="duration-dual-bar" style={{ marginTop: 10 }}>
          <div className="duration-bar-baseline" style={{ width: `${batteryLevelPct}%`, background: 'var(--primary-teal)' }}></div>
        </div>

        <div className="duration-legend-row" style={{ marginTop: 6 }}>
          <span>Pack Voltage: 48.0 VDC (Nominal)</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Avg System Power: {mission.avgSystemPowerW.toFixed(1)} W
          </span>
        </div>
      </section>

      <div className="desktop-two-col-grid">
        {/* Battery & Power Rails */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">Power Source &amp; Buck Rails</h2>
            </div>
            <span className="badge-tag-green">&gt;82% CLASS D</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: 'var(--slate-text)' }}>
            <div className="formula-stat-tile">
              <div>
                <strong>Li-ion Battery Pack:</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>48V × 10Ah Architecture</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>480 Wh (1,728 kJ)</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>High-Power Rail (48V):</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>Class D Transducer Driver</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>50–100W Output</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Analog Subsystem Rail (12V):</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>Preamp &amp; Piezo Matching</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>12.0 VDC Regulated</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Digital Core Rail (3.3V):</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>STM32H7 + Xilinx Artix-7</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>3.3 VDC Low-Noise</span>
            </div>

            <button 
              className="btn-primary-teal"
              onClick={handleExportMissionReport}
              style={{ padding: '8px 12px', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Download size={14} />
              Export Mission Telemetry Report (.CSV)
            </button>
          </div>
        </section>

        {/* Embedded Payload Specs */}
        <section className="aqua-card">
          <div className="aqua-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} color="var(--primary-teal)" />
              <h2 className="aqua-card-title">Embedded Processing Core</h2>
            </div>
            <span className="badge-tag-blue">STM32 + FPGA</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: 'var(--slate-text)' }}>
            <div className="formula-stat-tile">
              <div>
                <strong>Main Processing Unit:</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>STM32H7 Series @ 168 MHz</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>2 MB Flash, RTOS</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Signal Processing Co-Processor:</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>Xilinx Artix-7 FPGA</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>Parallel Matched Filter</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Sampling Converters:</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>Echo ADC &amp; Chirp DAC</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>16-bit, &gt;2 MHz</span>
            </div>

            <div className="formula-stat-tile">
              <div>
                <strong>Acoustic Transducer:</strong>
                <div style={{ fontSize: 10, color: 'var(--slate-muted)' }}>Piezoelectric Array</div>
              </div>
              <span style={{ fontFamily: 'monospace' }}>100–500 kHz Bandwidth</span>
            </div>

            <div style={{ marginTop: 6 }}>
              <button 
                type="button" 
                onClick={onLogout}
                className="filter-pill"
                style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5', width: '100%', padding: '9px', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <LogOut size={14} />
                Log Out of Mission Station
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
