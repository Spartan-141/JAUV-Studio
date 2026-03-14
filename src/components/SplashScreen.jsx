import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import iconoImg from '../../img/icono.png';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    // La pantalla dura 3.5 segundos en total antes de pedir ocultarse
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] bg-[#0f111a] flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <div className="relative flex flex-col items-center justify-center w-full max-w-lg">
        {/* Contenedor central para el Icono */}
        <div className="relative flex items-center justify-center w-full min-h-[120px]">
          {/* Icono animado entrando con escala desde el centro, saliendo con escala masiva */}
          <motion.img 
            src={iconoImg} 
            alt="Icono" 
            className="h-32 w-auto z-10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 30, opacity: 0 }} // Se agranda por toda la pantalla al final
            transition={{ 
              duration: 1, 
              ease: "easeOut",
              exit: { duration: 0.8, ease: "easeInOut" }
            }}
          />
        </div>

        {/* Barra de carga */}
        <motion.div 
          className="mt-8 w-48 h-1 bg-gray-800 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }} 
        >
          <motion.div 
            className="h-full bg-white rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 2.5, ease: "easeInOut" }} 
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
