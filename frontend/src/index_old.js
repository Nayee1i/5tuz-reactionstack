import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1> Tomsk Hackathon 2026</h1>
      <h2>Performance Review System</h2>
      <p>Система мониторинга развития технических навыков</p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>✅ Система работает!</h3>
        <p>Backend: <a href="http://159.194.230.135:3001/api/health">http://159.194.230.135:3001/api/health</a></p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);