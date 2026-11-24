/**
 * CAPA 4: ESTRATO ATMOSFÉRICO 
 * - Malla Independiente para GROUND (Niebla con opacidad real independiente = 0.22)
 * - BACK: Responde a Radiación Solar (Azul Noche <=50 W/m² <-> Amarillo Solar Dorado >300 W/m²)
 * - FRONT: Umbrales estrictos de Humedad/Precipitación (<50% Paleta Original, 50-75% Gris Perla, >75% Gris Plomo Tormenta)
 */
import * as THREE from "three";
import { ArtDirection } from "../ArtDirection.js";
import { ColorPalette } from "../ColorPalette.js";

export class EstratoAtmosferico {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.config = ArtDirection.estratoAtmosferico;
    this.colors = ColorPalette.getThreeColors("estratoAtmosferico");

    this.particleCountMain = 5500;  // Capas BACK + FRONT
    this.particleCountGround = 2300; // Capa GROUND dedicada
    this.dummy = new THREE.Object3D();

    this.state = {
      windSpeed: 12.0,
      windDeg: 90.0,
      humidity: 60.0,
      pressure: 750.0,
      radiation: 400.0,
      precipitation: 0.0,
      temperature: 15.0,
    };

    this.cloudCenters = [
      // --- 1. CAPA ALTA / FONDO (BACK) ---
      { x: -22, y: 67, z: -10, radiusX: 13.5, radiusY: 4, layer: "back",   yMin: 72, yMax: 82 },
      { x: -15, y: 57, z: -8,  radiusX: 15.0, radiusY: 4, layer: "back",   yMin: 62, yMax: 72 },
      { x: -7,  y: 67, z: -11, radiusX: 12.0, radiusY: 3, layer: "back",   yMin: 72, yMax: 82 },
      { x:  1,  y: 62, z: -9,  radiusX: 16.5, radiusY: 4, layer: "back",   yMin: 68, yMax: 78 },
      { x:  8,  y: 67, z: -12, radiusX: 13.5, radiusY: 3, layer: "back",   yMin: 72, yMax: 82 },
      { x:  15, y: 60, z: -8,  radiusX: 15.0, radiusY: 4, layer: "back",   yMin: 65, yMax: 75 },
      { x:  22, y: 67, z: -10, radiusX: 12.0, radiusY: 3, layer: "back",   yMin: 72, yMax: 82 },

      // --- 2. CAPA MEDIA / FRENTE (FRONT) ---
      { x: -22.0, y: 30, z:  2,  radiusX: 15.0, radiusY: 5, layer: "front",  yMin: 35, yMax: 45 },
      { x: -14.3, y: 35, z: -2,  radiusX: 16.5, radiusY: 5, layer: "front",  yMin: 40, yMax: 50 },
      { x:  -5.5, y: 35, z:  4,  radiusX: 13.5, radiusY: 4, layer: "front",  yMin: 40, yMax: 53 },
      { x:   3.3, y: 34, z:  0,  radiusX: 18.0, radiusY: 5, layer: "front",  yMin: 39, yMax: 49 },
      { x:  11.0, y: 27, z:  3,  radiusX: 15.0, radiusY: 4, layer: "front",  yMin: 33, yMax: 43 },
      { x:  18.7, y: 37, z: -1,  radiusX: 16.5, radiusY: 5, layer: "front",  yMin: 42, yMax: 52 },
      { x:  26.4, y: 39, z:  2,  radiusX: 13.5, radiusY: 4, layer: "front",  yMin: 44, yMax: 54 },

      // --- 3. CAPA BAJA / NIEBLA (GROUND) ---
      { x: -18, y: 18, z:  5,  radiusX: 14.0, radiusY: 3.5, layer: "ground", yMin: 14, yMax: 24 },
      { x:  -6, y: 24, z:  7,  radiusX: 16.0, radiusY: 4.0, layer: "ground", yMin: 20, yMax: 28 },
      { x:   8, y: 15, z:  6,  radiusX: 13.0, radiusY: 3.2, layer: "ground", yMin: 12, yMax: 20 },
      { x:  20, y: 22, z:  8,  radiusX: 15.0, radiusY: 3.8, layer: "ground", yMin: 18, yMax: 26 },
    ];

