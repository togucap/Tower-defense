/*
 * assets.js — Camada de sprites.
 *
 * Toda a arte do jogo passa por aqui:
 *     TD.assets.draw('balista_nv2', ctx, x, y, angulo, escala, opcoes)
 *
 * Convenções dos sprites:
 *   - (x, y) é o CENTRO do sprite, em px lógicos.
 *   - Ângulo 0 = virado para a DIREITA (+x). O ângulo cresce no sentido horário (y para baixo).
 *   - "opcoes" é um objeto livre com dados extras (nível de vida, tamanho da estrada etc.).
 *
 * Para trocar um desenho por PNG, basta adicionar uma entrada em IMAGENS abaixo.
 * Se a imagem carregar, ela é usada; se falhar, o desenho em código continua valendo.
 */
(function () {
  'use strict';
  const TD = window.TD;

  // ---------------------------------------------------------------------------
  // Imagens externas (opcional). Exemplo:
  //   'balista_nv2': { src: 'img/balista_nv2.png', largura: 40, altura: 40 },
  //   'chao':        { src: 'img/mapa.png', largura: 360, altura: 640, ancoraX: 0, ancoraY: 0 },
  // largura/altura: tamanho em px lógicos em que a imagem é desenhada.
  // ancoraX/ancoraY: ponto da imagem que fica em (x, y); 0.5 = centro (padrão).
  // ---------------------------------------------------------------------------
  const IMAGENS = {
  };

  const desenhos = {}; // nome -> function (ctx, opcoes) desenhando centrado em (0, 0)
  const imagens = {};  // nome -> { img, largura, altura, ancoraX, ancoraY, pronta }
  const avisados = {}; // sprites inexistentes já avisados no console

  function registrar(nome, funcao) {
    desenhos[nome] = funcao;
  }

  // Retângulo de cantos arredondados (ctx.roundRect ainda não existe em todos os aparelhos).
  function retanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function circulo(ctx, x, y, r, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function elipse(ctx, x, y, rx, ry, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function poligono(ctx, pontos, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(pontos[0], pontos[1]);
    for (let i = 2; i < pontos.length; i += 2) ctx.lineTo(pontos[i], pontos[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  // ===========================================================================
  // API pública
  // ===========================================================================
  TD.assets = {
    registrar,
    retanguloArredondado,

    // Carrega as imagens de IMAGENS e chama aoTerminar quando todas terminarem (com ou sem erro).
    carregar(aoTerminar) {
      const nomes = Object.keys(IMAGENS);
      let pendentes = nomes.length;
      if (!pendentes) { aoTerminar(); return; }
      nomes.forEach((nome) => {
        const def = IMAGENS[nome];
        const img = new Image();
        const registro = {
          img,
          largura: def.largura,
          altura: def.altura,
          ancoraX: def.ancoraX !== undefined ? def.ancoraX : 0.5,
          ancoraY: def.ancoraY !== undefined ? def.ancoraY : 0.5,
          pronta: false,
        };
        imagens[nome] = registro;
        const concluir = () => { if (--pendentes === 0) aoTerminar(); };
        img.onload = () => { registro.pronta = true; concluir(); };
        img.onerror = () => { console.warn('[assets] Falha ao carregar', def.src, '- usando desenho em código.'); concluir(); };
        img.src = def.src;
      });
    },

    existe(nome) {
      return !!(desenhos[nome] || (imagens[nome] && imagens[nome].pronta));
    },

    // Desenha um sprite centrado em (x, y), girado e escalado.
    draw(nome, ctx, x, y, angulo, escala, opcoes) {
      const imagem = imagens[nome];
      const funcao = desenhos[nome];
      ctx.save();
      ctx.translate(x, y);
      if (angulo) ctx.rotate(angulo);
      if (escala && escala !== 1) ctx.scale(escala, escala);
      if (imagem && imagem.pronta) {
        ctx.drawImage(imagem.img, -imagem.largura * imagem.ancoraX, -imagem.altura * imagem.ancoraY,
          imagem.largura, imagem.altura);
      } else if (funcao) {
        funcao(ctx, opcoes || {});
      } else {
        // Sprite inexistente: quadrado magenta para chamar atenção.
        if (!avisados[nome]) { avisados[nome] = true; console.warn('[assets] Sprite inexistente:', nome); }
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-8, -8, 16, 16);
      }
      ctx.restore();
    },
  };

  // ===========================================================================
  // CENÁRIO
  // ===========================================================================

  // Gramado de fundo. Desenhado a partir do canto superior esquerdo (0, 0).
  // opcoes: { largura, altura, semente }
  registrar('chao', (ctx, o) => {
    const w = o.largura, h = o.altura;
    const rnd = TD.util.aleatorioComSemente(o.semente || 1);
    ctx.fillStyle = '#5d8a3c';
    ctx.fillRect(0, 0, w, h);
    // Manchas grandes de tons diferentes
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(35,70,25,0.18)' : 'rgba(150,190,85,0.12)';
      ctx.beginPath();
      ctx.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 40, 12 + rnd() * 25, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tufos de grama
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 550; i++) {
      const x = rnd() * w, y = rnd() * h;
      ctx.strokeStyle = rnd() < 0.6 ? 'rgba(35,65,20,0.5)' : 'rgba(160,200,95,0.45)';
      ctx.beginPath();
      ctx.moveTo(x - 2, y); ctx.lineTo(x - 3, y - 4);
      ctx.moveTo(x, y); ctx.lineTo(x, y - 5);
      ctx.moveTo(x + 2, y); ctx.lineTo(x + 3, y - 4);
      ctx.stroke();
    }
    // Florzinhas
    const coresFlor = ['#f2e36b', '#ffffff', '#d77fb0'];
    for (let i = 0; i < 45; i++) {
      circulo(ctx, rnd() * w, rnd() * h, 1.3, coresFlor[Math.floor(rnd() * coresFlor.length)]);
    }
  });

  // Estrada de terra seguindo os pontos do caminho (coordenadas absolutas; desenhe em 0, 0).
  // opcoes: { pontos: [{x, y}], largura, semente }
  registrar('estrada', (ctx, o) => {
    const p = o.pontos, L = o.largura;
    const rnd = TD.util.aleatorioComSemente(o.semente || 3);
    const tracar = () => {
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    tracar(); ctx.strokeStyle = 'rgba(40,28,12,0.35)'; ctx.lineWidth = L + 8; ctx.stroke(); // sombra
    tracar(); ctx.strokeStyle = '#7a5732'; ctx.lineWidth = L + 2; ctx.stroke();             // borda
    tracar(); ctx.strokeStyle = '#a47c4c'; ctx.lineWidth = L - 4; ctx.stroke();             // terra
    tracar(); ctx.strokeStyle = 'rgba(205,170,115,0.3)'; ctx.lineWidth = L * 0.35; ctx.stroke(); // centro gasto
    // Pedrinhas espalhadas ao longo da estrada
    for (let i = 1; i < p.length; i++) {
      const ax = p[i - 1].x, ay = p[i - 1].y, bx = p[i].x, by = p[i].y;
      const comp = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / comp, ny = (bx - ax) / comp; // normal do segmento
      for (let d = 0; d < comp; d += 7) {
        if (rnd() < 0.55) continue;
        const t = d / comp, lado = (rnd() - 0.5) * (L - 8);
        const x = ax + (bx - ax) * t + nx * lado, y = ay + (by - ay) * t + ny * lado;
        elipse(ctx, x, y, 1 + rnd() * 1.6, 0.8 + rnd() * 1.2, rnd() < 0.5 ? '#6f5334' : '#c2a276');
      }
    }
  });

  // Árvore vista de cima. opcoes: { variacao: 0..1 }
  registrar('arvore', (ctx, o) => {
    const v = o.variacao || 0;
    const escuro = v < 0.5 ? '#2c5a22' : '#34602a';
    const medio = v < 0.5 ? '#3d7c2d' : '#4a8233';
    const claro = v < 0.5 ? '#58a03e' : '#6aa84a';
    elipse(ctx, 4, 10, 15, 7, 'rgba(0,0,0,0.25)'); // sombra
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(-3, 2, 6, 10);                     // tronco
    circulo(ctx, 0, -2, 15, escuro);
    circulo(ctx, -6, -5, 10, medio);
    circulo(ctx, 6, -3, 10, medio);
    circulo(ctx, -1, -9, 8, claro);
    circulo(ctx, -4, -11, 3, 'rgba(255,255,255,0.18)'); // brilho
  });

  // Pedra no gramado.
  registrar('rocha', (ctx) => {
    elipse(ctx, 2, 5, 11, 5, 'rgba(0,0,0,0.25)');
    poligono(ctx, [-10, 4, -8, -4, -2, -8, 6, -7, 10, 0, 7, 5], '#8a867f');
    poligono(ctx, [-7, -3, -2, -7, 4, -6, 0, -2], '#aaa69e');
    ctx.strokeStyle = '#5e5a54';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-8, -4); ctx.lineTo(-2, -8); ctx.lineTo(6, -7);
    ctx.lineTo(10, 0); ctx.lineTo(7, 5); ctx.closePath();
    ctx.stroke();
  });

  // Marcador discreto de casa onde é possível construir.
  registrar('marcador_construcao', (ctx) => {
    ctx.fillStyle = 'rgba(70,50,25,0.08)';
    retanguloArredondado(ctx, -16, -16, 32, 32, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.22)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const a = 16, b = 9;
    ctx.beginPath();
    ctx.moveTo(-a, -b); ctx.lineTo(-a, -a); ctx.lineTo(-b, -a);
    ctx.moveTo(b, -a); ctx.lineTo(a, -a); ctx.lineTo(a, -b);
    ctx.moveTo(a, b); ctx.lineTo(a, a); ctx.lineTo(b, a);
    ctx.moveTo(-b, a); ctx.lineTo(-a, a); ctx.lineTo(-a, b);
    ctx.stroke();
  });

  // Névoa arroxeada no ponto de onde surgem os mortos-vivos.
  registrar('nevoa_entrada', (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
    g.addColorStop(0, 'rgba(45,20,60,0.75)');
    g.addColorStop(0.5, 'rgba(60,35,80,0.35)');
    g.addColorStop(1, 'rgba(60,35,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
  });

  // Castelo na parte de baixo do mapa, centrado.
  // opcoes: { largura, altura, portaoX (deslocamento horizontal do portão em relação ao centro) }
  registrar('castelo', (ctx, o) => {
    const L = o.largura || 360, A = o.altura || 80;
    const x0 = -L / 2, x1 = L / 2;
    const topoMuro = -A / 2 + 14, base = A / 2;
    const px = o.portaoX || 0;

    // Sombra projetada no gramado
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x0, topoMuro - 7, L, 7);

    // Muralha
    ctx.fillStyle = '#8f877b';
    ctx.fillRect(x0, topoMuro, L, base - topoMuro);
    ctx.fillStyle = '#a8a094';
    ctx.fillRect(x0, topoMuro, L, 3);
    ctx.strokeStyle = 'rgba(60,55,48,0.5)';
    ctx.lineWidth = 1;
    for (let y = topoMuro + 9, fila = 0; y < base + 9; y += 9, fila++) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      for (let x = x0 + (fila % 2 ? 8 : 0); x < x1; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    // Ameias da muralha
    ctx.fillStyle = '#9d958a';
    for (let x = x0; x < x1; x += 14) ctx.fillRect(x + 2, topoMuro - 7, 8, 7);

    // Torres
    const torre = (cx, largura, topo) => {
      ctx.fillStyle = '#827a6f';
      ctx.fillRect(cx - largura / 2, topo, largura, base - topo);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(cx + largura / 2 - 6, topo, 6, base - topo);
      ctx.strokeStyle = 'rgba(55,50,44,0.5)';
      for (let y = topo + 10; y < base; y += 10) {
        ctx.beginPath(); ctx.moveTo(cx - largura / 2, y); ctx.lineTo(cx + largura / 2, y); ctx.stroke();
      }
      ctx.fillStyle = '#948c80';
      const ameia = largura / 3;
      for (let i = 0; i < 3; i++) ctx.fillRect(cx - largura / 2 + i * ameia + 1, topo - 7, ameia - 4, 7);
      ctx.fillStyle = '#2a211a';
      ctx.fillRect(cx - 2, topo + 10, 4, 10); // seteira
    };
    const bandeira = (cx, topo) => {
      ctx.strokeStyle = '#3b2a1a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, topo - 7); ctx.lineTo(cx, topo - 24); ctx.stroke();
      poligono(ctx, [cx, topo - 24, cx + 15, topo - 20, cx, topo - 15], '#b3261e');
      circulo(ctx, cx + 5, topo - 20, 1.8, '#e8b923');
      ctx.lineWidth = 1;
    };
    torre(x0 + 17, 34, -A / 2 + 2);
    torre(x1 - 17, 34, -A / 2 + 2);
    torre(px - 80, 38, -A / 2 - 4);
    torre(px + 80, 38, -A / 2 - 4);
    bandeira(px - 80, -A / 2 - 4);
    bandeira(px + 80, -A / 2 - 4);

    // O portão é desenhado com a origem deslocada para px
    ctx.save();
    ctx.translate(px, 0);

    // Portão em arco
    const raio = 15, topoArco = topoMuro + 14;
    const arco = () => {
      ctx.beginPath();
      ctx.moveTo(-raio, base);
      ctx.lineTo(-raio, topoArco);
      ctx.arc(0, topoArco, raio, Math.PI, 0);
      ctx.lineTo(raio, base);
    };
    arco(); ctx.fillStyle = '#2b1f15'; ctx.fill();
    // Grade levadiça (meio erguida)
    ctx.strokeStyle = '#57504a';
    ctx.lineWidth = 2;
    for (let x = -10; x <= 10; x += 5) {
      ctx.beginPath(); ctx.moveTo(x, topoArco - Math.sqrt(raio * raio - x * x) + 1); ctx.lineTo(x, topoArco + 8); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-raio, topoArco + 2); ctx.lineTo(raio, topoArco + 2); ctx.stroke();
    // Moldura de pedra do arco
    arco(); ctx.strokeStyle = '#6b645a'; ctx.lineWidth = 4; ctx.stroke();
    poligono(ctx, [-3, topoArco - raio - 3, 3, topoArco - raio - 3, 2, topoArco - raio + 3, -2, topoArco - raio + 3], '#b5ad9f');
    ctx.restore();
  });

  // ===========================================================================
  // INTERFACE NO MAPA
  // ===========================================================================

  // Destaque da casa selecionada. opcoes: { pulso: 0..1 }
  registrar('selecao_casa', (ctx, o) => {
    const p = o.pulso || 0;
    ctx.strokeStyle = 'rgba(255,215,94,' + (0.6 + 0.4 * p) + ')';
    ctx.lineWidth = 2.5;
    retanguloArredondado(ctx, -18, -18, 36, 36, 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,94,0.15)';
    ctx.fill();
  });

  // Círculo de alcance da torre selecionada. opcoes: { raio (px) }
  registrar('alcance', (ctx, o) => {
    ctx.beginPath();
    ctx.arc(0, 0, o.raio, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,245,210,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Barra de vida. opcoes: { fracao: 0..1, largura (px) }
  registrar('barra_vida', (ctx, o) => {
    const w = o.largura || 20, h = 4;
    const f = Math.max(0, Math.min(1, o.fracao));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
    ctx.fillStyle = f > 0.6 ? '#5cc14a' : f > 0.3 ? '#e8c23a' : '#e0453a';
    ctx.fillRect(-w / 2, -h / 2, w * f, h);
  });

  // ===========================================================================
  // TORRES
  // Cada torre tem dois sprites por nível:
  //   '<tipo>_nv<N>_base' — parte fixa (não gira)
  //   '<tipo>_nv<N>'      — parte que gira para o alvo (desenhada virada para a direita)
  // opcoes da parte giratória: { recuo: 1 logo após disparar, caindo até 0 }
  // ===========================================================================

  // Marcas de nível (losangos dourados) na borda de baixo da base.
  function marcasNivel(ctx, n) {
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 7, y = 15;
      poligono(ctx, [x, y - 3, x + 3, y, x, y + 3, x - 3, y], '#e8b923');
      ctx.strokeStyle = '#6b4f0a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // Blocos de pedra num quadrado (bases de balista e catapulta).
  function blocosPedra(ctx, tam, cor, corLinha) {
    ctx.fillStyle = cor;
    retanguloArredondado(ctx, -tam, -tam, tam * 2, tam * 2, 4);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = corLinha;
    ctx.lineWidth = 1;
    for (let y = -tam, fila = 0; y < tam; y += 8, fila++) {
      ctx.beginPath(); ctx.moveTo(-tam, y); ctx.lineTo(tam, y); ctx.stroke();
      for (let x = -tam + (fila % 2 ? 6 : 0); x < tam; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.5;
    retanguloArredondado(ctx, -tam, -tam, tam * 2, tam * 2, 4);
    ctx.stroke();
  }

  // Tábuas de madeira num quadrado.
  function tabuas(ctx, tam, cor, corLinha) {
    ctx.fillStyle = cor;
    retanguloArredondado(ctx, -tam, -tam, tam * 2, tam * 2, 3);
    ctx.fill();
    ctx.strokeStyle = corLinha;
    ctx.lineWidth = 1;
    for (let y = -tam + 6; y < tam; y += 6) {
      ctx.beginPath(); ctx.moveTo(-tam + 1, y); ctx.lineTo(tam - 1, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    retanguloArredondado(ctx, -tam, -tam, tam * 2, tam * 2, 3);
    ctx.stroke();
  }

  // ----- Arqueiros -----
  function baseArqueiros(ctx, n) {
    elipse(ctx, 2, 4, 18, 16, 'rgba(0,0,0,0.25)');
    if (n === 1) {
      // Paliçada de estacas com piso de madeira
      circulo(ctx, 0, 0, 16, '#5b3a1e');
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        circulo(ctx, Math.cos(a) * 14.5, Math.sin(a) * 14.5, 2.6, '#8a5a2b');
      }
      circulo(ctx, 0, 0, 11.5, '#a0703d');
    } else {
      // Anel de pedra com ameias
      circulo(ctx, 0, 0, 17, n === 3 ? '#766f64' : '#8f877b');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        circulo(ctx, Math.cos(a) * 15, Math.sin(a) * 15, 3, n === 3 ? '#948c80' : '#aaa296');
      }
      circulo(ctx, 0, 0, 11.5, '#9c6b3a');
      if (n === 3) {
        ctx.strokeStyle = '#e8b923';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Tábuas do piso
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(70,40,15,0.5)';
    ctx.lineWidth = 1;
    for (let x = -12; x <= 12; x += 4) { ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, 12); ctx.stroke(); }
    ctx.restore();
    marcasNivel(ctx, n);
  }

  // Um arqueiro visto de cima, virado para a direita.
  function arqueiro(ctx, x, y, corCapuz, carregado) {
    // Arco
    ctx.strokeStyle = '#5b3a1e';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x + 1, y, 7, -1.2, 1.2); ctx.stroke();
    // Corda
    const puxada = carregado ? x - 2 : x + 1 + 7 * Math.cos(1.2);
    ctx.strokeStyle = 'rgba(245,235,205,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 1 + 7 * Math.cos(-1.2), y + 7 * Math.sin(-1.2));
    ctx.lineTo(puxada, y);
    ctx.lineTo(x + 1 + 7 * Math.cos(1.2), y + 7 * Math.sin(1.2));
    ctx.stroke();
    // Flecha encaixada
    if (carregado) {
      ctx.strokeStyle = '#6b4524';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 9, y); ctx.stroke();
    }
    // Ombros e cabeça (capuz)
    elipse(ctx, x - 1.5, y, 4.2, 5.5, corCapuz);
    circulo(ctx, x - 0.5, y, 3.4, corCapuz);
    circulo(ctx, x + 0.8, y, 2.3, '#e0b07a');
  }

  const ARQUEIROS_POSICOES = [
    [[0, 0]],
    [[-1, -5], [-1, 5]],
    [[-4, -7], [2, 0], [-4, 7]],
  ];
  const ARQUEIROS_CORES = ['#3f6b2a', '#2f5d7a', '#8a2a2a'];

  [1, 2, 3].forEach((n) => {
    registrar('arqueiros_nv' + n + '_base', (ctx) => baseArqueiros(ctx, n));
    registrar('arqueiros_nv' + n, (ctx, o) => {
      const carregado = (o.recuo || 0) < 0.5;
      ARQUEIROS_POSICOES[n - 1].forEach(([x, y]) => arqueiro(ctx, x, y, ARQUEIROS_CORES[n - 1], carregado));
    });
  });

  // ----- Balista -----
  function baseBalista(ctx, n) {
    elipse(ctx, 2, 4, 19, 17, 'rgba(0,0,0,0.25)');
    if (n === 1) tabuas(ctx, 15, '#7b5230', 'rgba(60,35,15,0.6)');
    else blocosPedra(ctx, 16, n === 2 ? '#8a8378' : '#6f685e', 'rgba(50,45,40,0.5)');
    if (n === 3) {
      // Cantoneiras de ferro com rebites dourados
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(sx * 16 - (sx > 0 ? 7 : 0), sy * 16 - (sy > 0 ? 7 : 0), 7, 7);
        circulo(ctx, sx * 12.5, sy * 12.5, 1.3, '#e8b923');
      });
    }
    circulo(ctx, 0, 0, 7, '#3b2a1a'); // suporte giratório
    marcasNivel(ctx, n);
  }

  [1, 2, 3].forEach((n) => {
    registrar('balista_nv' + n + '_base', (ctx) => baseBalista(ctx, n));
    registrar('balista_nv' + n, (ctx, o) => {
      const r = o.recuo || 0;
      const madeira = n === 3 ? '#3e2a1a' : '#6b4524';
      const metal = n === 1 ? '#8a8a8a' : n === 2 ? '#b0b4b8' : '#e8b923';
      const envergadura = 13 + n * 1.5;
      ctx.translate(-3 * r, 0); // recuo ao disparar
      // Coronha
      ctx.fillStyle = madeira;
      retanguloArredondado(ctx, -13, -3, 24, 6, 2);
      ctx.fill();
      // Manivela
      circulo(ctx, -12, 0, 3.5, metal);
      circulo(ctx, -12, 0, 1.4, madeira);
      // Braços do arco
      ctx.strokeStyle = n === 1 ? '#5b3a1e' : metal;
      ctx.lineWidth = 2.5 + n * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, -envergadura); ctx.quadraticCurveTo(12, 0, 4, envergadura); ctx.stroke();
      circulo(ctx, 4, -envergadura, 1.8, metal);
      circulo(ctx, 4, envergadura, 1.8, metal);
      // Corda: puxada com virote enquanto carregada
      const carregada = r < 0.4;
      ctx.strokeStyle = '#efe4c6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, -envergadura); ctx.lineTo(carregada ? -5 : 6, 0); ctx.lineTo(4, envergadura);
      ctx.stroke();
      if (carregada) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(14, 0); ctx.stroke();
        poligono(ctx, [14, -2.5, 19, 0, 14, 2.5], metal);
      }
    });
  });

  // ----- Catapulta -----
  function baseCatapulta(ctx, n) {
    elipse(ctx, 2, 4, 19, 17, 'rgba(0,0,0,0.25)');
    if (n === 1) {
      // Rodas
      [[-11, -15], [11, -15], [-11, 15], [11, 15]].forEach(([x, y]) => {
        ctx.fillStyle = '#2e2014';
        ctx.fillRect(x - 5, y - 2.5, 10, 5);
        circulo(ctx, x, y, 1.2, '#8a8a8a');
      });
      tabuas(ctx, 14, '#7b5230', 'rgba(60,35,15,0.6)');
    } else {
      blocosPedra(ctx, 16, n === 2 ? '#8a8378' : '#6f685e', 'rgba(50,45,40,0.5)');
      if (n === 3) {
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
          circulo(ctx, sx * 13, sy * 13, 4, '#948c80');
          circulo(ctx, sx * 13, sy * 13, 1.5, '#e8b923');
        });
      }
    }
    marcasNivel(ctx, n);
  }

  [1, 2, 3].forEach((n) => {
    registrar('catapulta_nv' + n + '_base', (ctx) => baseCatapulta(ctx, n));
    registrar('catapulta_nv' + n, (ctx, o) => {
      const r = o.recuo || 0;
      const madeira = '#5b3a1e', clara = n === 3 ? '#a8753f' : '#8a5a2b';
      const metal = n === 3 ? '#e8b923' : '#8a8a8a';
      // Armação lateral e travessa onde o braço bate
      ctx.fillStyle = madeira;
      ctx.fillRect(-11, -11, 22, 4);
      ctx.fillRect(-11, 7, 22, 4);
      ctx.fillStyle = clara;
      ctx.fillRect(5, -11, 4, 22);
      if (n >= 2) {
        // Contrapeso
        ctx.fillStyle = '#555049';
        ctx.fillRect(-9, -6, 6, 12);
        if (n === 3) { ctx.fillStyle = metal; ctx.fillRect(-9, -1, 6, 2); }
      }
      // Braço: em repouso aponta para trás; ao disparar gira para frente
      const ponta = -17 + 27 * r;
      ctx.strokeStyle = clara;
      ctx.lineWidth = 3 + (n - 1) * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(ponta, 0); ctx.stroke();
      circulo(ctx, ponta, 0, 4.5, '#3b2a1a'); // concha
      if (r < 0.25) {
        circulo(ctx, ponta, 0, 3.2, '#8f8a82');           // pedra pronta
        circulo(ctx, ponta - 1, -1, 1.1, '#bdb8ae');
      }
      circulo(ctx, -3, 0, 2.5, metal); // eixo
    });
  });

  // ===========================================================================
  // INIMIGOS (vistos de lado, em pé). Centro no meio do corpo.
  // opcoes: { fase (animação), flash (levou dano), virado (andando para a esquerda), invocando }
  // ===========================================================================
  const corDano = (o, normal) => (o.flash ? '#ff9a8a' : normal);

  function linha(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  registrar('esqueleto', (ctx, o) => {
    const passo = Math.sin(o.fase || 0);
    elipse(ctx, 0, 11, 7, 3, 'rgba(0,0,0,0.3)');
    if (o.virado) ctx.scale(-1, 1);
    const osso = corDano(o, '#ece6d4'), osso2 = corDano(o, '#b9b29c');
    ctx.lineCap = 'round';
    // Pernas
    ctx.strokeStyle = osso;
    ctx.lineWidth = 2;
    linha(ctx, -1, 3, -2 + passo * 3, 10);
    linha(ctx, 1, 3, 2 - passo * 3, 10);
    // Coluna, costelas e bacia
    ctx.strokeStyle = osso2;
    linha(ctx, 0, -4, 0, 3);
    ctx.strokeStyle = osso;
    ctx.lineWidth = 1.5;
    [-3, -0.5, 2].forEach((y) => linha(ctx, -3.5, y, 3.5, y));
    elipse(ctx, 0, 3.5, 3, 1.5, osso);
    // Braço de trás
    linha(ctx, -1, -3, -4, 2 + passo * 1.5);
    // Braço da frente com espada enferrujada
    linha(ctx, 1, -3, 5, -passo * 1.5);
    ctx.strokeStyle = '#8c8578';
    ctx.lineWidth = 1.8;
    linha(ctx, 5, -passo * 1.5, 12, -5 - passo * 1.5);
    ctx.strokeStyle = '#6b4524';
    linha(ctx, 4, -2 - passo * 1.5, 7, 1 - passo * 1.5);
    // Crânio
    circulo(ctx, 0.5, -8, 4.8, osso);
    ctx.fillStyle = osso;
    ctx.fillRect(-1.5, -5, 5, 2.5);
    circulo(ctx, 2.4, -8.5, 1.3, '#2a1f1a');
    circulo(ctx, -0.8, -8.5, 1.2, '#2a1f1a');
  });

  registrar('fantasma', (ctx, o) => {
    const f = o.fase || 0;
    elipse(ctx, 0, 12, 6, 2.5, 'rgba(0,0,0,0.18)');
    if (o.virado) ctx.scale(-1, 1);
    ctx.translate(0, Math.sin(f * 0.7) * 2 - 2); // flutua
    // Brilho
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
    g.addColorStop(0, 'rgba(180,240,255,0.45)');
    g.addColorStop(1, 'rgba(180,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    // Lençol com barra ondulada
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = corDano(o, '#e3f4f7');
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-9, -3);
    ctx.arc(0, -3, 9, Math.PI, 0);
    ctx.lineTo(9, 8);
    const bicos = 4, larg = 18 / bicos;
    for (let i = 1; i <= bicos; i++) {
      ctx.quadraticCurveTo(9 - (i - 0.5) * larg, 13 + Math.sin(f * 2 + i) * 1.5, 9 - i * larg, 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Rosto
    elipse(ctx, 1, -4, 1.7, 2.6, '#1d2a33');
    elipse(ctx, 5, -4, 1.5, 2.4, '#1d2a33');
    elipse(ctx, 3.2, 1.5, 1.4, 2, '#1d2a33');
  });

  registrar('zumbi', (ctx, o) => {
    const f = o.fase || 0, passo = Math.sin(f);
    elipse(ctx, 0, 15, 12, 4, 'rgba(0,0,0,0.3)');
    if (o.virado) ctx.scale(-1, 1);
    ctx.rotate(Math.sin(f * 0.5) * 0.06); // cambaleia
    const pele = corDano(o, '#7da35a'), peleEscura = corDano(o, '#5d7f40');
    // Pernas
    ctx.fillStyle = '#4a3b2a';
    ctx.fillRect(-7, 4, 5, 10 + passo * 1.5);
    ctx.fillRect(2, 4, 5, 10 - passo * 1.5);
    // Braço de trás
    ctx.fillStyle = peleEscura;
    retanguloArredondado(ctx, 0, -7 + passo, 14, 4.5, 2);
    ctx.fill();
    // Corpo com camisa rasgada
    ctx.fillStyle = corDano(o, '#6b5a7a');
    retanguloArredondado(ctx, -10, -8, 20, 15, 4);
    ctx.fill();
    poligono(ctx, [-6, 7, -3, 2, 0, 7], pele);
    poligono(ctx, [3, -2, 6, 2, 4, 4], pele);
    // Cabeça
    circulo(ctx, 2, -13, 7, pele);
    circulo(ctx, 5, -14, 1.7, '#fff2a8');
    circulo(ctx, 5.3, -14, 0.8, '#b3261e');
    circulo(ctx, 1, -14.5, 1.3, '#fff2a8');
    ctx.strokeStyle = '#2a3a1a';
    ctx.lineWidth = 1;
    linha(ctx, 2, -9.5, 6.5, -10);
    // Costura na cabeça
    ctx.strokeStyle = '#3a2a2a';
    linha(ctx, -3, -15, 0, -19);
    linha(ctx, -2.8, -17.8, -0.6, -16);
    // Braço da frente esticado
    ctx.fillStyle = pele;
    retanguloArredondado(ctx, -2, -4 - passo, 16, 5, 2);
    ctx.fill();
  });

  registrar('necromante', (ctx, o) => {
    const f = o.fase || 0;
    const pulso = 0.5 + 0.5 * Math.sin(f * 0.8);
    // Aura
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 28 + 4 * pulso);
    g.addColorStop(0, 'rgba(125,255,106,0.3)');
    g.addColorStop(1, 'rgba(90,20,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
    if (o.invocando > 0) {
      ctx.strokeStyle = 'rgba(125,255,106,' + o.invocando + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 4, 16 + (1 - o.invocando) * 14, 0, Math.PI * 2); ctx.stroke();
    }
    elipse(ctx, 0, 17, 13, 4, 'rgba(0,0,0,0.35)');
    if (o.virado) ctx.scale(-1, 1);
    // Manto
    poligono(ctx, [-13, 17, 13, 17, 6, -8, -6, -8], corDano(o, '#3b1f4f'));
    poligono(ctx, [-2, 17, 2, 17, 1, -6, -1, -6], '#7a3fa0');
    ctx.strokeStyle = '#8a4fb5';
    ctx.lineWidth = 2;
    linha(ctx, -13, 16.5, 13, 16.5);
    // Cajado com crânio e orbe
    ctx.strokeStyle = '#5b3a1e';
    ctx.lineWidth = 2.2;
    linha(ctx, 11, 17, 12, -20);
    circulo(ctx, 10, -2, 2.6, '#c9d6b0');
    circulo(ctx, 12, -21, 3.5, '#ece6d4');
    circulo(ctx, 11, -21.5, 0.9, '#1a1a1a');
    circulo(ctx, 13.4, -21.5, 0.9, '#1a1a1a');
    const orbe = ctx.createRadialGradient(12, -28, 0, 12, -28, 5 + pulso * 2);
    orbe.addColorStop(0, '#eaffd8');
    orbe.addColorStop(0.4, '#7dff6a');
    orbe.addColorStop(1, 'rgba(125,255,106,0)');
    ctx.fillStyle = orbe;
    ctx.beginPath(); ctx.arc(12, -28, 7, 0, Math.PI * 2); ctx.fill();
    // Capuz
    poligono(ctx, [-6.5, -12, 0, -22, 6.5, -12], corDano(o, '#2a1438'));
    circulo(ctx, 0, -11, 7.5, corDano(o, '#2a1438'));
    circulo(ctx, 1.5, -10, 4.5, '#0d0612');
    circulo(ctx, 0.2, -10.5, 1.1, '#7dff6a');
    circulo(ctx, 3.2, -10.5, 1.1, '#7dff6a');
  });

  // ===========================================================================
  // PROJÉTEIS (virados para a direita)
  // ===========================================================================
  registrar('flecha', (ctx) => {
    ctx.strokeStyle = '#6b4524';
    ctx.lineWidth = 1.5;
    linha(ctx, -7, 0, 6, 0);
    poligono(ctx, [6, -2, 10, 0, 6, 2], '#9a9a9a');
    poligono(ctx, [-7, 0, -10, -2.5, -8, 0, -10, 2.5], '#f2f2f2');
  });

  registrar('virote', (ctx) => {
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 2.5;
    linha(ctx, -9, 0, 8, 0);
    poligono(ctx, [7, -3, 13, 0, 7, 3], '#6e7478');
    poligono(ctx, [-9, 0, -12, -3.5, -7, 0, -12, 3.5], '#2d2d2d');
  });

  registrar('pedra', (ctx) => {
    poligono(ctx, [-4.5, -1, -2, -4.5, 3, -4, 5, 0, 3, 4, -2, 4.5], '#8f8a82');
    circulo(ctx, -1, -1.5, 1.6, '#bdb8ae');
    ctx.strokeStyle = '#5e5a54';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4.5, -1); ctx.lineTo(-2, -4.5); ctx.lineTo(3, -4); ctx.lineTo(5, 0); ctx.lineTo(3, 4); ctx.lineTo(-2, 4.5);
    ctx.closePath();
    ctx.stroke();
  });

  registrar('sombra_projetil', (ctx) => {
    elipse(ctx, 0, 0, 5, 2.5, 'rgba(0,0,0,0.3)');
  });

  // ===========================================================================
  // EFEITOS. opcoes.progresso vai de 0 (início) a 1 (fim).
  // ===========================================================================
  registrar('impacto', (ctx, o) => {
    const p = o.progresso || 0;
    ctx.strokeStyle = 'rgba(255,240,200,' + (1 - p) + ')';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      linha(ctx, Math.cos(a) * (2 + p * 4), Math.sin(a) * (2 + p * 4), Math.cos(a) * (4 + p * 7), Math.sin(a) * (4 + p * 7));
    }
  });

  // opcoes: { raio (px) }
  registrar('explosao', (ctx, o) => {
    const p = o.progresso || 0, R = o.raio || 40;
    const expansao = 1 - Math.pow(1 - p, 3);
    // Marca no chão
    circulo(ctx, 0, 0, R * (0.6 + 0.4 * expansao), 'rgba(60,40,20,' + 0.3 * (1 - p) + ')');
    // Bola de fogo
    const r = Math.max(1, R * (0.25 + 0.6 * expansao));
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(255,245,190,' + (1 - p) + ')');
    g.addColorStop(0.45, 'rgba(255,150,50,' + 0.9 * (1 - p) + ')');
    g.addColorStop(1, 'rgba(160,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // Detritos
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + i;
      const d = R * 1.1 * expansao;
      circulo(ctx, Math.cos(a) * d, Math.sin(a) * d - Math.sin(p * Math.PI) * 8, 1.8 * (1 - p) + 0.4, '#6b4a2b');
    }
    // Onda de choque
    ctx.strokeStyle = 'rgba(255,230,180,' + 0.6 * (1 - p) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R * expansao, 0, Math.PI * 2); ctx.stroke();
  });

  const CORES_MORTE = { esqueleto: '#ece6d4', fantasma: '#c8f2ff', zumbi: '#7da35a', necromante: '#9b5fd0' };
  // opcoes: { tipo }
  registrar('morte', (ctx, o) => {
    const p = o.progresso || 0;
    const cor = CORES_MORTE[o.tipo] || '#ffffff';
    const escala = o.tipo === 'necromante' ? 2.2 : o.tipo === 'zumbi' ? 1.4 : 1;
    ctx.scale(escala, escala);
    ctx.globalAlpha = 1 - p;
    circulo(ctx, 0, -p * 6, 6 + p * 8, 'rgba(90,80,70,0.35)'); // poeira
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const x = Math.cos(a) * p * 14;
      const y = Math.sin(a) * p * 10 - Math.sin(p * Math.PI) * 10 + p * p * 8;
      if (o.tipo === 'esqueleto') {
        ctx.strokeStyle = cor;
        ctx.lineWidth = 1.5;
        linha(ctx, x - 2, y - 1, x + 2, y + 1); // ossinhos
      } else {
        circulo(ctx, x, y, 2 * (1 - p) + 0.5, cor);
      }
    }
    ctx.globalAlpha = 1;
  });

  // Texto de ouro subindo. opcoes: { valor }
  registrar('texto_ouro', (ctx, o) => {
    const p = o.progresso || 0;
    ctx.globalAlpha = 1 - p * p;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(40,25,5,0.9)';
    ctx.strokeText('+' + o.valor, 0, -16 * p);
    ctx.fillStyle = '#ffd84a';
    ctx.fillText('+' + o.valor, 0, -16 * p);
    ctx.globalAlpha = 1;
  });

  // Surgimento de um esqueleto invocado.
  registrar('invocacao', (ctx, o) => {
    const p = o.progresso || 0;
    ctx.strokeStyle = 'rgba(125,255,106,' + (1 - p) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 8, 6 + p * 10, 3 + p * 4, 0, 0, Math.PI * 2); ctx.stroke();
    circulo(ctx, 0, 8 - p * 14, 3 * (1 - p), 'rgba(125,255,106,' + (1 - p) + ')');
  });

  // Inimigo chegando ao portão.
  registrar('perda_vida', (ctx, o) => {
    const p = o.progresso || 0;
    ctx.strokeStyle = 'rgba(220,40,30,' + (1 - p) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 10 + p * 22, 0, Math.PI * 2); ctx.stroke();
    circulo(ctx, 0, 0, 14 * (1 - p), 'rgba(255,80,60,' + 0.35 * (1 - p) + ')');
  });
})();
