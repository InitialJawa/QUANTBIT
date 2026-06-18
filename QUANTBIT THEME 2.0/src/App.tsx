/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Market from './components/Markets';
import Portfolio from './components/Portfolio';
import Leaders from './components/Leaders';
import Simulasi from './components/Simulasi';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('leaders');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen selection:text-white bg-gray-50 dark:bg-[#050505] overflow-x-hidden flex flex-col transition-colors duration-500">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      
      <main className="flex-1 mt-32 md:mt-32 px-4 md:px-8 max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        <div className="lg:col-span-3 xl:col-span-2">
           <Sidebar />
        </div>
        
        <div className="lg:col-span-9 xl:col-span-10 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Market />
              </motion.div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div 
                key="portfolio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Portfolio />
              </motion.div>
            )}

            {activeTab === 'leaders' && (
              <motion.div 
                key="leaders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Leaders />
              </motion.div>
            )}

            {activeTab === 'simulasi' && (
              <motion.div 
                key="simulasi"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Simulasi />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