    this.cloudCenters.forEach((center) => {
      center.biasLeft = 0.6 + Math.random() * 0.8;
      center.biasRight = 0.6 + Math.random() * 0.8;
      center.cloudRotation = (Math.random() - 0.5) * 0.28;

      center.f1 = 2.0 + Math.random() * 2.0;
      center.f2 = 4.0 + Math.random() * 3.0;
      center.f3 = 7.0 + Math.random() * 4.0;
      center.p1 = Math.random() * Math.PI * 2;
      center.p2 = Math.random() * Math.PI * 2;
      center.p3 = Math.random() * Math.PI * 2;

      center.clusters = [
        { x: 0, y: 0 },
        { x: (Math.random() - 0.5) * center.radiusX * 0.7, y: (Math.random() - 0.5) * center.radiusY * 0.6 },
        { x: (Math.random() - 0.5) * center.radiusX * 0.9, y: (Math.random() - 0.5) * center.radiusY * 0.5 }
      ];
    });

    this.offsetsMain = [];
    this.offsetsGround = [];

    this.baseScalesMain = new Float32Array(this.particleCountMain);
    this.baseScalesGround = new Float32Array(this.particleCountGround);

    this.cloudAssignmentsMain = new Uint8Array(this.particleCountMain);
    this.cloudAssignmentsGround = new Uint8Array(this.particleCountGround);

    this.isMicroDustMain = new Uint8Array(this.particleCountMain);
    this.isMicroDustGround = new Uint8Array(this.particleCountGround);

    this.phasesMain = new Float32Array(this.particleCountMain);
    this.phasesGround = new Float32Array(this.particleCountGround);

    this.baseColorsMain = [];
    this.baseColorsGround = [];

    this.init();
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  getFrustumAtZ(targetZ) {
    const vFOV = THREE.MathUtils.degToRad(this.camera ? this.camera.fov || 50 : 50);
    const dist = Math.abs((this.camera && this.camera.position ? this.camera.position.z : 100) - targetZ);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    const visibleWidth = visibleHeight * (this.camera ? this.camera.aspect || 1.0 : 1.0);
    return { visibleWidth, visibleHeight };
  }

