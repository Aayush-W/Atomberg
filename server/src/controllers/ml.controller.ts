import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_UNAVAILABLE = { error: { code: 'ML_UNAVAILABLE', message: 'AI insights temporarily unavailable.' } };

async function callML(path: string, data?: object) {
  return axios.post(`${ML_URL}${path}`, data, { timeout: 10000 });
}

export const predictAchievement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/predict-achievement', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const goalQuality = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/goal-quality', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const getAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get(`${ML_URL}/anomalies`, { params: req.query, timeout: 10000 });
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const suggestThrustArea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await callML('/suggest-thrust-area', req.body);
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};

export const sentimentTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get(`${ML_URL}/sentiment-trends`, { params: req.query, timeout: 10000 });
    res.json(data);
  } catch { res.status(503).json(ML_UNAVAILABLE); }
};
