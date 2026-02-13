import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PROMETHEUS_URL = process.env.PROM_URL!;

export async function queryPrometheus(query: string) {
  const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
    params: { query },
  });

  return res.data.data.result;
}
