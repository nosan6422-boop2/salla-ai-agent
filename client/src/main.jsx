import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import EmbeddedDashboard from './EmbeddedDashboard.jsx';

// 🔍 اكتشاف ما إذا كنا داخل Salla (Embedded) أم لا
const isEmbedded = window.location.pathname.startsWith('/embedded');

const RootComponent = isEmbedded ? EmbeddedDashboard : App;

console.log(`🚀 التطبيق يعمل في وضع: ${isEmbedded ? 'Embedded (Salla)' : 'Standalone'}`);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);