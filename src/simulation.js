/**
 * MÓDULO 2: Motor de Simulación Temporal (Voltaje - Prioridad 2)
 * Generación de estrés discontinuo basado en Ruido Celular Voronoi y Saltos Tectónicos.
 * Compatible con la iteración de datos climáticos original.
 */

export class SimulationEngine {
  constructor(totalSeconds = 300) {
    this.totalSeconds = totalSeconds;
    this.weatherData = [];
    this.attractors = null;

    this.currentIndex = 0;
    this.nextIndex = 0;
    this.stepProgress = 0.0; // Progreso (0.0 a 1.0) entre el registro N y N+1

    this.currentStress = 0.0;
    this.targetStress = 0.0;
    this.framesPerStep = 60;

    this.baseRawStress = 0.0;
    this.snapTriggered = false;
    this.lastSnapFrame = 0;
    this.quantizationSteps = 7;
    this.voronoiScale = 0.02;
  }

  init(weatherDataInput) {
    if (weatherDataInput && weatherDataInput.records) {
      this.attractors = weatherDataInput;
      this.weatherData = weatherDataInput.records;
    } else if (Array.isArray(weatherDataInput)) {
      this.weatherData = weatherDataInput;
    } else {
      this.weatherData = [];
    }

    if (this.weatherData.length > 0) {
      this.framesPerStep = Math.max(
        1,
        Math.floor((this.totalSeconds * 60) / this.weatherData.length),
      );
      this.targetStress = this.calculateStress(this.getInterpolatedRecord());
    }
  }

  getVoronoiDiscontinuity(t) {
    const scaledT = t * this.voronoiScale;
    const cell = Math.floor(scaledT);
    const frac = scaledT - cell;

    const p1 = Math.abs(Math.sin(cell * 17.123 + 43.12) * 43758.5453) % 1;
    const p2 = Math.abs(Math.sin((cell + 1) * 17.123 + 43.12) * 43758.5453) % 1;

    const dist1 = Math.abs(frac - p1);
    const dist2 = Math.abs(1.0 + frac - p2);

    return Math.min(dist1, dist2) * 2.0;
  }

  update(frameCount) {
    if (!this.weatherData || this.weatherData.length === 0) return;

    // 1. Cálculo exacto del índice actual, siguiente y progreso continuo
    const totalProgressFrames = frameCount % (this.totalSeconds * 60);
    const globalStep = totalProgressFrames / this.framesPerStep;

    this.currentIndex = Math.floor(globalStep) % this.weatherData.length;
    this.nextIndex = (this.currentIndex + 1) % this.weatherData.length;
    this.stepProgress = globalStep - Math.floor(globalStep); // Valor de 0.0 a 1.0

    // 2. Tensión calculada sobre el Registro Interpolado
    const interpolatedRecord = this.getInterpolatedRecord();
    this.targetStress = this.calculateStress(interpolatedRecord);

    // 3. Aproximación suave
    this.baseRawStress = this.lerp(this.baseRawStress, this.targetStress, 0.05);

    // 4. Modulación por Ruido Voronoi
    const vNoise = this.getVoronoiDiscontinuity(frameCount);
    const modulatedStress = Math.max(
      0.0,
      Math.min(1.0, this.baseRawStress + (vNoise - 0.5) * 0.25),
    );

    const previousQuantized = this.currentStress;

    if (modulatedStress > 0.2) {
      const activeSteps = Math.max(
        3,
        Math.floor(this.quantizationSteps * (1.1 - modulatedStress)),
      );
      this.currentStress =
        Math.round(modulatedStress * activeSteps) / activeSteps;
    } else {
      this.currentStress = modulatedStress;
    }

    const stressDelta = Math.abs(this.currentStress - previousQuantized);

    if (stressDelta >= 0.1 && frameCount - this.lastSnapFrame > 10) {
      this.snapTriggered = true;
      this.lastSnapFrame = frameCount;
    } else {
      this.snapTriggered = false;
    }
  }

  getCurrentRecord() {
    return this.weatherData[this.currentIndex] || {};
  }

  /**
   * 🌟 NUEVO: Retorna una mezcla continua Lerp entre el registro actual y el siguiente
   */
  getInterpolatedRecord() {
    const rCurr = this.weatherData[this.currentIndex];
    const rNext = this.weatherData[this.nextIndex];

    if (!rCurr) return {};
    if (!rNext) return rCurr;

    const t = this.stepProgress;

    return {
      datetime: rCurr.datetime,
      temperature_180m: this.lerp(
        rCurr.temperature_180m || 0,
        rNext.temperature_180m || 0,
        t,
      ),
      wind_speed_180m: this.lerp(
        rCurr.wind_speed_180m || 0,
        rNext.wind_speed_180m || 0,
        t,
      ),
      relative_humidity_2m: this.lerp(
        rCurr.relative_humidity_2m || 0,
        rNext.relative_humidity_2m || 0,
        t,
      ),
      precipitation_probability: this.lerp(
        rCurr.precipitation_probability || 0,
        rNext.precipitation_probability || 0,
        t,
      ),
      shortwave_radiation: this.lerp(
        rCurr.shortwave_radiation || 0,
        rNext.shortwave_radiation || 0,
        t,
      ),
      surface_pressure: this.lerp(
        rCurr.surface_pressure || 0,
        rNext.surface_pressure || 0,
        t,
      ),
      wind_direction_10m: this.lerp(
        rCurr.wind_direction_10m || 0,
        rNext.wind_direction_10m || 0,
        t,
      ),
    };
  }

  calculateStress(record) {
    if (!record || record.precipitation_probability === undefined) return 0;

    let pFactor = (record.precipitation_probability || 0) / 100.0;
    let rawWFactor = (record.wind_speed_180m || 0) / 45.0;
    let wFactor = Math.min(Math.max(rawWFactor, 0.0), 1.0);
    let hFactor = Math.abs(50 - (record.relative_humidity_2m || 50)) / 50.0;
    let pressFactor = Math.min(
      Math.max((760 - (record.surface_pressure || 750)) / 30.0, 0.0),
      1.0,
    );

    return (
      pFactor * 0.35 + wFactor * 0.35 + hFactor * 0.15 + pressFactor * 0.15
    );
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }
}
