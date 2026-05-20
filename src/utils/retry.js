import axios from 'axios';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithRetry = async (url, retries = 3, timeout = 5000) => {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout,
        validateStatus: () => true,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'WebsiteMonitor/1.0',
          'Connection': 'close'
        }
      });

      return res;

    } catch (err) {
      lastError = err;

      if (err.response && err.response.status < 500) {
        throw err;
      }

      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        await delay(waitTime);
      }
    }
  }

  throw lastError;
};