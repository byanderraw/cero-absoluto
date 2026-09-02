// src/components/BitacoraUI.js

export class BitacoraUI {
  constructor(container) {
    this.container = container;
    this.uiVisible = true;
    this.uiTimeout = null;

    this.injectStyles();
    this.buildDOM();
    this.addInteractivity();
  }

  injectStyles() {
    if (document.getElementById("sim-ui-styles")) return;

    const styleElement = document.createElement("style");
    styleElement.id = "sim-ui-styles";
    styleElement.textContent = `
      .sim-ui-panel {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 250px;
        background: rgba(245, 240, 235, 0.88);
        color: #1a1a1a;
        font-family: 'Courier New', Courier, monospace;
        font-size: 10px;
        padding: 14px;
        border-radius: 3px;
        border: 1px solid rgba(0,0,0,0.12);
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        backdrop-filter: blur(6px);
        z-index: 999;
        transition: opacity 0.8s ease, transform 0.8s ease;
        pointer-events: auto;
        user-select: none;
      }
      .sim-ui-panel.hidden {
        opacity: 0;
        transform: translateY(-8px);
        pointer-events: none;
      }
      .sim-ui-title {
        font-size: 11px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: 2px;
        color: #1a1a1a;
        text-transform: uppercase;
      }
      .sim-ui-date {
        color: #66635d;
        font-size: 9px;
        margin-bottom: 6px;
      }
      .sim-ui-divider {
        border: 0;
        border-top: 1px dashed rgba(0, 0, 0, 0.15);
        margin: 5px 0;
      }
      .sim-ui-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }
      .sim-ui-label {
        color: #524f48;
      }
      .sim-ui-value {
        font-weight: bold;
        color: #1a1a1a;
      }
      .sim-ui-bar-container {
        width: 100%;
        height: 3px;
        background: rgba(0,0,0,0.08);
        margin-top: 3px;
        border-radius: 1px;
        overflow: hidden;
      }
      .sim-ui-bar-fill {
        height: 100%;
        width: 0%;
        background: #d92626;
        transition: width 0.1s ease, background-color 0.3s ease;
      }
      .sim-ui-footer {
        margin-top: 8px;
        font-size: 8px;
        color: #8c8880;
        text-align: center;
      }
    `;
    document.head.appendChild(styleElement);
  }

  buildDOM() {
    this.uiContainer = document.createElement("div");
    this.uiContainer.className = "sim-ui-panel";
    this.uiContainer.innerHTML = `
      <div class="sim-ui-title">BITÁCORA AMBIENTAL</div>
      <div class="sim-ui-date" id="ui-date">-- / -- / ---- --:--</div>
      
      <div class="sim-ui-row">
        <span class="sim-ui-label">Progreso:</span>
        <span class="sim-ui-value" id="ui-progress">0%</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Iteración:</span>
        <span class="sim-ui-value" id="ui-iteration">0 / 72</span>
      </div>

      <hr class="sim-ui-divider" />

      <div class="sim-ui-row">
        <span class="sim-ui-label">Carga Alostática:</span>
        <span class="sim-ui-value" id="ui-stress">0%</span>
      </div>
      <div class="sim-ui-bar-container">
        <div class="sim-ui-bar-fill" id="ui-stress-bar"></div>
      </div>

      <hr class="sim-ui-divider" />

      <div class="sim-ui-row">
        <span class="sim-ui-label">Temperatura:</span>
        <span class="sim-ui-value" id="ui-temp">-- °C</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Viento:</span>
        <span class="sim-ui-value" id="ui-wind">-- km/h</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Dirección Viento:</span>
        <span class="sim-ui-value" id="ui-wind-dir">--°</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Humedad Relativa:</span>
        <span class="sim-ui-value" id="ui-humidity">-- %</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Precipitación:</span>
        <span class="sim-ui-value" id="ui-precip">-- %</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Radiación Solar:</span>
        <span class="sim-ui-value" id="ui-rad">-- W/m²</span>
      </div>
      <div class="sim-ui-row">
        <span class="sim-ui-label">Presión Superficie:</span>
        <span class="sim-ui-value" id="ui-press">-- hPa</span>
      </div>

      <div class="sim-ui-footer">
        [H] Ocultar UI &nbsp;|&nbsp; [T] Pantalla Completa
      </div>
    `;

    if (this.container) {
      this.container.appendChild(this.uiContainer);
    } else {
      document.body.appendChild(this.uiContainer);
    }

    this.elements = {
      date: document.getElementById("ui-date"),
      progress: document.getElementById("ui-progress"),
      iteration: document.getElementById("ui-iteration"),
      stress: document.getElementById("ui-stress"),
      stressBar: document.getElementById("ui-stress-bar"),
      temp: document.getElementById("ui-temp"),
      wind: document.getElementById("ui-wind"),
      windDir: document.getElementById("ui-wind-dir"),
      humidity: document.getElementById("ui-humidity"),
      precip: document.getElementById("ui-precip"),
      rad: document.getElementById("ui-rad"),
      press: document.getElementById("ui-press"),
    };

    this.resetTimer();
  }

