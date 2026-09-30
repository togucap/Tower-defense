/*
 * config.js — Parâmetros e balanceamento do jogo.
 *
 * Unidades usadas neste arquivo:
 *   - distâncias em "casas" (1 casa = 40 px lógicos da grade)
 *   - tempos em segundos
 *   - velocidades em casas por segundo
 *   - cadência em disparos por segundo
 *
 * Este é o primeiro script carregado: ele cria o namespace global window.TD.
 */
window.TD = window.TD || {};

TD.config = {
  // ---------------------------------------------------------------------------
  // Tela e grade
  // ---------------------------------------------------------------------------
  tela: {
    colunas: 9,          // colunas da grade do mapa
    linhas: 16,          // linhas da grade do mapa
    tamanhoCasa: 40,     // lado de uma casa em px lógicos (o canvas é escalado para caber na tela)
    dprMaximo: 3,        // limite do devicePixelRatio (acima disso gasta GPU sem ganho visível)
  },

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------
  loop: {
    dtMaximo: 0.05,      // maior passo de tempo aceito por quadro (s): evita saltos depois de travadas
    velocidades: [1, 2], // opções do botão de velocidade (cada "x" é uma atualização extra por quadro)
  },

  // ---------------------------------------------------------------------------
  // Mapa
  // ---------------------------------------------------------------------------
  mapa: {
    // Pontos do caminho em casas [coluna, linha], do surgimento dos inimigos até o portão.
    // Pode usar frações (ex.: 3.5). Linha -1 = fora da tela, acima do mapa.
    caminho: [
      [1, -1],
      [1, 2],
      [7, 2],
      [7, 6],
      [1, 6],
      [1, 10],
      [7, 10],
      [7, 12],
      [4, 12],
      [4, 14],           // portão do castelo
    ],
    larguraEstrada: 0.8,     // largura visual da estrada, em casas
    linhasCastelo: 2,        // linhas no fim do mapa ocupadas pelo castelo (não dá para construir)
    sementeDecoracao: 12,    // semente aleatória da decoração (troque para outro arranjo de árvores)
    densidadeDecoracao: 0.6, // chance (0 a 1) de uma casa de grama sem construção receber árvore ou pedra
  },

  // ---------------------------------------------------------------------------
  // Partida
  // ---------------------------------------------------------------------------
  jogo: {
    vidasIniciais: 20,     // vidas do castelo no começo da partida
    ouroInicial: 180,      // ouro no começo da partida
    bonusChamarCedo: 0,    // ouro extra ao chamar a próxima onda antes de a atual terminar (0 = sem bônus)
    reembolsoVenda: 0.6,   // fração do total investido na torre (construção + melhorias) devolvida ao vender
  },

  // ---------------------------------------------------------------------------
  // Torres
  // Cada torre tem 3 níveis. No nível 1, "custo" é o preço de construção;
  // nos níveis 2 e 3, "custo" é o preço da melhoria.
  // ---------------------------------------------------------------------------
  torres: {
    arqueiros: {
      nome: 'Arqueiros',
      descricao: 'Rápida, dano baixo',
      projetil: 'flecha',     // sprite e som do disparo
      velocidadeGiro: 12,     // quão rápido a torre gira para mirar (radianos/s)
      niveis: [
        //  custo    dano      alcance (casas)  cadência (disparos/s)  velocidade do projétil (casas/s)
        { custo: 70,  dano: 5,  alcance: 2.3,    cadencia: 2.5,         velocidadeProjetil: 10 },
        { custo: 60,  dano: 7,  alcance: 2.6,    cadencia: 3.2,         velocidadeProjetil: 11 },
        { custo: 100, dano: 10, alcance: 2.9,    cadencia: 4.0,         velocidadeProjetil: 12 },
      ],
    },
    balista: {
      nome: 'Balista',
      descricao: 'Equilibrada, virotes',
      projetil: 'virote',
      velocidadeGiro: 7,
      niveis: [
        { custo: 90,  dano: 18, alcance: 2.8, cadencia: 0.9,  velocidadeProjetil: 12 },
        { custo: 80,  dano: 28, alcance: 3.1, cadencia: 1.0,  velocidadeProjetil: 13 },
        { custo: 130, dano: 42, alcance: 3.4, cadencia: 1.15, velocidadeProjetil: 14 },
      ],
    },
    catapulta: {
      nome: 'Catapulta',
      descricao: 'Lenta, dano em área',
      projetil: 'pedra',
      velocidadeGiro: 3,
      niveis: [
        // raioExplosao: raio do dano em área no ponto de impacto (casas)
        { custo: 120, dano: 30, alcance: 3.2, cadencia: 0.4,  velocidadeProjetil: 5,   raioExplosao: 1.0 },
        { custo: 100, dano: 45, alcance: 3.5, cadencia: 0.45, velocidadeProjetil: 5.5, raioExplosao: 1.15 },
        { custo: 160, dano: 70, alcance: 3.8, cadencia: 0.5,  velocidadeProjetil: 6,   raioExplosao: 1.3 },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Inimigos
  // A vida final é "vida × vidaMultiplicador da onda" (veja "ondas" abaixo).
  // ---------------------------------------------------------------------------
  inimigos: {
    esqueleto: {
      nome: 'Esqueleto',
      vida: 30,             // pontos de vida base
      velocidade: 1.0,      // casas por segundo
      recompensa: 4,        // ouro ganho ao derrotar
      danoAoCastelo: 1,     // vidas perdidas se chegar ao portão
      raio: 0.25,           // raio do corpo (casas), usado no dano em área
    },
    fantasma: {
      nome: 'Fantasma',
      vida: 18,
      velocidade: 1.8,
      recompensa: 4,
      danoAoCastelo: 1,
      raio: 0.25,
    },
    zumbi: {
      nome: 'Zumbi gigante',
      vida: 170,
      velocidade: 0.5,
      recompensa: 14,
      danoAoCastelo: 2,
      raio: 0.4,
    },
    necromante: {
      nome: 'Necromante',
      vida: 1300,
      velocidade: 0.35,
      recompensa: 150,
      danoAoCastelo: 10,
      raio: 0.45,
      invocacao: {
        intervalo: 6,          // segundos entre invocações
        quantidade: 3,         // esqueletos invocados por vez
        tipo: 'esqueleto',     // tipo de inimigo invocado
        espacamento: 0.5,      // distância (casas) entre os invocados, surgindo atrás do necromante
        recompensa: 1,         // ouro por invocado derrotado (menor, para não virar "fazenda" de ouro)
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Ondas
  //   vidaMultiplicador: multiplica a vida base de todos os inimigos da onda
  //   bonus: ouro ganho ao vencer a onda
  //   grupos: listas de inimigos que surgem em paralelo:
  //     tipo: chave em "inimigos" | quantidade | intervalo: s entre um e outro
  //     atraso: s desde o início da onda até o primeiro do grupo surgir
  // ---------------------------------------------------------------------------
  ondas: [
    { // Onda 1
      vidaMultiplicador: 1.0, bonus: 20,
      grupos: [
        { tipo: 'esqueleto', quantidade: 8, intervalo: 1.1, atraso: 0 },
      ],
    },
    { // Onda 2
      vidaMultiplicador: 1.15, bonus: 20,
      grupos: [
        { tipo: 'esqueleto', quantidade: 12, intervalo: 0.9, atraso: 0 },
      ],
    },
    { // Onda 3 — chegam os fantasmas
      vidaMultiplicador: 1.3, bonus: 25,
      grupos: [
        { tipo: 'esqueleto', quantidade: 8, intervalo: 0.9, atraso: 0 },
        { tipo: 'fantasma', quantidade: 8, intervalo: 0.7, atraso: 5 },
      ],
    },
    { // Onda 4 — primeiros zumbis gigantes
      vidaMultiplicador: 1.5, bonus: 25,
      grupos: [
        { tipo: 'esqueleto', quantidade: 14, intervalo: 0.8, atraso: 0 },
        { tipo: 'zumbi', quantidade: 2, intervalo: 3, atraso: 6 },
      ],
    },
    { // Onda 5
      vidaMultiplicador: 1.75, bonus: 30,
      grupos: [
        { tipo: 'fantasma', quantidade: 14, intervalo: 0.55, atraso: 0 },
        { tipo: 'esqueleto', quantidade: 10, intervalo: 0.8, atraso: 4 },
        { tipo: 'zumbi', quantidade: 3, intervalo: 2.5, atraso: 9 },
      ],
    },
    { // Onda 6
      vidaMultiplicador: 2.0, bonus: 30,
      grupos: [
        { tipo: 'esqueleto', quantidade: 22, intervalo: 0.6, atraso: 0 },
        { tipo: 'zumbi', quantidade: 5, intervalo: 2.2, atraso: 4 },
      ],
    },
    { // Onda 7
      vidaMultiplicador: 2.35, bonus: 35,
      grupos: [
        { tipo: 'fantasma', quantidade: 20, intervalo: 0.45, atraso: 0 },
        { tipo: 'zumbi', quantidade: 6, intervalo: 2, atraso: 3 },
        { tipo: 'esqueleto', quantidade: 10, intervalo: 0.7, atraso: 10 },
      ],
    },
    { // Onda 8
      vidaMultiplicador: 2.7, bonus: 40,
      grupos: [
        { tipo: 'esqueleto', quantidade: 26, intervalo: 0.5, atraso: 0 },
        { tipo: 'fantasma', quantidade: 14, intervalo: 0.5, atraso: 6 },
        { tipo: 'zumbi', quantidade: 7, intervalo: 1.8, atraso: 9 },
      ],
    },
    { // Onda 9
      vidaMultiplicador: 3.1, bonus: 45,
      grupos: [
        { tipo: 'zumbi', quantidade: 10, intervalo: 1.5, atraso: 0 },
        { tipo: 'fantasma', quantidade: 24, intervalo: 0.4, atraso: 4 },
        { tipo: 'esqueleto', quantidade: 24, intervalo: 0.5, atraso: 10 },
      ],
    },
    { // Onda 10 — o Necromante
      vidaMultiplicador: 3.6, bonus: 0,
      grupos: [
        { tipo: 'esqueleto', quantidade: 16, intervalo: 0.6, atraso: 0 },
        { tipo: 'fantasma', quantidade: 12, intervalo: 0.5, atraso: 4 },
        { tipo: 'zumbi', quantidade: 6, intervalo: 2, atraso: 8 },
        { tipo: 'necromante', quantidade: 1, intervalo: 0, atraso: 14 },
      ],
    },
  ],

  // ---------------------------------------------------------------------------
  // Áudio
  // ---------------------------------------------------------------------------
  audio: {
    volumeGeral: 0.5,      // volume mestre (0 a 1)
  },

  // ---------------------------------------------------------------------------
  // Depuração
  // ---------------------------------------------------------------------------
  debug: {
    mostrarFps: false,     // mostra o FPS no canto do mapa
  },
};

// Valores derivados (calculados a partir dos de cima; não edite).
TD.config.tela.largura = TD.config.tela.colunas * TD.config.tela.tamanhoCasa; // 360 px lógicos
TD.config.tela.altura = TD.config.tela.linhas * TD.config.tela.tamanhoCasa;   // 640 px lógicos
TD.config.jogo.totalOndas = TD.config.ondas.length;                          // vitória ao vencer a última
