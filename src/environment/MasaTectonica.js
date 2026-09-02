/**
 * CAPA: MASA TECTÓNICA (Versión Final con Desaturación HSL por Capas)
 */
import * as THREE from "three";
import { ColorPalette } from "../ColorPalette.js";

export class MasaTectonica {
  constructor(scene, camera, initialRecord = null) {
    this.scene = scene;
    this.camera = camera;
    this.colorsTectonica = ColorPalette.getThreeColors("masaTectonica");
    this.initialRecord = initialRecord;

    // ESTADOS INTERPOLADOS
    this.state = {
      pressure: 750.0,
      temp: 12.0,
      humidity: 60.0,
      stress: 0.0,
      snapGlow: 0.0,
    };

    this.dummy = new THREE.Object3D();
    this.init();
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  getFrustumAtZ(targetZ) {
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov || 50);
    const dist = Math.abs(
      (this.camera.position ? this.camera.position.z : 100) - targetZ,
    );
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    const visibleWidth = visibleHeight * (this.camera.aspect || 1.0);

    return { visibleWidth, visibleHeight };
  }

  getProfile(normX, skew, layerIndex) {
    const shiftedNormX = normX - skew * (1.0 - Math.abs(normX));
    const absX = Math.abs(shiftedNormX);

    if (absX >= 1.0) return 0.0;

    const mainCurve = Math.pow(1.0 - Math.pow(absX, 1.7), 0.85);
    const plateauPhase = layerIndex % 2 === 0 ? 0.4 : -0.4;
    const plateauModulator =
      1.0 + 0.18 * Math.exp(-Math.pow((shiftedNormX - plateauPhase) * 2.2, 2));

    let profile = mainCurve * plateauModulator;
    const maxCap = layerIndex === 6 ? 0.98 : 0.8;
    profile = Math.min(profile, maxCap);

    const edgeAttenuation = Math.pow(1.0 - absX, 1.2);
    return THREE.MathUtils.clamp(profile * edgeAttenuation, 0.0, 1.0);
  }

  generateLayerClusters(config, layerIndex, xMin, xMax) {
    const clusterCount = 38;
    const clusters = [];
    const colorOffset = layerIndex * 20;

    for (let c = 0; c < clusterCount; c++) {
      const normX = (Math.random() - 0.5) * 2.0;
      let x = config.peakX + normX * (config.effectiveWidth / 2.0);
      x = THREE.MathUtils.clamp(x, xMin - 2.0, xMax + 2.0);

      const domeCurve = this.getProfile(normX, config.skew, layerIndex);
      const maxMountainY = config.baseY + config.height * domeCurve;

      const y =
        config.baseY +
        Math.random() * Math.max(0.1, maxMountainY - config.baseY);
      const colorSubIndex = Math.floor(Math.random() * 20);

      clusters.push({
        x: x,
        y: y,
        colorIdx: THREE.MathUtils.clamp(
          colorOffset + colorSubIndex,
          0,
          this.colorsTectonica.length - 1,
        ),
      });
    }

    return clusters;
  }

  getClusterColor(x, y, clusters, isMicroDetail) {
    let minDist = Infinity;
    let closestCluster = clusters[0];

    for (let i = 0; i < clusters.length; i++) {
      const dx = x - clusters[i].x;
      const dy = y - clusters[i].y;
      const dist = dx * dx * 0.75 + dy * dy * 1.25;

      if (dist < minDist) {
        minDist = dist;
        closestCluster = clusters[i];
      }
    }

    let finalColorIdx = closestCluster.colorIdx;
    if (isMicroDetail) {
      finalColorIdx = THREE.MathUtils.clamp(
        finalColorIdx + 1,
        0,
        this.colorsTectonica.length - 1,
      );
    }

    return this.colorsTectonica[finalColorIdx].clone();
  }

