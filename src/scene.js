// src/SceneManager.js
import * as THREE from "three";

import { Avatar } from "./avatar.js";
import { EnvironmentManager } from "./environment/EnvironmentManager.js";
import { ArtDirection } from "./ArtDirection.js";
import { ColorPalette } from "./ColorPalette.js";
import { BitacoraUI } from "./components/BitacoraUI.js";

export class SceneManager {
  constructor(simulation, audio) {
    this.simulation = simulation;
    this.audio = audio;

    this.container = document.getElementById("canvas-container");
    this.width = this.container
      ? this.container.clientWidth
      : window.innerWidth;
    this.height = this.container
      ? this.container.clientHeight
      : window.innerHeight;

    this.initThree();
    this.addLights();

    this.avatar = new Avatar();
    this.scene.add(this.avatar.group);

    this.initEnvironmentManager();
    this.bitacora = new BitacoraUI(this.container);
    this.addEvents();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      ColorPalette.soporte.pergaminoViejo,
    );

    const { fov, near, far, position, target } = ArtDirection.camera;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      this.width / this.height,
      near,
      far,
    );

    const ZOOM_FACTOR = 2;
    this.camera.position.set(position.x, position.y, position.z * ZOOM_FACTOR);
    this.camera.lookAt(target.x, target.y, target.z);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);
  }

  initEnvironmentManager() {
    this.environment = new EnvironmentManager(this.scene);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((err) => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  addEvents() {
    window.addEventListener("resize", () => {
      this.width = this.container
        ? this.container.clientWidth
        : window.innerWidth;
      this.height = this.container
        ? this.container.clientHeight
        : window.innerHeight;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "t" || event.key === "T") {
        this.toggleFullscreen();
      }
    });

    window.addEventListener("click", () => {
      if (this.audio && !this.audio.isStarted) {
        this.audio.start();
      }
    });
  }

  start() {
    let frameCount = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      frameCount++;

      if (this.simulation) {
        this.simulation.update(frameCount);
        const stress = this.simulation.currentStress;
        const record = this.simulation.getCurrentRecord();

        if (this.environment) {
          this.environment.update(
            record,
            stress,
            frameCount,
            this.simulation.snapTriggered,
          );
        }

        if (this.avatar) {
          this.avatar.update(stress, frameCount);
        }

        if (this.bitacora) {
          this.bitacora.update(record, stress, {
            totalRecords: this.simulation.weatherData.length,
            currentIndex: this.simulation.currentIndex,
          });
        }

        if (this.audio && record.datetime) {
          this.audio.update(
            stress,
            record.temperature_180m,
            record.wind_speed_180m,
            this.simulation.snapTriggered,
            this.simulation.lastSnapFrame ? 0.25 : 0.0,
          );
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}
