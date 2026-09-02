/**
 * FACHADA INTEGRADORA DEL ENTORNO
 */
/**
 * FACHADA INTEGRADORA DEL ENTORNO
 */
import { TejidoUrbano } from "./TejidoUrbano.js";
import { MasaTectonica } from "./MasaTectonica.js";
import { EstratoAtmosferico } from "./EstratoAtmosferico.js";

export class EnvironmentManager {
  constructor(scene, camera, initialRecord = null) {
    this.scene = scene;
    this.camera = camera;

    /* this.tejidoUrbano = new TejidoUrbano(scene); */
    this.masaTectonica = new MasaTectonica(scene, camera, initialRecord);
    this.estratoAtmosferico = new EstratoAtmosferico(
      scene,
      camera,
      initialRecord,
    );
  }

  update(record, stress, frameCount, isSnap = false) {
    const windSpeed = record ? record.wind_speed_180m : 12.0;
    const relativeHumidity = record ? record.relative_humidity_2m : 0.65;

    /* this.tejidoUrbano.update(stress, frameCount); */
    this.masaTectonica.update(record, stress, frameCount, isSnap);
    this.estratoAtmosferico.update(record, frameCount);
  }
}