  init() {
    const geometry = new THREE.CircleGeometry(1.0, 14);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const TOTAL_LAYERS = 7;
    const UNIFIED_Z = -20.0;

    if (this.camera && this.camera.updateProjectionMatrix) {
      this.camera.updateProjectionMatrix();
    }
    const { visibleWidth, visibleHeight } = this.getFrustumAtZ(UNIFIED_Z);

    const marginXUnits = visibleWidth * 0.1;
    const marginYTopUnits = visibleHeight * 0.08;

    const xMin = -(visibleWidth / 2.0) + marginXUnits;
    const xMax = visibleWidth / 2.0 - marginXUnits;
    const fullSpan = xMax - xMin;

    const yMaxAbsolute = visibleHeight / 2.0 - marginYTopUnits;

    const rawConfigs = [
      {
        axisNormalized: 0.15,
        baseY: -36.0,
        relHeight: 0.52,
        skew: -0.06,
        phase: 0.5,
        widthRatio: 1.45,
      },
      {
        axisNormalized: 0.85,
        baseY: -34.3,
        relHeight: 0.55,
        skew: 0.06,
        phase: 1.2,
        widthRatio: 1.45,
      },
      {
        axisNormalized: 0.5,
        baseY: -35.1,
        relHeight: 0.6,
        skew: -0.02,
        phase: 2.1,
        widthRatio: 1.5,
      },

      {
        axisNormalized: 0.22,
        baseY: -16.0,
        relHeight: 0.72,
        skew: -0.08,
        phase: 0.8,
        widthRatio: 1.3,
      },
      {
        axisNormalized: 0.78,
        baseY: -2.0,
        relHeight: 0.92,
        skew: 0.08,
        phase: 2.8,
        widthRatio: 1.3,
      },
      {
        axisNormalized: 0.3,
        baseY: 4.0,
        relHeight: 0.8,
        skew: -0.05,
        phase: 1.5,
        widthRatio: 1.15,
      },
      {
        axisNormalized: 0.48,
        baseY: 16.0,
        relHeight: 0.98,
        skew: 0.0,
        phase: 0.0,
        widthRatio: 1.25,
      },
    ];

    const basePointSize = 1.85;
    const minPointSizeLimit = 0.95;
    const baseCount = 4400;

    const layerParticleCounts = new Array(TOTAL_LAYERS);
    let totalParticles = 0;

    for (let k = 0; k < TOTAL_LAYERS; k++) {
      const layerProgress = k / (TOTAL_LAYERS - 1);
      const calculatedScale = basePointSize * (1.0 - layerProgress * 0.26);
      const layerScale = Math.max(minPointSizeLimit, calculatedScale);

      const scaleRatio = basePointSize / layerScale;
      const count = Math.round(baseCount * Math.pow(scaleRatio, 1.95));

      layerParticleCounts[k] = count;
      totalParticles += count;
    }

    this.particleCount = totalParticles;
    this.mesh = new THREE.InstancedMesh(geometry, material, this.particleCount);

    this.basePositions = new Float32Array(this.particleCount * 3);
    this.baseScales = new Float32Array(this.particleCount);
    this.phases = new Float32Array(this.particleCount);
    this.layerIndices = new Float32Array(this.particleCount);
    this.baseColors = [];

    let particleIndex = 0;

    for (let k = TOTAL_LAYERS - 1; k >= 0; k--) {
      const layerProgress = k / (TOTAL_LAYERS - 1);
      const rawCfg = rawConfigs[k];
      const layerZ = UNIFIED_Z - k * 0.01;

      const peakX = xMin + fullSpan * rawCfg.axisNormalized;
      const effectiveWidth = fullSpan * rawCfg.widthRatio;

      const availableHeight = yMaxAbsolute - rawCfg.baseY;
      const height = availableHeight * rawCfg.relHeight;

      const config = {
        peakX: peakX,
        height: height,
        effectiveWidth: effectiveWidth,
        skew: rawCfg.skew,
        phase: rawCfg.phase,
        baseY: rawCfg.baseY,
      };

      const countForThisLayer = layerParticleCounts[k];
      const layerClusters = this.generateLayerClusters(config, k, xMin, xMax);

      const calculatedScale = basePointSize * (1.0 - layerProgress * 0.26);
      const currentLayerBaseScale = Math.max(
        minPointSizeLimit,
        calculatedScale,
      );

      for (let i = 0; i < countForThisLayer; i++) {
        if (particleIndex >= this.particleCount) break;

        const normX = (Math.random() - 0.5) * 2.0;
        let x = config.peakX + normX * (config.effectiveWidth / 2.0);

        let isSatellite = false;
        if (x < xMin || x > xMax) {
          const isLeft = x < xMin;
          const minGap = 0.35;
          const maxGap = 1.6;

          const offsetDist = minGap + Math.random() * (maxGap - minGap);
          x = isLeft ? xMin - offsetDist : xMax + offsetDist;

          if (Math.random() > 0.4) continue;
          isSatellite = true;
        }

        const domeCurve = this.getProfile(normX, config.skew, k);
        if (domeCurve < 0.005) continue;

        const primaryNoise = Math.sin(x * 0.1 + config.phase) * 1.0;
        let maxMountainY =
          config.baseY + config.height * domeCurve + primaryNoise;
        maxMountainY = Math.min(maxMountainY, yMaxAbsolute);

        const hasLayerBehind = k < TOTAL_LAYERS - 1;
        const isFrontRedLayer = k === 0;
        const topFrayZone = isFrontRedLayer ? 4.8 : hasLayerBehind ? 3.8 : 0.0;
        const bottomFrayZone = 3.2;

        const hFactor = Math.pow(Math.random(), 0.82);
        const yMinExtended =
          config.baseY -
          (Math.random() < 0.25 ? Math.random() * bottomFrayZone : 0.0);

        const isTopFrayed =
          (hasLayerBehind || isFrontRedLayer) &&
          Math.random() < (isFrontRedLayer ? 0.6 : 0.45);
        const yMaxExtended =
          maxMountainY + (isTopFrayed ? Math.random() * topFrayZone : 0.0);

        let y =
          yMinExtended + hFactor * Math.max(0.1, yMaxExtended - yMinExtended);

        if (y < config.baseY) {
          const frayRatio = (config.baseY - y) / bottomFrayZone;
          if (Math.random() < frayRatio * 0.75) continue;
        }

        const distToEdge = Math.abs(y - maxMountainY);
        const isNearEdge =
          distToEdge < 2.5 || y < config.baseY || y > maxMountainY;
        const isMicroDetail = Math.random() < 0.35 || isNearEdge;

        let finalSize = currentLayerBaseScale;

        const distToCenter = Math.sqrt(x * x + Math.pow(y + 8.0, 2));
        const isNearCharacter = distToCenter < 12.0;

        if (isNearCharacter) {
          finalSize *= 0.4 + Math.random() * 0.35;
        } else if (isSatellite) {
          finalSize *= 0.3 + Math.random() * 0.45;
        } else if (y > maxMountainY) {
          finalSize *= 0.5 + Math.random() * 0.35;
        } else if (y < config.baseY) {
          finalSize *= 0.35 + Math.random() * 0.4;
        } else if (isMicroDetail) {
          finalSize *= 0.45 + Math.random() * 0.35;
        } else {
          finalSize *= 1.1 + Math.random() * 0.3;
        }

        const z = layerZ + (isMicroDetail ? 0.005 : 0.0);

        this.basePositions[particleIndex * 3] = x;
        this.basePositions[particleIndex * 3 + 1] = y;
        this.basePositions[particleIndex * 3 + 2] = z;

        this.baseScales[particleIndex] = finalSize;
        this.phases[particleIndex] = Math.random() * Math.PI * 2;
        this.layerIndices[particleIndex] = k;

        this.dummy.position.set(x, y, z);
        this.dummy.scale.set(finalSize, finalSize, 1.0);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();

        this.mesh.setMatrixAt(particleIndex, this.dummy.matrix);

        const color = this.getClusterColor(x, y, layerClusters, isMicroDetail);
        this.baseColors[particleIndex] = color.clone();
        this.mesh.setColorAt(particleIndex, color);

        particleIndex++;
      }
    }

    this.mesh.count = particleIndex;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.scene.add(this.mesh);
  }

