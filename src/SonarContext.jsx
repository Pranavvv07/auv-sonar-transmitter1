import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  calculateSoundSpeed, 
  calculateAbsorption, 
  evaluateCandidateFrequencies 
} from './acousticModel';
import { supabase } from './supabaseClient';

export const SonarContext = createContext();

// All numerical input fields initially display 0
export const ZERO_CONFIG = {
  // 1. Environmental Inputs
  depthM: 0,
  turbidityNtu: 0,
  tempC: 0,
  salinityPsu: 0,
  soundSpeedManual: null,
  attenuationManual: null,

  // 2. Sonar Configuration
  minFreqKhz: 0,
  maxFreqKhz: 0,
  targetDistanceM: 0,
  desiredRangeResM: 0,
  chirpBandwidthKhz: 0,
  pulseDurationMs: 0,
  transmissionMode: 'Pulsed',
  transmitPowerLimitW: 0,
  targetStrengthDb: 0,
  receiverSensitivityDb: 0,

  // 3. Battery and Power Inputs
  batteryVoltageV: 0,
  batteryCapacityAh: 0,
  usableCapacityPct: 0,
  desiredMissionHours: 0,
  amplifierEfficiencyPct: 0,
  electronicsPowerW: 0,
  dutyCyclePct: 0
};

// Initial zero-state results before calculation
export const ZERO_RESULTS = {
  hasCalculated: false,
  isOutdated: false,
  effectiveSoundSpeed: 0,
  calculatedSoundSpeed: 0,
  minF: 0,
  maxF: 0,
  maxAvailableBandwidth: 0,
  effectiveBandwidthKhz: 0,
  recommendedFreqKhz: 0,
  effectiveAlpha_dB_km: 0,
  effectiveAlpha_dB_m: 0,
  calculatedAlpha_dB_km: 0,
  requiredBandwidthKhz: 0,
  achievableRangeResolutionM: 0,
  satisfiesResolution: false,
  oneWayTL: 0,
  twoWayTL: 0,
  processingGain: 0,
  requiredSL: 0,
  requiredTransmitterPowerW: 0,
  isPowerWithinLimit: false,
  activeTransmitPowerW: 0,
  nominalBatteryEnergyWh: 0,
  usableBatteryEnergyWh: 0,
  effectiveDutyCycle: 0,
  txElectricalPowerDuringPulseW: 0,
  averageTransmitPowerW: 0,
  amplifierLossesW: 0,
  electronicsPowerW: 0,
  totalAverageSystemPowerW: 0,
  estimatedRuntimeHours: 0,
  energyConsumedPerHourWh: 0,
  estimatedMissionEnergyWh: 0,
  remainingBatteryEnergyWh: 0,
  meetsMissionDuration: false,
  baselineAvgPowerW: 0,
  baselineRuntimeHours: 0,
  baselineMissionEnergyWh: 0,
  powerSavingPct: 0,
  energySavingPct: 0,
  candidateFrequencies: [],
  feasibilityStatus: 'Not calculated',
  feasibilityExplanation: 'Enter environmental and sonar parameters above and click Calculate to run the simulation.',
  calculationTimestamp: 0
};

