/*
 * audio.js — Camada de som.
 *
 * Todos os sons passam por aqui:
 *     TD.audio.play('explosao')
 *
 * Por padrão os sons são sintetizados com Web Audio (sem arquivos). Para trocar um som por
 * um arquivo, adicione uma entrada em ARQUIVOS abaixo; se o arquivo não carregar, o som
 * sintetizado continua valendo.
 *
 * Navegadores de celular só liberam áudio depois de um toque: desbloquear() é chamado no
 * primeiro toque na tela.
 */
(function () {
  'use strict';
  const TD = window.TD;

  // ---------------------------------------------------------------------------
  // Arquivos de áudio (opcional). Exemplo:
  //   'explosao': { src: 'sons/explosao.mp3', volume: 0.8 },
  // volume: 0 a 1 (multiplicado pelo volume geral de config.js)
  // ---------------------------------------------------------------------------
  const ARQUIVOS = {
  };

  const sintetizadores = {}; // nome -> { tocar(ac, destino, t), intervaloMinimo }
  const arquivos = {};       // nome -> { base: HTMLAudioElement, volume, pronto }
  const ultimoDisparo = {};  // nome -> tempo (s) do último play, para não saturar

  let ac = null;          // AudioContext
  let mestre = null;      // ganho mestre
  let bufferRuido = null; // 1 s de ruído branco, reaproveitado
  let mudo = false;

  function registrar(nome, tocar, intervaloMinimo) {
    sintetizadores[nome] = { tocar, intervaloMinimo: intervaloMinimo !== undefined ? intervaloMinimo : 0.05 };
  }

  // Oscilador com envelope. o: { tipo, freq, freqFinal, duracao, volume, ataque, atraso }
  function tom(destino, t, o) {
    const inicio = t + (o.atraso || 0);
    const osc = ac.createOscillator();
    const ganho = ac.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.freq, inicio);
    if (o.freqFinal) osc.frequency.exponentialRampToValueAtTime(o.freqFinal, inicio + o.duracao);
    const ataque = o.ataque || 0.005;
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(o.volume || 0.3, inicio + ataque);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + o.duracao);
    osc.connect(ganho);
    ganho.connect(destino);
    osc.start(inicio);
    osc.stop(inicio + o.duracao + 0.02);
  }

  // Ruído filtrado com envelope. o: { duracao, volume, filtro, freq, freqFinal, q, atraso }
  function ruido(destino, t, o) {
    const inicio = t + (o.atraso || 0);
    const fonte = ac.createBufferSource();
    fonte.buffer = bufferRuido;
    const filtro = ac.createBiquadFilter();
    filtro.type = o.filtro || 'lowpass';
    filtro.frequency.setValueAtTime(o.freq || 1000, inicio);
    if (o.freqFinal) filtro.frequency.exponentialRampToValueAtTime(o.freqFinal, inicio + o.duracao);
    filtro.Q.value = o.q || 1;
    const ganho = ac.createGain();
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(o.volume || 0.3, inicio + (o.ataque || 0.005));
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + o.duracao);
    fonte.connect(filtro);
    filtro.connect(ganho);
    ganho.connect(destino);
    fonte.start(inicio, Math.random() * 0.5);
    fonte.stop(inicio + o.duracao + 0.02);
  }

  function criarBufferRuido() {
    const tamanho = ac.sampleRate;
    const buffer = ac.createBuffer(1, tamanho, ac.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ===========================================================================
  // API pública
  // ===========================================================================
  TD.audio = {
    registrar,

    // Prepara os arquivos (se houver) e aplica a preferência de mudo.
    iniciar(comecarMudo) {
      mudo = !!comecarMudo;
      Object.keys(ARQUIVOS).forEach((nome) => {
        const def = ARQUIVOS[nome];
        const base = new Audio();
        const registro = { base, volume: def.volume !== undefined ? def.volume : 1, pronto: false };
        base.preload = 'auto';
        base.addEventListener('canplaythrough', () => { registro.pronto = true; }, { once: true });
        base.addEventListener('error', () => console.warn('[audio] Falha ao carregar', def.src, '- usando som sintetizado.'));
        base.src = def.src;
        arquivos[nome] = registro;
      });
    },

    // Cria/retoma o AudioContext. Precisa ser chamado dentro de um evento de toque.
    desbloquear() {
      try {
        if (!ac) {
          const Contexto = window.AudioContext || window.webkitAudioContext;
          if (!Contexto) return;
          ac = new Contexto();
          mestre = ac.createGain();
          mestre.gain.value = mudo ? 0 : TD.config.audio.volumeGeral;
          mestre.connect(ac.destination);
          bufferRuido = criarBufferRuido();
          // Toca um silêncio curtíssimo: alguns iOS só liberam o áudio assim
          const silencio = ac.createBufferSource();
          silencio.buffer = ac.createBuffer(1, 1, 22050);
          silencio.connect(ac.destination);
          silencio.start(0);
        }
        if (ac.state === 'suspended') ac.resume();
      } catch (e) {
        console.warn('[audio] Web Audio indisponível:', e);
      }
    },

    // Suspende o áudio (app em segundo plano) e retoma depois.
    suspender() { if (ac && ac.state === 'running') ac.suspend(); },
    retomar() { if (ac && ac.state === 'suspended') ac.resume(); },

    play(nome) {
      if (mudo || !ac || ac.state !== 'running') return;
      const sint = sintetizadores[nome];
      const agora = ac.currentTime;
      const minimo = sint ? sint.intervaloMinimo : 0.05;
      if (ultimoDisparo[nome] !== undefined && agora - ultimoDisparo[nome] < minimo) return;
      ultimoDisparo[nome] = agora;

      const arquivo = arquivos[nome];
      if (arquivo && arquivo.pronto) {
        const copia = arquivo.base.cloneNode();
        copia.volume = TD.util.limitar(arquivo.volume * TD.config.audio.volumeGeral, 0, 1);
        copia.play().catch(() => {});
        return;
      }
      if (!sint) { console.warn('[audio] Som inexistente:', nome); return; }
      try { sint.tocar(mestre, agora); } catch (e) { /* um som com problema não pode travar o jogo */ }
    },

    definirMudo(valor) {
      mudo = !!valor;
      if (mestre) mestre.gain.setValueAtTime(mudo ? 0 : TD.config.audio.volumeGeral, ac.currentTime);
    },

    estaMudo() { return mudo; },
  };

  // ===========================================================================
  // SONS SINTETIZADOS
  // Cada função recebe (destino, t): conecte os nós em "destino" e comece em "t".
  // ===========================================================================

  // Disparo dos arqueiros: estalo curto de corda
  registrar('disparo_flecha', (d, t) => {
    tom(d, t, { tipo: 'triangle', freq: 900, freqFinal: 250, duracao: 0.08, volume: 0.12 });
    ruido(d, t, { filtro: 'highpass', freq: 3000, duracao: 0.05, volume: 0.06 });
  }, 0.06);

  // Disparo da balista: "tunc" grave de madeira
  registrar('disparo_virote', (d, t) => {
    tom(d, t, { tipo: 'square', freq: 180, freqFinal: 60, duracao: 0.14, volume: 0.12 });
    ruido(d, t, { filtro: 'bandpass', freq: 1500, duracao: 0.08, volume: 0.12, q: 2 });
  }, 0.08);

  // Disparo da catapulta: rangido + zunido
  registrar('disparo_pedra', (d, t) => {
    tom(d, t, { tipo: 'sawtooth', freq: 90, freqFinal: 50, duracao: 0.18, volume: 0.1 });
    ruido(d, t, { filtro: 'bandpass', freq: 400, freqFinal: 1600, duracao: 0.35, volume: 0.14, q: 3, ataque: 0.05 });
  }, 0.1);

  // Flecha/virote acertando
  registrar('impacto', (d, t) => {
    ruido(d, t, { filtro: 'highpass', freq: 1800, duracao: 0.05, volume: 0.1 });
    tom(d, t, { tipo: 'square', freq: 300, freqFinal: 120, duracao: 0.04, volume: 0.04 });
  }, 0.04);

  // Pedra explodindo
  registrar('explosao', (d, t) => {
    ruido(d, t, { filtro: 'lowpass', freq: 1200, freqFinal: 80, duracao: 0.5, volume: 0.35 });
    tom(d, t, { tipo: 'sine', freq: 110, freqFinal: 35, duracao: 0.4, volume: 0.35 });
  }, 0.08);

  // Inimigo derrotado
  registrar('morte', (d, t) => {
    tom(d, t, { tipo: 'square', freq: 420, freqFinal: 90, duracao: 0.18, volume: 0.07 });
    ruido(d, t, { filtro: 'bandpass', freq: 900, duracao: 0.12, volume: 0.06, q: 4 });
  }, 0.05);

  // Fantasma derrotado: lamento agudo
  registrar('morte_fantasma', (d, t) => {
    tom(d, t, { tipo: 'sine', freq: 900, freqFinal: 300, duracao: 0.3, volume: 0.08, ataque: 0.02 });
  }, 0.06);

  // Necromante derrotado
  registrar('morte_chefe', (d, t) => {
    tom(d, t, { tipo: 'sawtooth', freq: 200, freqFinal: 40, duracao: 1.2, volume: 0.2 });
    ruido(d, t, { filtro: 'lowpass', freq: 800, freqFinal: 60, duracao: 1.2, volume: 0.3 });
  }, 0.5);

  // Necromante invocando esqueletos
  registrar('invocacao', (d, t) => {
    tom(d, t, { tipo: 'sine', freq: 220, freqFinal: 440, duracao: 0.5, volume: 0.1, ataque: 0.1 });
    tom(d, t, { tipo: 'sine', freq: 233, freqFinal: 466, duracao: 0.5, volume: 0.08, ataque: 0.1 });
  }, 0.3);

  // Inimigo chegou ao portão
  registrar('perda_vida', (d, t) => {
    tom(d, t, { tipo: 'sine', freq: 160, duracao: 0.7, volume: 0.3 });
    tom(d, t, { tipo: 'sine', freq: 240, duracao: 0.5, volume: 0.15 });
    ruido(d, t, { filtro: 'lowpass', freq: 500, duracao: 0.2, volume: 0.2 });
  }, 0.15);

  // Construir / melhorar / vender / interface
  registrar('construir', (d, t) => {
    ruido(d, t, { filtro: 'bandpass', freq: 700, duracao: 0.06, volume: 0.2, q: 3 });
    ruido(d, t, { filtro: 'bandpass', freq: 600, duracao: 0.06, volume: 0.2, q: 3, atraso: 0.1 });
  }, 0.1);
  registrar('melhorar', (d, t) => {
    [523, 659, 784].forEach((f, i) => tom(d, t, { tipo: 'triangle', freq: f, duracao: 0.15, volume: 0.12, atraso: i * 0.07 }));
  }, 0.1);
  registrar('vender', (d, t) => {
    tom(d, t, { tipo: 'sine', freq: 1320, duracao: 0.12, volume: 0.1 });
    tom(d, t, { tipo: 'sine', freq: 1760, duracao: 0.2, volume: 0.1, atraso: 0.06 });
  }, 0.1);
  registrar('clique', (d, t) => {
    tom(d, t, { tipo: 'triangle', freq: 660, duracao: 0.05, volume: 0.08 });
  }, 0.03);
  registrar('negado', (d, t) => {
    tom(d, t, { tipo: 'square', freq: 150, duracao: 0.15, volume: 0.06 });
  }, 0.1);

  // Início de onda: trompa
  registrar('onda_inicio', (d, t) => {
    tom(d, t, { tipo: 'sawtooth', freq: 196, duracao: 0.25, volume: 0.1, ataque: 0.04 });
    tom(d, t, { tipo: 'sawtooth', freq: 262, duracao: 0.5, volume: 0.1, ataque: 0.04, atraso: 0.22 });
  }, 0.5);

  // Onda vencida
  registrar('onda_fim', (d, t) => {
    [392, 523].forEach((f, i) => tom(d, t, { tipo: 'triangle', freq: f, duracao: 0.25, volume: 0.12, atraso: i * 0.12 }));
  }, 0.5);

  // Vitória: fanfarra
  registrar('vitoria', (d, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tom(d, t, { tipo: 'triangle', freq: f, duracao: 0.35, volume: 0.15, atraso: i * 0.15 }));
    tom(d, t, { tipo: 'triangle', freq: 784, duracao: 0.8, volume: 0.12, atraso: 0.6 });
    tom(d, t, { tipo: 'triangle', freq: 1047, duracao: 0.8, volume: 0.12, atraso: 0.6 });
  }, 1);

  // Derrota: descida em tom menor
  registrar('derrota', (d, t) => {
    [392, 349, 311, 262].forEach((f, i) => tom(d, t, { tipo: 'sawtooth', freq: f, duracao: 0.45, volume: 0.08, atraso: i * 0.3 }));
  }, 1);
})();
