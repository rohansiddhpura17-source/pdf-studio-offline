import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentStore } from './state/useDocumentStore';
import { DocumentHome } from './features/document-home/DocumentHome';
import { EditorWorkspace } from './features/editor/EditorWorkspace';
import { ToastContainer } from './components/common/Toast';
import { CommandPalette } from './components/common/CommandPalette';
import { SettingsModal } from './features/settings/SettingsModal';
import { api } from './services/api';

const viewTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export const App: React.FC = () => {
  const { document, addToast } = useDocumentStore();

  useEffect(() => {
    // Check local backend health on startup
    api.checkHealth().then((isHealthy) => {
      if (!isHealthy) {
        addToast({
          type: 'warning',
          title: 'Backend Connecting',
          message: 'Ensure the local Python backend is running on http://127.0.0.1:8001',
        });
      }
    });
  }, [addToast]);

  return (
    <div className="min-h-screen bg-studio-bg font-sans antialiased text-studio-navy">
      <AnimatePresence mode="wait">
        {document ? (
          <motion.div key="editor" {...viewTransition} className="min-h-screen">
            <EditorWorkspace />
          </motion.div>
        ) : (
          <motion.div key="home" {...viewTransition} className="min-h-screen">
            <DocumentHome />
          </motion.div>
        )}
      </AnimatePresence>
      <CommandPalette />
      <ToastContainer />
      <SettingsModal />
    </div>
  );
};

export default App;
