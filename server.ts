import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'AF FIXING', timestamp: new Date().toISOString() });
  });

  // Payment gateway status check (never exposes RAZORPAY_KEY_SECRET)
  app.get('/api/payments/config', (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
    const razorpayConfigured = Boolean(keyId && keySecret);
    res.json({
      razorpayConfigured,
      keyId: razorpayConfigured ? keyId : null,
      supportedMethods: razorpayConfigured
        ? ['Cash', 'UPI', 'Online']
        : ['Cash', 'UPI'],
    });
  });

  // Real Razorpay Order Creation (no simulated success)
  app.post('/api/payments/create-order', async (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';

    if (!keyId || !keySecret) {
      res.status(503).json({
        error: 'ONLINE_GATEWAY_NOT_CONFIGURED',
        message:
          'Online payment gateway credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Please select Cash or UPI on completion.',
      });
      return;
    }

    const { amountInr, bookingId, receipt } = req.body as {
      amountInr?: number;
      bookingId?: string;
      receipt?: string;
    };

    if (
      typeof amountInr !== 'number' ||
      !Number.isFinite(amountInr) ||
      amountInr < 1 ||
      amountInr > 500000 ||
      typeof bookingId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(bookingId)
    ) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'Valid amountInr and bookingId are required.' });
      return;
    }

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amountInr * 100),
          currency: 'INR',
          receipt: (receipt || `af_${bookingId}`).slice(0, 40),
          notes: { bookingId, platform: 'AF FIXING' },
        }),
      });

      const payload = (await rzpResponse.json()) as Record<string, unknown>;
      if (!rzpResponse.ok) {
        res.status(rzpResponse.status).json({
          error: 'GATEWAY_ERROR',
          message: 'Unable to create Razorpay order.',
          details: payload,
        });
        return;
      }

      res.json({
        orderId: payload.id,
        amount: payload.amount,
        currency: payload.currency,
        keyId,
      });
    } catch (error) {
      console.error('Razorpay order error:', error);
      res.status(502).json({
        error: 'GATEWAY_UNREACHABLE',
        message: 'Could not connect to Razorpay API.',
      });
    }
  });

  // Real Razorpay HMAC-SHA256 Signature Verification
  app.post('/api/payments/verify', (req, res) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
    if (!keySecret) {
      res.status(503).json({
        error: 'ONLINE_GATEWAY_NOT_CONFIGURED',
        message: 'Razorpay verification is unavailable because credentials are not configured.',
      });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      res.status(400).json({ verified: false, error: 'INVALID_PAYLOAD' });
      return;
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(razorpay_signature, 'utf8');
    const verified =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!verified) {
      res.status(400).json({ verified: false, error: 'INVALID_SIGNATURE' });
      return;
    }

    res.json({ verified: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AF FIXING server running on http://0.0.0.0:${PORT}`);
  });
}

void createApp();
