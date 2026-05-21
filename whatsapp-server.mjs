import express from 'express';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import cors from 'cors';

const { Client, LocalAuth } = pkg;
const app = express();

let client = null;
let isReady = false;

app.use(cors());
app.use(express.json());

// ===== ENDPOINT 1: VER ESTADO =====
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ ready: isReady });
});

// ===== ENDPOINT 2: INICIAR ESCANEO =====
app.get('/api/whatsapp/scan', (req, res) => {
  // Si ya está conectado, no hagas nada
  if (client && isReady) {
    res.json({ message: '✅ Ya estás conectado', ready: true });
    return;
  }

  console.log('🤖 Inicializando WhatsApp...');

  // Crear nuevo cliente
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'lesucree-bot' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  // Cuando aparezca el QR
  client.on('qr', (qr) => {
    console.log('\n\n📱 ========================================');
    console.log('ESCANEA ESTE QR CON WHATSAPP');
    console.log('========================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n========================================\n');
  });

  // Cuando se autentique
  client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado y guardado');
  });

  // Cuando esté listo
  client.on('ready', () => {
    isReady = true;
    console.log('✅ ¡WhatsApp Bot Listo!\n');
  });

  // Si falla
  client.on('auth_failure', (msg) => {
    console.error('❌ Error:', msg);
  });

  // Si se desconecta
  client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ WhatsApp desconectado');
  });

  // Iniciar el cliente
  client.initialize().catch(err => {
    console.error('❌ Error inicializando:', err);
  });

  res.json({ message: '⏳ Escanea el QR que aparecerá en esta terminal en 3 segundos...' });
});

// ===== ENDPOINT 3: ENVIAR MENSAJE =====
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    if (!client || !isReady) {
      return res.status(500).json({ 
        error: 'WhatsApp no está conectado. Escanea primero.' 
      });
    }

    const { phone, message } = req.body;

    // Limpiar número de teléfono
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = cleanPhone + '@c.us';

    // Enviar mensaje
    await client.sendMessage(chatId, message);

    console.log(`📤 Mensaje enviado a ${phone}`);
    res.json({ success: true, message: 'Mensaje enviado correctamente' });

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== INICIAR SERVIDOR =====
app.listen(3001, () => {
  console.log('🚀 ========================================');
  console.log('Servidor WhatsApp escuchando en puerto 3001');
  console.log('========================================\n');
  console.log('📝 Próximos pasos:');
  console.log('1. Abre http://localhost:5173');
  console.log('2. Busca el botón "Conectar WhatsApp"');
  console.log('3. Haz click');
  console.log('4. Escanea el QR que aparecerá aquí\n');
});