  init() {
    const geometry = new THREE.CircleGeometry(1.0, 12);

    // Material 1: Nubes Principales (BACK y FRONT)
    this.materialMain = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.meshMain = new THREE.InstancedMesh(geometry, this.materialMain, this.particleCountMain);

    // Material 2: Niebla Baja (GROUND) con Opacidad Independiente Traslúcida
    this.materialGround = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.meshGround = new THREE.InstancedMesh(geometry, this.materialGround, this.particleCountGround);

    const backClouds = this.cloudCenters.filter(c => c.layer === "back");
    const frontClouds = this.cloudCenters.filter(c => c.layer === "front");
    const groundClouds = this.cloudCenters.filter(c => c.layer === "ground");

    const backBudget = Math.floor(this.particleCountMain * 0.40);

    // 1. POBLAR CAPAS PRINCIPALES (BACK + FRONT)
    for (let i = 0; i < this.particleCountMain; i++) {
      const center = (i < backBudget) ? backClouds[i % backClouds.length] : frontClouds[(i - backBudget) % frontClouds.length];
      const cloudIdx = this.cloudCenters.indexOf(center);

      const rndCluster = Math.random();
      let cluster = center.clusters[0];
      if (rndCluster > 0.55 && rndCluster <= 0.85) cluster = center.clusters[1];
      else if (rndCluster > 0.85) cluster = center.clusters[2];

      const angle = Math.random() * Math.PI * 2;
      const radFactor = Math.pow(Math.random(), 1.15);

      const n1 = Math.sin(angle * center.f1 + center.p1) * 0.25;
      const n2 = Math.sin(angle * center.f2 + center.p2) * 0.15;
      const n3 = Math.sin(angle * center.f3 + center.p3) * 0.10;
      const edgeNoise = Math.max(0.3, 1.0 + n1 + n2 + n3);

      const sideBias = Math.cos(angle) < 0 ? center.biasLeft : center.biasRight;

      let rawX = cluster.x + Math.cos(angle) * (radFactor * center.radiusX * edgeNoise * sideBias);
      let rawY = cluster.y + Math.sin(angle) * (radFactor * center.radiusY * edgeNoise);

      const cosR = Math.cos(center.cloudRotation);
      const sinR = Math.sin(center.cloudRotation);
      const offsetX = rawX * cosR - rawY * sinR;
      const offsetY = rawX * sinR + rawY * cosR;
      const offsetZ = (Math.random() - 0.5) * 6.0;

      const distFromCenter = Math.sqrt(Math.pow(offsetX / center.radiusX, 2) + Math.pow(offsetY / center.radiusY, 2));
      const isEdge = distFromCenter > 0.55;
      const isDust = isEdge || Math.random() < 0.45;

      let layerScale = center.layer === "front" ? 1.40 : 0.75;
      const edgeScaleFactor = THREE.MathUtils.lerp(1.0, 0.65, Math.min(1.0, distFromCenter));
      let size = (isDust ? 0.22 + Math.random() * 0.40 : 0.90 + Math.random() * 1.30) * layerScale * edgeScaleFactor;

      this.cloudAssignmentsMain[i] = cloudIdx;
      this.isMicroDustMain[i] = isDust ? 1 : 0;
      this.offsetsMain.push({ x: offsetX, y: offsetY, z: offsetZ });
      this.baseScalesMain[i] = size;
      this.phasesMain[i] = Math.random() * Math.PI * 2;

      const colorBase = this.colors[i % this.colors.length].clone();
      this.baseColorsMain[i] = colorBase.clone();
      this.meshMain.setColorAt(i, colorBase);
    }

    // 2. POBLAR CAPA NIEBLA BAJA (GROUND)
    for (let i = 0; i < this.particleCountGround; i++) {
      const center = groundClouds[i % groundClouds.length];
      const cloudIdx = this.cloudCenters.indexOf(center);

      const rndCluster = Math.random();
      let cluster = center.clusters[0];
      if (rndCluster > 0.55 && rndCluster <= 0.85) cluster = center.clusters[1];
      else if (rndCluster > 0.85) cluster = center.clusters[2];

      const angle = Math.random() * Math.PI * 2;
      const radFactor = Math.pow(Math.random(), 1.45); // Espaciado vaporoso

      const n1 = Math.sin(angle * center.f1 + center.p1) * 0.25;
      const n2 = Math.sin(angle * center.f2 + center.p2) * 0.15;
      const edgeNoise = Math.max(0.3, 1.0 + n1 + n2);

      let rawX = cluster.x + Math.cos(angle) * (radFactor * center.radiusX * edgeNoise);
      let rawY = cluster.y + Math.sin(angle) * (radFactor * center.radiusY * edgeNoise);

      const offsetX = rawX;
      const offsetY = rawY;
      const offsetZ = (Math.random() - 0.5) * 4.0;

      const isDust = Math.random() < 0.60;
      let size = (isDust ? 0.35 + Math.random() * 0.45 : 1.10 + Math.random() * 1.10) * 0.85;

      this.cloudAssignmentsGround[i] = cloudIdx;
      this.isMicroDustGround[i] = isDust ? 1 : 0;
      this.offsetsGround.push({ x: offsetX, y: offsetY, z: offsetZ });
      this.baseScalesGround[i] = size;
      this.phasesGround[i] = Math.random() * Math.PI * 2;

      const colorBase = new THREE.Color("#E8E6E1");
      this.baseColorsGround[i] = colorBase.clone();
      this.meshGround.setColorAt(i, colorBase);
    }

    this.meshMain.instanceMatrix.needsUpdate = true;
    if (this.meshMain.instanceColor) this.meshMain.instanceColor.needsUpdate = true;

    this.meshGround.instanceMatrix.needsUpdate = true;
    if (this.meshGround.instanceColor) this.meshGround.instanceColor.needsUpdate = true;

    this.scene.add(this.meshMain);
    this.scene.add(this.meshGround);
  }

