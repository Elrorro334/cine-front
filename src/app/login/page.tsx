'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

const DEMO_EXTERNAL_IP = '187.190.22.40';

export default function LoginPage() {
  const router = useRouter();

  const [checkingNetwork, setCheckingNetwork] = useState(true);
  const [isAllowedIp, setIsAllowedIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState('');
  const [networkMessage, setNetworkMessage] = useState('');

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'verifying' | 'authorized' | 'denied'>('idle');
  const [loginError, setLoginError] = useState<{ title: string; desc: string } | null>(null);
  const [shakeCard, setShakeCard] = useState(false);

  useEffect(() => {
    void verifyNetwork();
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
      setDetectedIp(error?.data?.ipDetected || DEMO_EXTERNAL_IP);
      setNetworkMessage(error?.message || 'BLOQUEO POR RESTRICCIÓN DE RED (IP EXTERNA)');
    } finally {
      setCheckingNetwork(false);
    }
  };

  const triggerShake = () => {
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);

    if (!nombreUsuario || !password) {
      setLoginError({ title: 'Campos Incompletos', desc: 'Por favor ingresa tu usuario y contraseña.' });
      triggerShake();
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginStatus('verifying');

      const res = await authService.login({ nombreUsuario: nombreUsuario.trim(), password });

      if (res.success) {
        setLoginStatus('authorized');
        setTimeout(() => {
          router.push('/pos');
        }, 600);
      } else {
        setLoginStatus('denied');
        const isNetworkBlock = res.message?.toLowerCase().includes('red local') || res.message?.toLowerCase().includes('ip');
        setLoginError({
          title: isNetworkBlock ? 'Bloqueo por Restricción de Red (IP Externa)' : 'Acceso Denegado',
          desc: res.message || 'El usuario o la contraseña ingresados no coinciden.',
        });
        triggerShake();
      }
    } catch (error: any) {
      setLoginStatus('denied');
      setLoginError({
        title: 'Error de Autenticación',
        desc: error?.message || 'Error al conectar con el servidor de seguridad.',
      });
      triggerShake();
    } finally {
      setIsLoggingIn(false);
    }
  };

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
    } else {
      setIsAllowedIp(false);
      setDetectedIp(DEMO_EXTERNAL_IP);
      setNetworkMessage('Bloqueo por IP externa asignada.');
      setNombreUsuario('Raul');
      setPassword('123456');
    }
  };

  const getDotClassName = () => {
    if (checkingNetwork) return 'bg-amber-500 animate-pulse';
    if (isAllowedIp) return 'bg-green-500 animate-pulse';
    return 'bg-red-500 animate-ping';
  };

  const getTagClassName = () => {
    if (checkingNetwork) return 'bg-amber-950 text-amber-400 border-amber-800';
    if (isAllowedIp) return 'bg-green-950 text-green-400 border-green-800';
    return 'bg-red-950 text-red-400 border-red-800';
  };

  const getButtonBg = () => {
    if (loginStatus === 'authorized') return 'bg-gradient-to-r from-green-600 to-emerald-500';
    return 'bg-gradient-to-r from-[#D81B60] to-[#F57C00] hover:from-pink-600 hover:to-orange-500';
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <main className="bg-[#050505] text-[#f3f4f6] min-h-screen flex items-center justify-center p-4 relative font-['Montserrat',sans-serif]">
        <div className="relative z-20 w-full max-w-lg">
          <div className={`bg-[#111111]/95 border border-[#262626] rounded-3xl p-5 sm:p-8 shadow-2xl relative ${shakeCard ? 'animate-shake' : ''}`}>
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-white">Xilotzin</h1>
              <p className="text-[9px] font-bold text-[#F57C00] uppercase mt-1">Control de Acceso & Roles</p>
            </div>

            <div className="bg-[#050505] border border-[#262626] rounded-2xl p-3 mb-6 text-xs flex justify-between font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${getDotClassName()}`} />
                <span className="text-white font-bold">{checkingNetwork ? 'Verificando red...' : `${detectedIp}`}</span>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getTagClassName()}`}>
                {checkingNetwork ? 'Diagnosticando' : isAllowedIp ? 'Red Autorizada' : 'Zona No Autorizada'}
              </span>
            </div>

            {loginError && (
              <div className="bg-red-950/40 border border-red-500/60 text-red-300 text-xs p-4 rounded-xl mb-6 flex gap-3">
                <i className="fa-solid fa-shield-virus text-red-400 text-lg shrink-0" />
                <div>
                  <span className="font-bold text-white uppercase text-[11px] block">{loginError.title}</span>
                  <span className="text-[11px]">{loginError.desc}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="userInput" className="block text-[10px] font-bold text-[#a3a3a3] uppercase mb-1">Usuario / Perfil</label>
                <input
                  id="userInput"
                  type="text"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  placeholder="admin o vendedor"
                  disabled={isLoggingIn}
                  className="w-full bg-[#050505] text-white px-4 py-3 text-sm rounded-xl border border-[#262626] focus:outline-none focus:border-[#D81B60]"
                />
              </div>

              <div>
                <label htmlFor="passInput" className="block text-[10px] font-bold text-[#a3a3a3] uppercase mb-1">Contraseña</label>
                <input
                  id="passInput"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                  className="w-full bg-[#050505] text-white px-4 py-3 text-sm rounded-xl border border-[#262626] focus:outline-none focus:border-[#D81B60]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || checkingNetwork}
                className={`w-full text-white font-black py-4 rounded-xl uppercase flex justify-center items-center gap-2 ${getButtonBg()}`}
              >
                {loginStatus === 'verifying' ? (
                  <span>VERIFICANDO...</span>
                ) : loginStatus === 'authorized' ? (
                  <span>AUTORIZADO - INGRESANDO...</span>
                ) : (
                  <span>Validar e Ingresar</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#262626]">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => cargarPreset('admin')} className="bg-[#050505] text-white text-[10px] font-bold py-2 rounded-xl border border-[#262626]">Admin</button>
                <button type="button" onClick={() => cargarPreset('vendedor_ok')} className="bg-[#050505] text-green-400 text-[10px] font-bold py-2 rounded-xl border border-[#262626]">Vendedor OK</button>
                <button type="button" onClick={() => cargarPreset('vendedor_bloqueo')} className="bg-[#050505] text-red-400 text-[10px] font-bold py-2 rounded-xl border border-[#262626]">Bloqueo IP</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}