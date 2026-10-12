// Comprehensive Scientific Acoustic, Signal Processing, and Power Engine
// Directly implementing specifications from "Low-Power Adaptive SDR Sonar Transmitter for AUVs"

/**
 * Calculates underwater sound speed c (in m/s) using the Mackenzie (1981) empirical formula.
 * @param {number} T - Temperature in Celsius (0 to 35)
 * @param {number} S - Salinity in PSU / ppt (0 to 45)
 * @param {number} D - Depth in meters (0 to 1000)
 * @returns {number} Sound speed in m/s
 */
export function calculateSoundSpeed(T = 15, S = 35, D = 50) {
  const t = Math.max(0, Math.min(35, T));
  const s = Math.max(0, Math.min(45, S));
  const d = Math.max(0, Math.min(1000, D));

  return (
    1448.96 +
    4.591 * t -
    0.05304 * Math.pow(t, 2) +
    0.0002374 * Math.pow(t, 3) +
    1.340 * (s - 35) +
    0.0163 * d +
    1.675e-7 * Math.pow(d, 2) -
    0.01025 * t * (s - 35) -
    7.139e-13 * t * Math.pow(d, 3)
  );
}

/**
 * Calculates high-frequency acoustic absorption coefficient alpha (dB/m)
 * using the Francois-Garrison seawater model (Boric acid + Magnesium sulfate + Pure water viscosity)
 * plus turbidity-induced particulate scattering loss.
 * @param {number} fKhz - Frequency in kHz (100 to 500)
 * @param {number} T - Temperature in Celsius
 * @param {number} S - Salinity in PSU
 * @param {number} D - Depth in meters
 * @param {number} turbidityNtu - Turbidity in NTU (0 to 100)
 * @returns {number} Total absorption coefficient in dB/m
 */
export function calculateAbsorption(fKhz = 250, T = 15, S = 35, D = 50, turbidityNtu = 0) {
  const f = Math.max(10, Math.min(600, fKhz));
  const t = Math.max(0, Math.min(35, T));
  const s = Math.max(0, Math.min(45, S));
  const d = Math.max(0, Math.min(1000, D));

  // Boric acid relaxation frequency and absorption
  const A1 = 0.106;
  const f1 = 0.78 * Math.sqrt(Math.max(0.1, s) / 35) * Math.exp(t / 26);
  const boric = (A1 * f1 * Math.pow(f, 2)) / (Math.pow(f1, 2) + Math.pow(f, 2));

  // Magnesium sulfate relaxation frequency and absorption
  const A2 = 0.52 * (1 + t / 43) * (s / 35);
  const f2 = 42 * Math.exp(t / 17);
  const magnesium = (A2 * f2 * Math.pow(f, 2)) / (Math.pow(f2, 2) + Math.pow(f, 2));

  // Pure water viscous absorption
  const A3 = 0.00049 * Math.exp(-(t / 27) + (d / 10000));
  const water = A3 * Math.pow(f, 2);

  // Depth pressure correction factor
  const depthCorr = 1 - 0.000038 * d;

  // Seawater absorption in dB/km
  const alphaSeawater_dB_km = (boric + magnesium + water) * depthCorr;
  const alphaSeawater_dB_m = alphaSeawater_dB_km / 1000.0;

  // Turbidity excess attenuation (scattering loss from suspended particles, scaling with f^1.2)
  const turbExcess_dB_m = (Math.max(0, turbidityNtu) / 100) * 0.025 * Math.pow(f / 250, 1.2);

  return alphaSeawater_dB_m + turbExcess_dB_m;
}

/**
 * Adaptive Decision Logic (PDF Page 2 & 4 & 6)
 * Sweeps between 100 kHz and 500 kHz:
 * - Low turbidity & short range -> 500 kHz (Ultra-high imaging resolution)
 * - High turbidity (>50 NTU) or long range (>250m) -> downshifts to 100 kHz (Penetration & lower scattering)
 * @param {number} rangeM - Target range in meters (10 to 500)
 * @param {number} turbidityNtu - Turbidity in NTU (0 to 100)
 * @returns {number} Optimal frequency in kHz
 */
