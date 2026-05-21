import { useState } from 'react';

const NGROK_URL = 'https://apply-starring-harvest.ngrok-free.dev';

export default function WhatsAppConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${NGROK_URL}/api/whatsapp/scan`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      setMessage(data.message);

      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${NGROK_URL}/api/whatsapp/status`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
          });
          
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.ready) {
              setConnected(true);
              setMessage('✅ WhatsApp Connected');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 2000);

      setTimeout(() => clearInterval(interval), 60000);
    } catch (error: any) {
      console.error('Connect error:', error);
      setMessage('❌ Error: ' + (error.message || 'Failed to connect'));
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '30px', textAlign: 'center', maxWidth: '400px' }}>
      <h2>📱 WhatsApp Web</h2>
      {connected ? (
        <div
          style={{
            color: '#22c55e',
            fontSize: '20px',
            padding: '20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            marginTop: '20px',
          }}
        >
          ✅ Connected
        </div>
      ) : (
        <>
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#25d366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '20px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Connecting...' : '📱 Connect WhatsApp'}
          </button>
          {message && (
            <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>{message}</p>
          )}
          <p style={{ marginTop: '30px', fontSize: '12px', color: '#999' }}>
            💡 When you click the button, look at the TERMINAL (the black window) and you'll see a QR
            code. Scan it with WhatsApp.
          </p>
        </>
      )}
    </div>
  );
}