export function SonarProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = sessionStorage.getItem('auv_sonar_config_zero_v1');
      if (saved) {
        return { ...ZERO_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read sessionStorage', e);
    }
    return ZERO_CONFIG;
  });

  const [hasCalculated, setHasCalculated] = useState(() => {
    try {
      return sessionStorage.getItem('auv_sonar_has_calculated_v1') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isOutdated, setIsOutdated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationTimestamp, setCalculationTimestamp] = useState(() => hasCalculated ? Date.now() : 0);

  // Save to sessionStorage when config changes
  useEffect(() => {
    try {
      sessionStorage.setItem('auv_sonar_config_zero_v1', JSON.stringify(config));
      sessionStorage.setItem('auv_sonar_has_calculated_v1', hasCalculated ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not write to sessionStorage', e);
    }
  }, [config, hasCalculated]);

  // Update specific input field and mark output as outdated if changed after calculation
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (hasCalculated) {
      setIsOutdated(true);
    }
  };

  const updateMultipleConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
    if (hasCalculated) {
      setIsOutdated(true);
    }
  };

  const resetToDefaults = () => {
    setConfig(ZERO_CONFIG);
    setHasCalculated(false);
    setIsOutdated(false);
    setCalculationTimestamp(0);
    try {
      sessionStorage.removeItem('auv_sonar_config_zero_v1');
      sessionStorage.removeItem('auv_sonar_has_calculated_v1');
    } catch (e) {}
  };

  const triggerCalculate = async () => {
    setIsCalculating(true);
    setTimeout(async () => {
      const now = Date.now();
      setCalculationTimestamp(now);
      setHasCalculated(true);
      setIsOutdated(false);
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
        console.info('Supabase simulation log notice:', err);
      }
    }, 350);
  };

  // Perform All Real Scientific Calculations Driven by current config
  const results = useMemo(() => {
    if (!hasCalculated) {
      return ZERO_RESULTS;
    }

    // 1. Environmental sound speed
    const calculatedSoundSpeed = calculateSoundSpeed(config.tempC, config.salinityPsu, config.depthM);
    const effectiveSoundSpeed = (config.soundSpeedManual !== null && !isNaN(config.soundSpeedManual) && config.soundSpeedManual > 1000) 
      ? Number(config.soundSpeedManual) 
      : calculatedSoundSpeed;

    // 2. Frequency Range and Bandwidth constraints
    const minF = Math.max(1, Math.min(config.minFreqKhz, config.maxFreqKhz > 1 ? config.maxFreqKhz - 1 : 1));
    const maxF = Math.max(minF + 1, config.maxFreqKhz);
    const maxAvailableBandwidth = Math.max(0, maxF - minF);
    const effectiveBandwidthKhz = Math.min(config.chirpBandwidthKhz, maxAvailableBandwidth);

    // 3. Recommended / Optimal Operating Frequency
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
    const satisfiesResolution = config.desiredRangeResM > 0 && achievableRangeResolutionM <= config.desiredRangeResM * 1.05;

    // 6. Transmission Loss: 20*log10(R) + alpha * R
    const r = Math.max(1, config.targetDistanceM);
    const oneWayTL = 20 * Math.log10(r) + (effectiveAlpha_dB_m * r);
    const twoWayTL = 2 * oneWayTL;

    // 7. Transmit Power Estimation & Sonar Equation
    const ampEfficiency = Math.max(0.1, config.amplifierEfficiencyPct > 0 ? config.amplifierEfficiencyPct / 100 : 0.82);
    const targetSNR = 20.0;
    const ambientNoiseNL = 45.0;
    const tauSec = Math.max(0.001, config.pulseDurationMs / 1000);
    const processingGain = 10 * Math.log10(Math.max(1, bandwidthHz * tauSec));
    const requiredSL = targetSNR + ambientNoiseNL - processingGain + twoWayTL - config.targetStrengthDb;
    const requiredPAcoustic = Math.pow(10, (requiredSL - 185.8) / 10);
    const requiredTransmitterPowerW = Math.max(1, Math.min(250, requiredPAcoustic / 0.5));
    const isPowerWithinLimit = config.transmitPowerLimitW > 0 && requiredTransmitterPowerW <= config.transmitPowerLimitW;

    const activeTransmitPowerW = config.transmitPowerLimitW > 0 
      ? Math.min(config.transmitPowerLimitW, requiredTransmitterPowerW)
      : requiredTransmitterPowerW;

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
    const estimatedRuntimeHours = totalAverageSystemPowerW > 0 ? (usableBatteryEnergyWh / totalAverageSystemPowerW) : 0;
    const energyConsumedPerHourWh = totalAverageSystemPowerW;
    const estimatedMissionEnergyWh = totalAverageSystemPowerW * config.desiredMissionHours;
    const remainingBatteryEnergyWh = Math.max(0, usableBatteryEnergyWh - estimatedMissionEnergyWh);
    const meetsMissionDuration = config.desiredMissionHours > 0 && estimatedRuntimeHours >= config.desiredMissionHours;

    // 10. Fixed Baseline Comparison (80W baseline or configured max)
    const baselineTxPowerW = Math.max(50, config.transmitPowerLimitW || 80);
    const baselineTxElectricalW = baselineTxPowerW / ampEfficiency;
    const baselineAvgPowerW = (baselineTxElectricalW * (config.transmissionMode === 'Continuous' ? 1.0 : 0.25)) + electronicsPowerW;
    const baselineRuntimeHours = baselineAvgPowerW > 0 ? (usableBatteryEnergyWh / baselineAvgPowerW) : 0;
    const baselineMissionEnergyWh = baselineAvgPowerW * config.desiredMissionHours;
    const powerSavingPct = baselineAvgPowerW > 0 ? Math.max(0, ((baselineAvgPowerW - totalAverageSystemPowerW) / baselineAvgPowerW) * 100) : 0;
    const energySavingPct = baselineMissionEnergyWh > 0 ? Math.max(0, ((baselineMissionEnergyWh - estimatedMissionEnergyWh) / baselineMissionEnergyWh) * 100) : 0;

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
      hasCalculated: true,
      isOutdated,
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
  }, [config, calculationTimestamp, hasCalculated, isOutdated]);

  return (
    <SonarContext.Provider value={{
      config,
      updateConfig,
      updateMultipleConfig,
      resetToDefaults,
      triggerCalculate,
      isCalculating,
      hasCalculated,
      isOutdated,
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
