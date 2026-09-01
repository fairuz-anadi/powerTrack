require('dotenv').config();
const ngrok = require('@ngrok/ngrok');

async function start() {
  try {
    const authtoken = process.env.NGROK_AUTHTOKEN;
    if (!authtoken) {
      console.warn('Warning: NGROK_AUTHTOKEN is not set in .env. Attempting with local ngrok configuration...');
    }
    const opts = { addr: Number(process.env.PORT) || 3000 };
    if (authtoken) opts.authtoken = authtoken;

    const listener = await ngrok.forward(opts);
    console.log(`=======================================================`);
    console.log(`NGROK TUNNEL ACTIVE: ${listener.url()}`);
    console.log(`Forwarding to http://localhost:${opts.addr}`);
    console.log(`=======================================================`);

    // Keep process alive indefinitely
    setInterval(() => {}, 60000);
  } catch (err) {
    console.error('Ngrok start error:', err.message || err);
  }
}

start();
