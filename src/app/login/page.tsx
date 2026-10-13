'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();

  // Estados de red e IP (HU-04)
  const [checkingNetwork, setCheckingNetwork] = useState(true);
  const [isAllowedIp, setIsAllowedIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState('');
  const [networkMessage, setNetworkMessage] = useState('');

  // Estados del formulario y autenticación
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'verifying' | 'authorized' | 'denied'>('idle');
  const [loginError, setLoginError] = useState<{ title: string; desc: string } | null>(null);
  const [shakeCard, setShakeCard] = useState(false);

  // 1. Cargar y verificar red al iniciar
  useEffect(() => {
    verifyNetwork();
  }, []);

  const verifyNetwork = async () => {
    try {
      setCheckingNetwork(true);
      const res = await authService.checkNetwork();
      setIsAllowedIp(res.isAllowed);
      setDetectedIp(res.ipDetected);
      setNetworkMessage(res.message);
    } catch (error: any) {
      setIsAllowedIp(false);
      setDetectedIp(error?.data?.ipDetected || '187.190.22.40');
      setNetworkMessage(
        error?.message || 'BLOQUEO POR RESTRICCIÓN DE RED (IP EXTERNA)'
      );
    } finally {
      setCheckingNetwork(false);
    }
  };

  // Efecto de sacudida en tarjeta ante error
  const triggerShake = () => {
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);
  };

  // 2. Procesar Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!nombreUsuario || !password) {
      setLoginError({
        title: 'Campos Incompletos',
        desc: 'Por favor ingresa tu usuario y contraseña.',
      });
      triggerShake();
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginStatus('verifying');

      const res = await authService.login({
        nombreUsuario: nombreUsuario.trim(),
        password,
      });

      if (res.success) {
        setLoginStatus('authorized');
        setTimeout(() => {
          router.push('/pos');
        }, 600);
      } else {
        setLoginStatus('denied');
        const isNetworkBlock =
          res.message?.toLowerCase().includes('red local') ||
          res.message?.toLowerCase().includes('ip');

        setLoginError({
          title: isNetworkBlock
            ? 'Bloqueo por Restricción de Red (IP Externa)'
            : 'Acceso Denegado',
          desc:
            res.message ||
            'El usuario o la contraseña ingresados no coinciden.',
        });
        triggerShake();
      }
    } catch (error: any) {
      setLoginStatus('denied');
      setLoginError({
        title: 'Error de Autenticación',
        desc:
          error?.message ||
          'Error al conectar con el servidor de seguridad.',
      });
      triggerShake();
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Presets para pruebas rápidas de demostración
  const cargarPreset = (tipo: 'admin' | 'vendedor_ok' | 'vendedor_bloqueo') => {
    setLoginError(null);
    if (tipo === 'admin') {
      setNombreUsuario('admin');
      setPassword('admin123');
    } else if (tipo === 'vendedor_ok') {
      setIsAllowedIp(true);
      setDetectedIp('192.168.1.105');
      setNetworkMessage('Red Autorizada (Red Local del Cine)');
      setNombreUsuario('Raul');
      setPassword('123456');
    } else if (tipo === 'vendedor_bloqueo') {
      setIsAllowedIp(false);
      setDetectedIp('187.190.22.40');
      setNetworkMessage(
        'El rol Vendedor solo tiene autorización de operar conectado a la red local del cine (192.168.1.105). IP detectada: 187.190.22.40.'
      );
      setNombreUsuario('Raul');
      setPassword('123456');
    }
  };

  return (
    <>
      {/* Cargar FontAwesome y Google Fonts dinámicamente */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* Animación de Shake para error */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      <main className="bg-[#050505] text-[#f3f4f6] antialiased min-h-screen flex items-center justify-center p-4 relative overflow-x-hidden selection:bg-[#D81B60] selection:text-white font-['Montserrat',sans-serif]">
        {/* Fondos y Efectos Decorativos de la Maqueta */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519114056088-b877fe073a5e?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-15 bg-fixed blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-[#050505]/50" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0288D1] via-[#D81B60] to-[#F57C00] z-10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D81B60]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-20 w-full max-w-lg">
          {/* Tarjeta Principal de Login */}
          <div
            id="login-card"
            className={`bg-[#111111]/95 backdrop-blur-xl border border-[#262626] rounded-3xl p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-300 ${
              shakeCard ? 'animate-shake' : ''
            }`}
          >
            {/* Encabezado Logo / Título */}
            <div className="text-center mb-6 relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#050505] border border-[#262626] mb-3 shadow-inner">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmU78ReuLCf8T4T3Rv6K8-yAB13kXuZX7_TQ&s"
                  alt="Jilotepec"
                  className="object-cover grayscale brightness-125 rounded-full h-[42px] w-[42px]"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-black tracking-widest uppercase text-white leading-none">
                Xilotzin
              </h1>
              <p className="text-[8px] sm:text-[9px] font-bold tracking-[0.25em] sm:tracking-[0.3em] text-[#F57C00] uppercase mt-2">
                Control de Acceso & Roles
              </p>
            </div>

            {/* Banner de Diagnóstico de Seguridad e IP Detectada (HU-04) */}
            <div className="bg-[#050505] border border-[#262626] rounded-2xl p-3 sm:p-3.5 mb-6 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-['Space_Mono',monospace]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    checkingNetwork
                      ? 'bg-amber-500 animate-pulse'
                      : isAllowedIp
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-red-500 animate-ping'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-[#a3a3a3] uppercase font-bold tracking-wider">
                    Red Detectada:
                  </span>
                  <span className="text-white font-bold text-[11px] sm:text-xs truncate">
                    {checkingNetwork
                      ? 'Verificando red...'
                      : `${detectedIp} (${isAllowedIp ? 'Red Local del Cine' : 'Red Externa / Domicilio'})`}
                  </span>
                </div>
              </div>
              <span
                className={`text-[8px] sm:text-[9px] font-bold uppercase px-2 py-0.5 rounded border self-start sm:self-auto ${
                  checkingNetwork
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : isAllowedIp
                    ? 'bg-green-950 text-green-400 border-green-800'
                    : 'bg-red-950 text-red-400 border-red-800'
                }`}
              >
                {checkingNetwork
                  ? 'Diagnosticando'
                  : isAllowedIp
                  ? 'Red Autorizada'
                  : 'Zona No Autorizada'}
              </span>
            </div>

            {/* Banner de Error / Bloqueo por Políticas de Seguridad */}
            {loginError && (
              <div className="bg-red-950/40 border border-red-500/60 text-red-300 text-xs font-medium p-4 rounded-xl mb-6 flex items-start gap-3 animate-fadeIn">
                <i className="fa-solid fa-shield-virus text-red-400 text-lg mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-white uppercase text-[11px] mb-0.5">
                    {loginError.title}
                  </span>
                  <span className="leading-relaxed text-[11px]">
                    {loginError.desc}
                  </span>
                </div>
              </div>
            )}

            {/* Formulario de Inicio de Sesión */}
            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5 ml-1">
                  Usuario / Perfil
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-user text-[#a3a3a3]/50" />
                  </div>
                  <input
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    placeholder="admin o vendedor"
                    required
                    disabled={isLoggingIn}
                    className="w-full bg-[#050505] text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-[#262626] focus:outline-none focus:border-[#D81B60] transition-all font-sans disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-1.5 ml-1">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-[#a3a3a3]/50" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoggingIn}
                    className="w-full bg-[#050505] text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-[#262626] focus:outline-none focus:border-[#D81B60] transition-all font-sans tracking-widest disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || checkingNetwork}
                className={`w-full text-white font-black py-4 rounded-xl uppercase tracking-widest mt-2 transition-all shadow-lg flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 ${
                  loginStatus === 'authorized'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                    : 'bg-gradient-to-r from-[#D81B60] to-[#F57C00] hover:from-pink-600 hover:to-orange-500'
                }`}
              >
                {loginStatus === 'verifying' ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>VERIFICANDO SEGURIDAD...</span>
                  </>
                ) : loginStatus === 'authorized' ? (
                  <>
                    <i className="fa-solid fa-check" />
                    <span>AUTORIZADO - INGRESANDO...</span>
                  </>
                ) : (
                  <>
                    <span>Validar e Ingresar</span>
                    <i className="fa-solid fa-arrow-right-to-bracket" />
                  </>
                )}
              </button>
            </form>

       
          </div>

          {/* Enlace de Retorno */}
          <div className="text-center mt-6">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs font-bold text-[#a3a3a3] hover:text-white uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Regresar al Sitio Público del Cine</span>
            </a>
          </div>
        </div>
      </main>
    </>
  );
}