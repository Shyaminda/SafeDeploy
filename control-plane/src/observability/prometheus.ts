import axios from "axios";
import { env } from "../config/env.js";

export async function queryPrometheus(query: string): Promise<any> {
  const res = await axios.get(`${env.PROM_URL}/api/v1/query`, {
    params: { query },
  });

  return res.data.data.result;
}
