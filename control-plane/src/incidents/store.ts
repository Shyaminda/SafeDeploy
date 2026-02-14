import fs from "fs";
import path from "path";
import type { Incident } from "./incident.js";

const BASE = path.join(process.cwd(), "incidents");

export function saveIncident(incident: Incident): void {
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(
    path.join(BASE, `${incident.id}.json`),
    JSON.stringify(incident, null, 2)
  );
}

export function loadIncidents(): Incident[] {
  if (!fs.existsSync(BASE)) return [];

  return fs
    .readdirSync(BASE)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      JSON.parse(
        fs.readFileSync(path.join(BASE, file), "utf-8")
      ) as Incident
    );
}