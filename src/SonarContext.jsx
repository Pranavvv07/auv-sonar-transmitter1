import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  calculateSoundSpeed, 
  calculateAbsorption, 
  evaluateCandidateFrequencies 
} from './acousticModel';
import { supabase } from './supabaseClient';

export const SonarContext = createContext();

export const DEFAULT_CONFIG = {
  // 1. Environmental Inputs
  depthM: 60,              // Water depth in meters (0 to 1000)
  turbidityNtu: 15,        // Turbidity in NTU (0 to 100)
  tempC: 14,               // Temperature in °C (0 to 35)
  salinityPsu: 35,         // Salinity in PSU (0 to 45)
  soundSpeedManual: null,  // Editable m/s (null = auto from Mackenzie formula)
  attenuationManual: null, // Editable dB/km (null = auto from Francois-Garrison)

  // 2. Sonar Configuration
  minFreqKhz: 100,         // Min freq in kHz (default 100)
  maxFreqKhz: 500,         // Max freq in kHz (default 500)
  targetDistanceM: 120,    // Target distance in meters (10 to 500)
  desiredRangeResM: 0.05,  // Desired range resolution in meters (e.g. 0.05m = 5cm)
  chirpBandwidthKhz: 50,   // Chirp bandwidth in kHz (constrained by maxFreq - minFreq)
  pulseDurationMs: 15,     // Pulse duration in ms (1 to 50)
  transmissionMode: 'Pulsed', // 'Pulsed' | 'Continuous'
  transmitPowerLimitW: 80, // Power limit in Watts (10 to 100)
  targetStrengthDb: -10,   // TS in dB (Standard composite hull / rock return)
  receiverSensitivityDb: -160, // Hydrophone sensitivity (dB re 1V/uPa)

  // 3. Battery and Power Inputs
  batteryVoltageV: 48,     // Battery voltage (V, default 48V)
  batteryCapacityAh: 10,   // Battery capacity (Ah, default 10Ah)
  usableCapacityPct: 90,   // Usable capacity % (90% DoD for Li-ion safety)
  desiredMissionHours: 8,  // Desired mission duration in hours (default 8h)
  amplifierEfficiencyPct: 82, // Class D amplifier efficiency % (default 82%)
  electronicsPowerW: 8.5,  // Electronics and sensors power consumption (Watts)
  dutyCyclePct: 20         // Transmission duty cycle % for pulsed operation (default 20%)
};