export function calculateOptimalFrequency(rangeM = 100, turbidityNtu = 15) {
  const rangeNorm = Math.min(1, Math.max(0, (rangeM - 10) / 490)); // 0 (10m) to 1 (500m)
  const turbNorm = Math.min(1, Math.max(0, turbidityNtu / 100)); // 0 to 1

  // Weighted acoustic impedance and attenuation penalty
  const penalty = 0.60 * rangeNorm + 0.40 * turbNorm;

  // Adaptive frequency sweep 500 kHz down to 100 kHz
  const fOpt = 500 - penalty * 400;
  return Math.round(Math.max(100, Math.min(500, fOpt)));
}

/**
 * Transmission Loss TL = 20*log10(R) + alpha * R
 * @param {number} rangeM - Range in meters
 * @param {number} alpha_dB_m - Absorption in dB/m
 * @returns {number} Transmission loss in dB
 */
export function calculateTransmissionLoss(rangeM = 100, alpha_dB_m = 0.05) {
  const r = Math.max(1, rangeM);
  const geometricLoss = 20 * Math.log10(r);
  const absorptionLoss = alpha_dB_m * r;
  return geometricLoss + absorptionLoss;
}

/**
 * Comprehensive Sonar Equation Calculation
 * Solves:
 *   EL = SL - 2*TL + TS
 *   SNR = EL - NL
 *   Δt = 2*R / c
 *   ΔR = c / (2*Bandwidth)
 *   Processing Gain PG = 10 * log10(Bandwidth * tau)
 */
export function calculateSonarEquation({
  sourcePowerW = 50,
  rangeM = 100,
  freqKhz = 250,
  tempC = 15,
  salinityPsu = 35,
  depthM = 50,
  turbidityNtu = 15,
  targetStrengthTS = -10,
  ambientNoiseNL = 45,
  chirpDurationMs = 15,
  bandwidthKhz = 50
}) {
  const soundSpeed = calculateSoundSpeed(tempC, salinityPsu, depthM);
  const alpha_dB_m = calculateAbsorption(freqKhz, tempC, salinityPsu, depthM, turbidityNtu);

  const oneWayTL = calculateTransmissionLoss(rangeM, alpha_dB_m);
  const twoWayTL = 2 * oneWayTL;

  // Source Level SL (dB re 1uPa @ 1m):
  // SL = 170.8 + 10*log10(P_ac) + Directivity Index (DI ≈ 15 dB for directional transducer)
  const pAcoustic = Math.max(0.1, sourcePowerW * 0.5); // Piezo efficiency ~50%
  const sourceLevelSL = 170.8 + 10 * Math.log10(pAcoustic) + 15.0;

  // Echo Level EL
  const echoLevelEL = sourceLevelSL - twoWayTL + targetStrengthTS;

  // Matched filter processing gain (Time-Bandwidth product)
  const bwHz = Math.max(5000, bandwidthKhz * 1000);
  const tauSec = Math.max(0.001, chirpDurationMs / 1000);
  const processingGain = 10 * Math.log10(bwHz * tauSec);

  // Raw SNR before matched filtering, and processed SNR after compression
  const rawSNR = echoLevelEL - ambientNoiseNL;
  const processedSNR = rawSNR + processingGain;

  // Two-way propagation delay Δt = 2R / c
  const delayMs = (2 * rangeM / soundSpeed) * 1000;

  // Theoretical range resolution ΔR = c / (2 * B)
  const rangeResolutionCm = (soundSpeed / (2 * bwHz)) * 100;

  return {
    soundSpeed,
    alpha_dB_m,
    oneWayTL,
    twoWayTL,
    sourceLevelSL,
    echoLevelEL,
    rawSNR,
    snr: processedSNR,
    processingGain,
    delayMs,
    rangeResolutionCm
  };
}

/**
 * Cognitive Adaptive Power Scaling (PDF Page 4 & 10 & 13)
 * Dynamically finds the minimum transmitter power (10W to 100W)
 * that satisfies the required SNR lock (default 20 dB).
 */
export function calculateAdaptivePower(
  requiredSNR = 20,
  rangeM = 100,
  freqKhz = 250,
  tempC = 15,
  salinityPsu = 35,
  depthM = 50,
  turbidityNtu = 15,
  targetStrengthTS = -10,
  ambientNoiseNL = 45,
  chirpDurationMs = 15,
  bandwidthKhz = 50
) {
  let optimalPwr = 10;
  for (let p = 10; p <= 100; p += 2) {
    const res = calculateSonarEquation({
      sourcePowerW: p,
      rangeM,
      freqKhz,
      tempC,
      salinityPsu,
      depthM,
      turbidityNtu,
      targetStrengthTS,
      ambientNoiseNL,
      chirpDurationMs,
      bandwidthKhz
    });
    if (res.snr >= requiredSNR) {
      optimalPwr = p;
      break;
    }
    optimalPwr = p;
  }
  return optimalPwr;
}