  resetTimer() {
    if (!this.uiContainer) return;
    this.uiContainer.classList.remove("hidden");
    clearTimeout(this.uiTimeout);

    this.uiTimeout = setTimeout(() => {
      if (this.uiVisible) {
        this.uiContainer.classList.add("hidden");
      }
    }, 4000);
  }

  update(record, stress, simulationInfo = {}) {
    if (!this.elements) return;

    const totalRecords = simulationInfo.totalRecords || 72;
    const currentIndex = simulationInfo.currentIndex || 0;
    const currentStep = Math.min(Math.max(currentIndex + 1, 1), totalRecords);

    const progressPct = ((currentStep / totalRecords) * 100).toFixed(1);
    const stressPct = Math.min(Math.max(stress * 100, 0), 100).toFixed(0);

    this.elements.date.textContent =
      record && record.datetime ? record.datetime : "Registro continuo";
    this.elements.progress.textContent = `${progressPct}%`;
    this.elements.iteration.textContent = `${currentStep} / ${totalRecords}`;

    this.elements.stress.textContent = `${stressPct}%`;
    this.elements.stressBar.style.width = `${stressPct}%`;

    if (stress > 0.7) {
      this.elements.stressBar.style.background = "#d92626";
    } else if (stress > 0.35) {
      this.elements.stressBar.style.background = "#e69500";
    } else {
      this.elements.stressBar.style.background = "#2b5c8f";
    }

    if (record) {
      this.elements.temp.textContent =
        record.temperature_180m !== undefined
          ? `${record.temperature_180m.toFixed(1)} °C`
          : "--";
      this.elements.wind.textContent =
        record.wind_speed_180m !== undefined
          ? `${record.wind_speed_180m.toFixed(1)} km/h`
          : "--";
      this.elements.windDir.textContent =
        record.wind_direction_10m !== undefined
          ? `${record.wind_direction_10m.toFixed(0)}°`
          : "--";
      this.elements.humidity.textContent =
        record.relative_humidity_2m !== undefined
          ? `${record.relative_humidity_2m.toFixed(0)} %`
          : "--";
      this.elements.precip.textContent =
        record.precipitation_probability !== undefined
          ? `${record.precipitation_probability.toFixed(0)} %`
          : "0 %";
      this.elements.rad.textContent =
        record.shortwave_radiation !== undefined
          ? `${record.shortwave_radiation.toFixed(0)} W/m²`
          : "--";
      this.elements.press.textContent =
        record.surface_pressure !== undefined
          ? `${record.surface_pressure.toFixed(1)} hPa`
          : "--";
    }
  }

  toggleUI() {
    this.uiVisible = !this.uiVisible;
    if (this.uiContainer) {
      this.uiContainer.classList.toggle("hidden", !this.uiVisible);
    }
  }

  addInteractivity() {
    window.addEventListener("mousemove", () => this.resetTimer());
    window.addEventListener("keydown", (e) => {
      this.resetTimer();
      if (e.key === "h" || e.key === "H") this.toggleUI();
    });
    window.addEventListener("click", () => this.resetTimer());
  }
}