export function SonarProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('auv_sonar_config_v1');
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read sessionStorage', e);
    }
    return DEFAULT_CONFIG;
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationTimestamp, setCalculationTimestamp] = useState(0);

  // Save to sessionStorage when config changes
  useEffect(() => {
    try {
      sessionStorage.setItem('auv_sonar_config_v1', JSON.stringify(config));
    } catch (e) {
      console.warn('Could not write to sessionStorage', e);
    }
  }, [config]);

  // Update specific input field
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateMultipleConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setCalculationTimestamp(Date.now());
  };

  const triggerCalculate = async () => {
    setIsCalculating(true);
    setTimeout(async () => {
      const now = Date.now();
      setCalculationTimestamp(now);
      setIsCalculating(false);

      // Persist simulation record to Supabase database (non-blocking)
      try {
        await supabase.from('sonar_simulations').insert([
          {
            target_distance_m: config.targetDistanceM,
            water_depth_m: config.depthM,
            turbidity_ntu: config.turbidityNtu,
            water_temp_c: config.tempC,
            salinity_psu: config.salinityPsu,
            min_freq_khz: config.minFreqKhz,
            max_freq_khz: config.maxFreqKhz,
            battery_voltage_v: config.batteryVoltageV,
            battery_capacity_ah: config.batteryCapacityAh,
            duty_cycle_pct: config.dutyCyclePct,
            created_at: new Date().toISOString()
          }
        ]);
      } catch (err) {
        // Silently catch if table not yet migrated, preserving 100% UI stability
        console.info('Supabase simulation log notice:', err);
      }
    }, 350);
  };

  // Perform All Real Scientific Calculations Driven by config
  const results = useMemo(() => {
    // 1. Environmental sound speed
    const calculatedSoundSpeed = calculateSoundSpeed(config.tempC, config.salinityPsu, config.depthM);
    const effectiveSoundSpeed = (config.soundSpeedManual !== null && !isNaN(config.soundSpeedManual) && config.soundSpeedManual > 1000) 
      ? Number(config.soundSpeedManual) 
      : calculatedSoundSpeed;

    // 2. Frequency Range and Bandwidth constraints
    const minF = Math.max(10, Math.min(config.minFreqKhz, config.maxFreqKhz - 10));
    const maxF = Math.max(minF + 10, config.maxFreqKhz);
    const maxAvailableBandwidth = maxF - minF;
    const effectiveBandwidthKhz = Math.min(config.chirpBandwidthKhz, maxAvailableBandwidth);

    // 3. Recommended / Optimal Operating Frequency
    // Model rule from PDF: In murky water (turbidity) or long range, downshift towards minFreqKhz (100 kHz).
    // In clear near-field, scale up towards maxFreqKhz (500 kHz).
    const rangeFactor = Math.min(1, Math.max(0, (config.targetDistanceM - 10) / 490));
    const turbFactor = Math.min(1, Math.max(0, config.turbidityNtu / 100));
    const penalty = 0.60 * rangeFactor + 0.40 * turbFactor;
    const recommendedFreqKhz = Math.round(maxF - penalty * (maxF - minF));

    // 4. Acoustic Attenuation alpha (dB/km and dB/m)
    const calculatedAlpha_dB_m = calculateAbsorption(
      recommendedFreqKhz, 
      config.tempC, 
      config.salinityPsu, 
      config.depthM, 
      config.turbidityNtu
    );
    const calculatedAlpha_dB_km = calculatedAlpha_dB_m * 1000.0;
    const effectiveAlpha_dB_km = (config.attenuationManual !== null && !isNaN(config.attenuationManual) && config.attenuationManual > 0)
      ? Number(config.attenuationManual)
      : calculatedAlpha_dB_km;
    const effectiveAlpha_dB_m = effectiveAlpha_dB_km / 1000.0;

    // 5. Range Resolution: Delta_R = c / (2 * Bandwidth_Hz)
    const bandwidthHz = effectiveBandwidthKhz * 1000;
    const requiredBandwidthForDesiredResHz = effectiveSoundSpeed / (2 * Math.max(0.001, config.desiredRangeResM));
    const requiredBandwidthKhz = requiredBandwidthForDesiredResHz / 1000;
    const achievableRangeResolutionM = effectiveSoundSpeed / (2 * Math.max(1000, bandwidthHz));
    const satisfiesResolution = achievableRangeResolutionM <= config.desiredRangeResM * 1.05; // 5% tolerance

    // 6. Transmission Loss: 20*log10(R) + alpha * R
    const r = Math.max(1, config.targetDistanceM);
    const oneWayTL = 20 * Math.log10(r) + (effectiveAlpha_dB_m * r);
    const twoWayTL = 2 * oneWayTL;

    // 7. Transmit Power Estimation & Sonar Equation
    const ampEfficiency = Math.max(0.5, config.amplifierEfficiencyPct / 100);
    // Find required acoustic power to achieve SNR lock (> 20 dB above ambient noise)
    const targetSNR = 20.0;
    const ambientNoiseNL = 45.0; // standard sea noise
    // EL = SL - 2TL + TS
    // SNR = EL - NL + PG, PG = 10*log10(B * tau)
    const tauSec = Math.max(0.001, config.pulseDurationMs / 1000);
    const processingGain = 10 * Math.log10(Math.max(1, bandwidthHz * tauSec));
    // Required SL = targetSNR + NL - PG + 2TL - TS
    const requiredSL = targetSNR + ambientNoiseNL - processingGain + twoWayTL - config.targetStrengthDb;
    // SL = 170.8 + 10*log10(P_ac) + 15 (DI=15)
    // 10*log10(P_ac) = requiredSL - 185.8
    const requiredPAcoustic = Math.pow(10, (requiredSL - 185.8) / 10);
    const requiredTransmitterPowerW = Math.max(5, Math.min(200, requiredPAcoustic / 0.5)); // 50% transducer efficiency
    const isPowerWithinLimit = requiredTransmitterPowerW <= config.transmitPowerLimitW;

    // Operating transmit power clamped to limit
    const activeTransmitPowerW = Math.min(config.transmitPowerLimitW, Math.max(10, requiredTransmitterPowerW));

    // 8. Battery Energy Calculation
    const nominalBatteryEnergyWh = config.batteryVoltageV * config.batteryCapacityAh;
    const usableBatteryEnergyWh = nominalBatteryEnergyWh * (config.usableCapacityPct / 100);

    // 9. Power Consumption Model
    const effectiveDutyCycle = config.transmissionMode === 'Continuous' ? 1.0 : (config.dutyCyclePct / 100);
    const txElectricalPowerDuringPulseW = activeTransmitPowerW / ampEfficiency;
    const averageTransmitPowerW = txElectricalPowerDuringPulseW * effectiveDutyCycle;
    const amplifierLossesW = (txElectricalPowerDuringPulseW - activeTransmitPowerW) * effectiveDutyCycle;
    const electronicsPowerW = config.electronicsPowerW;
    const totalAverageSystemPowerW = averageTransmitPowerW + electronicsPowerW;

    // Battery Runtime & Mission Energy
    const estimatedRuntimeHours = usableBatteryEnergyWh / Math.max(0.5, totalAverageSystemPowerW);
    const energyConsumedPerHourWh = totalAverageSystemPowerW;
    const estimatedMissionEnergyWh = totalAverageSystemPowerW * config.desiredMissionHours;
    const remainingBatteryEnergyWh = Math.max(0, usableBatteryEnergyWh - estimatedMissionEnergyWh);
    const meetsMissionDuration = estimatedRuntimeHours >= config.desiredMissionHours;

    // 10. Fixed Baseline Comparison (Continuous full power or 80W fixed baseline)
    const baselineTxPowerW = 80;
    const baselineTxElectricalW = baselineTxPowerW / ampEfficiency;
    const baselineAvgPowerW = (baselineTxElectricalW * (config.transmissionMode === 'Continuous' ? 1.0 : 0.25)) + electronicsPowerW;
    const baselineRuntimeHours = usableBatteryEnergyWh / Math.max(0.5, baselineAvgPowerW);
    const baselineMissionEnergyWh = baselineAvgPowerW * config.desiredMissionHours;
    const powerSavingPct = ((baselineAvgPowerW - totalAverageSystemPowerW) / baselineAvgPowerW) * 100;
    const energySavingPct = ((baselineMissionEnergyWh - estimatedMissionEnergyWh) / baselineMissionEnergyWh) * 100;

    // 11. Feasibility Assessment
    let feasibilityStatus = 'Feasible under current model assumptions';
    let feasibilityExplanation = 'The configured battery capacity and acoustic settings satisfy both mission duration and range resolution goals.';

    if (!isPowerWithinLimit && !meetsMissionDuration) {
      feasibilityStatus = 'Not feasible under current constraints';
      feasibilityExplanation = `Required power (${requiredTransmitterPowerW.toFixed(1)}W) exceeds the configured limit (${config.transmitPowerLimitW}W) and battery runtime (${estimatedRuntimeHours.toFixed(1)}h) is less than the desired ${config.desiredMissionHours}h mission.`;
    } else if (!isPowerWithinLimit) {
      feasibilityStatus = 'Feasible with recommended adjustments';
      feasibilityExplanation = `Estimated required transmit power (${requiredTransmitterPowerW.toFixed(1)}W) exceeds hardware limit (${config.transmitPowerLimitW}W). Recommend shortening range or increasing power limit.`;
    } else if (!meetsMissionDuration) {
      feasibilityStatus = 'Feasible with recommended adjustments';
      feasibilityExplanation = `Estimated runtime (${estimatedRuntimeHours.toFixed(1)} hrs) is less than the requested ${config.desiredMissionHours} hrs mission. Recommend reducing duty cycle or upgrading battery capacity.`;
    } else if (!satisfiesResolution) {
      feasibilityStatus = 'Feasible with recommended adjustments';
      feasibilityExplanation = `Achievable resolution (${achievableRangeResolutionM.toFixed(3)}m) does not meet desired resolution (${config.desiredRangeResM}m) due to bandwidth limit (${effectiveBandwidthKhz} kHz).`;
    }

    const candidateFrequencies = evaluateCandidateFrequencies(config, effectiveSoundSpeed);

    return {
      candidateFrequencies,
      effectiveSoundSpeed,
      calculatedSoundSpeed,
      minF,
      maxF,
      maxAvailableBandwidth,
      effectiveBandwidthKhz,
      recommendedFreqKhz,
      effectiveAlpha_dB_km,
      effectiveAlpha_dB_m,
      calculatedAlpha_dB_km,
      requiredBandwidthKhz,
      achievableRangeResolutionM,
      satisfiesResolution,
      oneWayTL,
      twoWayTL,
      processingGain,
      requiredSL,
      requiredTransmitterPowerW,
      isPowerWithinLimit,
      activeTransmitPowerW,
      nominalBatteryEnergyWh,
      usableBatteryEnergyWh,
      effectiveDutyCycle,
      txElectricalPowerDuringPulseW,
      averageTransmitPowerW,
      amplifierLossesW,
      electronicsPowerW,
      totalAverageSystemPowerW,
      estimatedRuntimeHours,
      energyConsumedPerHourWh,
      estimatedMissionEnergyWh,
      remainingBatteryEnergyWh,
      meetsMissionDuration,
      baselineAvgPowerW,
      baselineRuntimeHours,
      baselineMissionEnergyWh,
      powerSavingPct,
      energySavingPct,
      feasibilityStatus,
      feasibilityExplanation,
      calculationTimestamp
    };
  }, [config, calculationTimestamp]);

  return (
    <SonarContext.Provider value={{
      config,
      updateConfig,
      updateMultipleConfig,
      resetToDefaults,
      triggerCalculate,
      isCalculating,
      results
    }}>
      {children}
    </SonarContext.Provider>
  );
}

export function useSonar() {
  const context = useContext(SonarContext);
  if (!context) {
    throw new Error('useSonar must be used within a SonarProvider');
  }
  return context;
}
