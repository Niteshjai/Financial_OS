import axios from 'axios';

const PYTHON_SERVICE = process.env.PYTHON_SERVICE_URL || 'http://python-service:8001';

export async function generatePDFReport(data: object): Promise<Buffer> {
  const response = await axios.post(
    `${PYTHON_SERVICE}/internal/reports/generate`,
    data,
    { responseType: 'arraybuffer', timeout: 30000 }
  );
  return Buffer.from(response.data);
}

export async function aggregateNetWorth(snapshots: object[]): Promise<object> {
  const response = await axios.post(
    `${PYTHON_SERVICE}/internal/analytics/aggregate`,
    snapshots,
    { timeout: 10000 }
  );
  return response.data;
}
