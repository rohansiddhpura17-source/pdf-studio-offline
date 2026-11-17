import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useDocumentStore } from './state/useDocumentStore';
import { useEditStore } from './state/useEditStore';

if (typeof window !== 'undefined') {
  (window as any).useDocumentStore = useDocumentStore;
  (window as any).useEditStore = useEditStore;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