/**
 * Multi-Rail Power and Mission Life Model (PDF Page 6, 9, 10)
 * Battery: Li-ion 48V / 10 Ah = 480 Wh (1,728 kJ)
 * Class D Amplifier prototype: >82% measured efficiency
 * Multi-rail buck converters: 3.3V, 5V, 12V, 48V
 */
export function calculateMissionDuration({
  transmitPowerW,
  amplifierEfficiency = 0.82,
  batteryCapacityWh = 480,
  dutyCycle = 0.20, // 20% transmit active, 80% listening/sleep
  mcuPowerW = 1.2,  // STM32H7 @ 168 MHz
  fpgaPowerW = 4.5, // Xilinx Artix-7
  dacAdcPowerW = 1.6, // 16-bit >2 MSPS
  sensorPowerW = 1.2  // Depth + Temp + Salinity + Turbidity
}) {
  // Idle processing rail power (3.3V + 5V + 12V)
  const digitalIdlePowerW = mcuPowerW + fpgaPowerW + dacAdcPowerW + sensorPowerW;

  // Power amplifier DC draw from 48V bus during active transmit
  const ampDcDrawW = transmitPowerW / Math.max(0.5, amplifierEfficiency);
  const txTotalPowerW = ampDcDrawW + digitalIdlePowerW;

  // Weighted average power across the duty cycle
  const avgSystemPowerW = (txTotalPowerW * dutyCycle) + (digitalIdlePowerW * (1 - dutyCycle));

  // Thermal dissipation in Class D amplifier (heatsink load)
  const thermalLossW = (ampDcDrawW - transmitPowerW) * dutyCycle;

  // Usable battery energy (90% Depth of Discharge for Li-ion safety)
  const usableWh = batteryCapacityWh * 0.90;
  const missionHours = usableWh / Math.max(0.5, avgSystemPowerW);

  // Energy consumed per 100 pings
  const pingDurationSec = 0.05; // 50ms active chirp per ping
  const energyPerPingJoules = (ampDcDrawW + digitalIdlePowerW) * pingDurationSec;

  return {
    digitalIdlePowerW,
    ampDcDrawW,
    txTotalPowerW,
    avgSystemPowerW,
    thermalLossW,
    missionHours,
    energyPerPingJoules,
    usableWh
  };
}

/**
 * Generates discrete time-domain samples of an LFM chirp waveform:
 *   s_tx(t) = w(t) * sin( 2*pi * (f0*t + (B/(2*tau))*t^2) )
 * @param {number} fStartKhz - Start frequency (e.g. 200 kHz)
 * @param {number} fStopKhz - Stop frequency (e.g. 250 kHz)
 * @param {number} durationMs - Chirp duration (e.g. 15 ms)
 * @param {number} sampleCount - Number of points for visual SVG rendering
 * @returns {Array<{t: number, tx: number}>} Array of waveform samples
 */
export function generateLFMChirpWaveform(
  fStartKhz = 200,
  fStopKhz = 250,
  durationMs = 15,
  sampleCount = 180
) {
  const points = [];
  const f0 = fStartKhz;
  const f1 = fStopKhz;
  const tau = durationMs;
  const k = (f1 - f0) / (2 * tau); // Chirp rate

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * tau;
    // Normalized phase for display rendering
    const normFreqScale = 0.05;
    const phase = 2 * Math.PI * (f0 * normFreqScale * t + k * normFreqScale * Math.pow(t, 2));

    // Tukey windowing to eliminate spectral splatter at envelope edges
    const envelope = Math.sin((Math.PI * i) / (sampleCount - 1));
    const tx = Math.sin(phase) * envelope;
    points.push({ t, tx });
  }

  return points;
}

/**
 * Simulates the received echo signal with delay, attenuation, and underwater noise,
 * along with the matched-filter pulse compression output.
 * @param {Array<{t: number, tx: number}>} txPoints - Transmitted chirp points
 * @param {number} snrDb - Echo SNR in dB
 * @param {number} delayRatio - Relative delay within viewing window (0 to 1)
 * @returns {{rxPoints: Array<{i: number, val: number}>, compressedPoints: Array<{i: number, val: number}>}}
 */