  update(record, frameCount = 0) {
    const targetWindSpeed = (record && record.wind_speed !== undefined) ? record.wind_speed : 12.0;
    const targetWindDeg = (record && record.wind_direction !== undefined) ? record.wind_direction : 90.0;
    const targetHumidity = (record && record.humidity !== undefined) ? record.humidity : 60.0;
    const targetPressure = (record && record.surface_pressure !== undefined) ? record.surface_pressure : 750.0;
    const targetRadiation = (record && record.solar_radiation !== undefined) ? record.solar_radiation : 400.0;
    const targetPrecip = (record && record.precipitation !== undefined) ? record.precipitation : 0.0;
    const targetTemp = (record && record.temperature !== undefined) ? record.temperature : 15.0;

    const smooth = 0.04;
    this.state.windSpeed = this.lerp(this.state.windSpeed, targetWindSpeed, smooth);
    this.state.windDeg = this.lerp(this.state.windDeg, targetWindDeg, smooth);
    this.state.humidity = this.lerp(this.state.humidity, targetHumidity, smooth);
    this.state.pressure = this.lerp(this.state.pressure, targetPressure, smooth);
    this.state.radiation = this.lerp(this.state.radiation, targetRadiation, smooth);
    this.state.precipitation = this.lerp(this.state.precipitation, targetPrecip, smooth);
    this.state.temperature = this.lerp(this.state.temperature, targetTemp, smooth);

    const { visibleWidth } = this.getFrustumAtZ(-4.0);
    const wrapBuffer = 16.0;
    const xMin = -(visibleWidth / 2.0) - wrapBuffer;
    const xMax = (visibleWidth / 2.0) + wrapBuffer;

    const normHum = THREE.MathUtils.clamp(this.state.humidity / 100.0, 0.0, 1.0);
    const precipNorm = THREE.MathUtils.clamp(this.state.precipitation / 50.0, 0.0, 1.0);
    const stormMetric = Math.max(normHum, precipNorm);

    const pressureNorm = THREE.MathUtils.clamp((this.state.pressure - 730.0) / 40.0, 0.0, 1.0);
    const pressureDensity = THREE.MathUtils.lerp(1.35, 0.72, pressureNorm);

    const tempFactor = THREE.MathUtils.clamp((this.state.temperature - 5.0) / 25.0, 0.0, 1.0);
    const heightExpansion = THREE.MathUtils.lerp(0.50, 1.85, tempFactor);
    const groundFogExpand = THREE.MathUtils.lerp(0.5, 1.6, normHum);

    // Ajuste de Opacidad Independiente
    this.materialMain.opacity = THREE.MathUtils.lerp(0.35, 0.80, stormMetric);
    this.materialGround.opacity = THREE.MathUtils.lerp(0.12, 0.30, normHum); // Niebla siempre traslúcida

    // MOVIMIENTO FÍSICO DE CENTROS DE NUBES
    const rad = THREE.MathUtils.degToRad(this.state.windDeg);
    const baseWindX = Math.cos(rad);
    const baseWindY = Math.sin(rad);

    const fallSpeed = 0.022;
    const liftForce = (this.state.windSpeed * 0.0045);

    for (let c = 0; c < this.cloudCenters.length; c++) {
      const center = this.cloudCenters[c];
      let layerSpeedMult = center.layer === "back" ? 0.45 : (center.layer === "ground" ? 0.70 : 1.0);

      const vx = baseWindX * (this.state.windSpeed * 0.009) * layerSpeedMult;
      const vy = (-fallSpeed + (baseWindY * liftForce)) * layerSpeedMult;

      center.x += vx;
      center.y += vy;

      if (center.x > xMax) center.x = xMin;
      else if (center.x < xMin) center.x = xMax;

      if (center.y < center.yMin) center.y = center.yMin;
      else if (center.y > center.yMax) center.y = center.yMax;
    }

    // PALETAS DE COLOR DEFINIDAS
    const midnightBlue = new THREE.Color("#14172B");  // Radiación <= 50 W/m²
    const goldenSolar = new THREE.Color("#FFE57F");   // Radiación > 300 W/m²
    
    const pearlStormGray = new THREE.Color("#9AA0A6"); // Humedad 50-75%
    const leadStormGray = new THREE.Color("#282D37");  // Humedad > 75%
    const mistBoneWhite = new THREE.Color("#E8E6E1");

    const waveFreq = 0.22 + (this.state.windSpeed * 0.025);
    const waveAmp = 0.20 + (this.state.windSpeed * 0.035);
    const highWindJitter = Math.max(0.0, (this.state.windSpeed - 18.0) * 0.03);

    const tempColor = new THREE.Color();

    // 1. ACTUALIZAR MESH PRINCIPAL (BACK + FRONT)
    for (let i = 0; i < this.particleCountMain; i++) {
      const cloudIdx = this.cloudAssignmentsMain[i];
      const center = this.cloudCenters[cloudIdx];
      const offset = this.offsetsMain[i];
      const phase = this.phasesMain[i];
      const isDust = this.isMicroDustMain[i];

      const dragFactor = isDust ? 0.75 : 0.28;
      const shearX = offset.y * baseWindX * dragFactor * (this.state.windSpeed * 0.15);
      const virgaY = (isDust && offset.y < 0) ? -precipNorm * 4.5 : 0.0;
      const wave = Math.sin(frameCount * 0.06 + offset.x * waveFreq + phase) * waveAmp;

      const jitterX = isDust ? (Math.random() - 0.5) * highWindJitter : 0.0;
      const jitterY = isDust ? (Math.random() - 0.5) * highWindJitter : 0.0;

      const x = center.x + (offset.x * pressureDensity) + shearX + jitterX;
      const y = center.y + (offset.y * pressureDensity * heightExpansion) + wave + virgaY + jitterY;
      const z = center.z + offset.z;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(this.baseScalesMain[i], this.baseScalesMain[i], 1.0);
      this.dummy.rotation.set(-Math.PI * 0.06, 0, center.cloudRotation + Math.atan2(baseWindY, baseWindX) * 0.12);
      this.dummy.updateMatrix();

      this.meshMain.setMatrixAt(i, this.dummy.matrix);

      // --- COLOR LÓGICO CAPA BACK ---
      if (center.layer === "back") {
        if (offset.y > 0) {
          if (this.state.radiation <= 50.0) {
            tempColor.copy(midnightBlue);
          } else if (this.state.radiation > 300.0) {
            tempColor.copy(goldenSolar);
          } else {
            const radFactor = (this.state.radiation - 50.0) / 250.0;
            tempColor.copy(midnightBlue).lerp(goldenSolar, radFactor);
          }
        } else {
          tempColor.copy(this.baseColorsMain[i]).multiplyScalar(0.85);
          if (this.state.radiation <= 50.0) tempColor.lerp(midnightBlue, 0.75);
        }
      }

      // --- COLOR LÓGICO CAPA FRONT (UMBRALES DE HUMEDAD Y PRECIPITACIÓN) ---
      else if (center.layer === "front") {
        if (stormMetric < 0.50) {
          // Paleta pastel original de la ilustración
          tempColor.copy(this.baseColorsMain[i]);
        } else if (stormMetric >= 0.50 && stormMetric <= 0.75) {
          // Transición a Gris Perla
          const t = (stormMetric - 0.50) / 0.25;
          tempColor.copy(this.baseColorsMain[i]).lerp(pearlStormGray, t);
        } else {
          // Mayor a 75%: Oscurecimiento a Gris Plomo Tormenta
          const t = Math.min(1.0, (stormMetric - 0.75) / 0.25);
          tempColor.copy(pearlStormGray).lerp(leadStormGray, t);
        }
      }

      this.meshMain.setColorAt(i, tempColor);
    }

    // 2. ACTUALIZAR MESH NIEBLA (GROUND)
    for (let i = 0; i < this.particleCountGround; i++) {
      const cloudIdx = this.cloudAssignmentsGround[i];
      const center = this.cloudCenters[cloudIdx];
      const offset = this.offsetsGround[i];
      const phase = this.phasesGround[i];
      const isDust = this.isMicroDustGround[i];

      const wave = Math.sin(frameCount * 0.04 + offset.x * waveFreq + phase) * (waveAmp * 0.5);

      const x = center.x + (offset.x * pressureDensity * groundFogExpand);
      const y = center.y + (offset.y * pressureDensity) + wave;
      const z = center.z + offset.z;

      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(this.baseScalesGround[i], this.baseScalesGround[i], 1.0);
      this.dummy.rotation.set(-Math.PI * 0.06, 0, center.cloudRotation);
      this.dummy.updateMatrix();

      this.meshGround.setMatrixAt(i, this.dummy.matrix);

      tempColor.copy(mistBoneWhite);
      if (isDust) tempColor.multiplyScalar(1.1);
      this.meshGround.setColorAt(i, tempColor);
    }

    this.meshMain.instanceMatrix.needsUpdate = true;
    if (this.meshMain.instanceColor) this.meshMain.instanceColor.needsUpdate = true;

    this.meshGround.instanceMatrix.needsUpdate = true;
    if (this.meshGround.instanceColor) this.meshGround.instanceColor.needsUpdate = true;
  }
}