  update(record, targetStress = 0, frameCount, isSnap = false) {
    // 1. DATOS CLIMÁTICOS DE ENTRADA
    const targetPressure =
      record && record.surface_pressure !== undefined
        ? record.surface_pressure
        : 750.0;
    const targetTemp =
      record && record.temperature !== undefined ? record.temperature : 12.0;
    const targetHumidity =
      record && record.humidity !== undefined ? record.humidity : 60.0;

    // 2. SUAVIZADO DE TRANSICIÓN (FACTOR LERP = 0.03)
    const smoothFactor = 0.03;
    this.state.pressure = this.lerp(
      this.state.pressure,
      targetPressure,
      smoothFactor,
    );
    this.state.temp = this.lerp(this.state.temp, targetTemp, smoothFactor);
    this.state.humidity = this.lerp(
      this.state.humidity,
      targetHumidity,
      smoothFactor,
    );
    this.state.stress = this.lerp(
      this.state.stress,
      targetStress,
      smoothFactor,
    );

    // Snap Luminoso Progresivo
    const canSnap = isSnap && this.state.stress > 0.7;
    if (canSnap) {
      this.state.snapGlow = 0.55;
    } else {
      this.state.snapGlow = this.lerp(this.state.snapGlow, 0.0, 0.04);
    }

    // 3. REACTIVIDAD FÍSICA CONTROLADA
    const pressureFactor = THREE.MathUtils.clamp(
      (760.0 - this.state.pressure) / 12.0,
      -1.0,
      1.0,
    );
    const globalPressureShift = pressureFactor * 2.8;

    const breathPhase = Math.sin(frameCount * 0.01) * 0.08;

    // FRECUENCIA DE OSCILACIÓN FIJA (0.04) Y AMPLITUD CONTROLADA
    const fixedFrequency = 0.04;
    const maxWaveAmplitude = 0.25 + Math.min(this.state.stress, 1.0) * 0.3;

    // 4. CÁLCULO CROMÁTICO (TEMPERATURA & HUMEDAD)
    const tempFactor = THREE.MathUtils.clamp(
      (this.state.temp - 12.0) / 4.0,
      -1.0,
      1.0,
    );
    const humFactor = THREE.MathUtils.clamp(
      this.state.humidity / 100.0,
      0.0,
      1.0,
    );

    const tempTint = new THREE.Color();
    if (tempFactor < 0) {
      tempTint.setHSL(0.55, 0.45, 0.5); // Frío: azul cian
    } else {
      tempTint.setHSL(0.08, 0.55, 0.5); // Cálido: ámbar
    }
    const tintAmount = Math.abs(tempFactor) * 0.45;
    const tempColor = new THREE.Color();

    // 5. ACTUALIZACIÓN DE INSTANCIAS
    for (let i = 0; i < this.mesh.count; i++) {
      const baseX = this.basePositions[i * 3];
      const baseY = this.basePositions[i * 3 + 1];
      const baseZ = this.basePositions[i * 3 + 2];
      const layer = this.layerIndices[i];

      const layerWeight = (layer + 1) / 7.0;

      const yDeformation =
        Math.sin(frameCount * fixedFrequency + this.phases[i]) *
        maxWaveAmplitude *
        layerWeight;

      const currentX = baseX;
      const currentY = baseY + yDeformation + globalPressureShift * layerWeight;

      const pulse = breathPhase * (1.0 + this.state.stress * 0.3);
      const currentScale = this.baseScales[i] * (1.0 + pulse);

      this.dummy.position.set(currentX, currentY, baseZ);
      this.dummy.scale.set(currentScale, currentScale, 1.0);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // Tratamiento cromático
      if (this.baseColors[i]) {
        tempColor.copy(this.baseColors[i]);

        // A. Tinte por Temperatura
        if (tintAmount > 0.01) {
          tempColor.lerp(tempTint, tintAmount);
        }

        // B. Velo Atmosférico por Humedad (Saturación preservada en capas bajas e intermedias)
        // Curva suave 1.6 para que participen todas las capas, pero con impacto controlado
        const depthCurve = Math.pow(layerWeight, 1.6);

        // Reducimos la desaturación máxima a 0.38 para mantener colores vivos abajo
        const maxDesaturation = humFactor * 0.38 * depthCurve;
        const lightnessBoost = humFactor * 0.12 * depthCurve;

        if (maxDesaturation > 0.005) {
          const hsl = {};
          tempColor.getHSL(hsl);

          // Subimos el piso mínimo de saturación a 0.25 para asegurar colores más ricos
          const newS = Math.max(0.25, hsl.s - maxDesaturation);
          const newL = Math.min(0.85, hsl.l + lightnessBoost);

          tempColor.setHSL(hsl.h, newS, newL);
        }

        // C. Destello Snap
        if (this.state.snapGlow > 0.01) {
          const layerWave =
            Math.sin(frameCount * 0.08 + layer * 0.7) * 0.5 + 0.5;
          const energyGlow = this.state.snapGlow * layerWave;

          tempColor.r = Math.min(1.0, tempColor.r + energyGlow * 0.35);
          tempColor.g = Math.min(1.0, tempColor.g + energyGlow * 0.25);
          tempColor.b = Math.min(1.0, tempColor.b + energyGlow * 0.45);
        }

        this.mesh.setColorAt(i, tempColor);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