export function simulateEchoAndCompression(txPoints, snrDb = 20, delayRatio = 0.55) {
  const totalDisplayPoints = 200;
  const rxPoints = [];
  const compressedPoints = [];

  const noiseAmp = Math.pow(10, -snrDb / 20) * 0.5;
  const chirpLen = txPoints.length;
  const startIdx = Math.floor((totalDisplayPoints - chirpLen) * delayRatio);

  for (let i = 0; i < totalDisplayPoints; i++) {
    // Generate pseudo-random gaussian acoustic channel noise
    const noise = (Math.random() - 0.5) * 2 * noiseAmp;
    let signal = 0;

    if (i >= startIdx && i < startIdx + chirpLen) {
      signal = txPoints[i - startIdx].tx * 0.75;
    }

    const rxVal = signal + noise;
    rxPoints.push({ i, val: rxVal });

    // Matched filter sinc peak response around target delay
    const distFromPeak = Math.abs(i - (startIdx + Math.floor(chirpLen / 2)));
    const sinc = distFromPeak === 0 ? 1 : Math.sin(distFromPeak * 0.7) / (distFromPeak * 0.7);
    const compressedVal = Math.max(0, sinc * (snrDb > 10 ? 1 : 0.4)) + (Math.random() - 0.5) * 0.08;
    compressedPoints.push({ i, val: compressedVal });
  }

  return { rxPoints, compressedPoints };
}


/**
 * Evaluates candidate frequencies within configured limits [minFreqKhz, maxFreqKhz]
 * Computes:
 * - Acoustic Attenuation alpha (dB/km)
 * - Two-way Transmission Loss 2TL (dB)
 * - Required transmit power to achieve target SNR lock (20 dB)
 * - Achievable range resolution (m)
 * - Whether resolution meets target
 * - Whether required power is within limit
 * - Composite suitability score
 */
export function evaluateCandidateFrequencies(config, soundSpeed = 1500) {
  const minF = Math.max(10, Math.min(config.minFreqKhz, config.maxFreqKhz - 10));
  const maxF = Math.max(minF + 10, config.maxFreqKhz);
  
  // Create 5 to 7 candidate frequencies across the configured range
  const numCandidates = 5;
  const step = (maxF - minF) / (numCandidates - 1);
  const candidates = [];

  for (let i = 0; i < numCandidates; i++) {
    const f = Math.round(minF + i * step);
    const alpha_dB_m = calculateAbsorption(f, config.tempC, config.salinityPsu, config.depthM, config.turbidityNtu);
    const alpha_dB_km = alpha_dB_m * 1000.0;
    
    // Bandwidth available around this carrier (capped at configured chirpBandwidthKhz)
    const bwKhz = Math.min(config.chirpBandwidthKhz, maxF - minF);
    const bwHz = bwKhz * 1000;
    const resM = soundSpeed / (2 * Math.max(1000, bwHz));
    const meetsRes = resM <= config.desiredRangeResM * 1.05;

    // Transmission loss
    const r = Math.max(1, config.targetDistanceM);
    const twoWayTL = 2 * (20 * Math.log10(r) + alpha_dB_m * r);

    // Processing gain & SNR lock power requirement
    const tauSec = Math.max(0.001, config.pulseDurationMs / 1000);
    const pg = 10 * Math.log10(Math.max(1, bwHz * tauSec));
    const targetSNR = 20.0;
    const ambientNoiseNL = 45.0;
    const reqSL = targetSNR + ambientNoiseNL - pg + twoWayTL - config.targetStrengthDb;
    const reqPAcoustic = Math.pow(10, (reqSL - 185.8) / 10);
    const reqPwrW = Math.max(5, Math.min(250, reqPAcoustic / 0.5));
    const meetsPwr = reqPwrW <= config.transmitPowerLimitW;

    candidates.push({
      freqKhz: f,
      alpha_dB_km: alpha_dB_km,
      alpha_dB_m: alpha_dB_m,
      twoWayTL_dB: twoWayTL,
      achievableResM: resM,
      achievableResCm: resM * 100,
      meetsResolution: meetsRes,
      requiredPowerW: reqPwrW,
      meetsPowerLimit: meetsPwr
    });
  }

  return candidates;
}
