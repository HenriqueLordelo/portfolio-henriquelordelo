/* MOVIMENTO
   - dispara a sequência de entrada do hero (CSS em utilidades/animacao.css)
   - revela elementos [data-reveal] ao entrarem na tela
   - efeitos ligados ao cursor (somente mouse e sem preferência por movimento reduzido) */
(function () {
  "use strict";

  window.__motionBoot = true;

  const root = document.documentElement;
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)");
  const efeitosDeCursor = () => ponteiroFino.matches && !reduzMovimento.matches;

  /* ---------- ENTRADA DO HERO ----------
     Espera as fontes (no máximo 600ms) para o título não trocar de fonte no meio da animação. */
  function iniciarHero() {
    const fontes =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    const limite = new Promise((resolve) => setTimeout(resolve, 600));
    Promise.race([fontes, limite]).then(() => {
      requestAnimationFrame(() => root.classList.add("is-ready"));
    });
  }

  /* ---------- REVELAÇÃO POR ROLAGEM ---------- */
  function iniciarRevelacoes() {
    // índice de stagger para itens dentro de um grupo
    document.querySelectorAll("[data-reveal-group]").forEach((grupo) => {
      grupo
        .querySelectorAll("[data-reveal]")
        .forEach((item, i) => item.style.setProperty("--i", i));
    });

    const itens = document.querySelectorAll("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      itens.forEach((item) => item.classList.add("is-in"));
      return;
    }

    // O Chrome considera o clip-path do próprio alvo: um elemento com inset(100%) nunca
    // "intersecta". Para revelações por recorte, observamos o pai e marcamos o filho.
    const alvos = new Map();
    itens.forEach((item) => {
      const observado =
        item.dataset.reveal === "clip" ? item.parentElement : item;
      if (!alvos.has(observado)) alvos.set(observado, []);
      alvos.get(observado).push(item);
    });

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          const marcados = alvos.get(entrada.target) || [];
          marcados.forEach((item) => item.classList.add("is-in"));
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    alvos.forEach((_, observado) => observador.observe(observado));
  }

  /* ---------- FAIXA DE PALAVRAS: anima só quando visível ---------- */
  function iniciarFaixa() {
    const faixa = document.querySelector("[data-faixa]");
    if (!faixa || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entrada]) => {
      faixa.classList.toggle("is-visivel", entrada.isIntersecting);
    }).observe(faixa);
  }

  /* ---------- utilitário: valor que persegue um alvo com amortecimento ----------
     O loop de rAF só roda enquanto há diferença perceptível e para sozinho. */
  function criarSeguidor(aplicar, suavidade) {
    const atual = { x: 0, y: 0 };
    const alvo = { x: 0, y: 0 };
    let quadro = 0;

    function passo() {
      atual.x += (alvo.x - atual.x) * suavidade;
      atual.y += (alvo.y - atual.y) * suavidade;
      aplicar(atual.x, atual.y);
      if (
        Math.abs(alvo.x - atual.x) > 0.1 ||
        Math.abs(alvo.y - atual.y) > 0.1
      ) {
        quadro = requestAnimationFrame(passo);
      } else {
        quadro = 0;
      }
    }

    return {
      mover(x, y) {
        alvo.x = x;
        alvo.y = y;
        if (!quadro) quadro = requestAnimationFrame(passo);
      },
      posicionar(x, y) {
        atual.x = alvo.x = x;
        atual.y = alvo.y = y;
        aplicar(x, y);
      },
    };
  }

  /* ---------- HERO: brilho que acompanha o cursor ---------- */
  function iniciarBrilhoHero() {
    const hero = document.querySelector("[data-hero]");
    const brilho = document.querySelector("[data-hero-brilho]");
    if (!hero || !brilho) return;

    const seguidor = criarSeguidor((x, y) => {
      brilho.style.setProperty("--brilho-x", x + "px");
      brilho.style.setProperty("--brilho-y", y + "px");
    }, 0.06);

    const posicaoInicial = () => {
      const r = hero.getBoundingClientRect();
      seguidor.posicionar(r.width * 0.7, r.height * 0.38);
    };
    posicaoInicial();
    window.addEventListener("resize", posicaoInicial, { passive: true });

    hero.addEventListener(
      "pointermove",
      (evento) => {
        if (!efeitosDeCursor()) return;
        const r = hero.getBoundingClientRect();
        seguidor.mover(evento.clientX - r.left, evento.clientY - r.top);
      },
      { passive: true },
    );
  }

  /* ---------- SOBRE: parallax das palavras no cartão de perfil ---------- */
  function iniciarParallaxPerfil() {
    const area = document.querySelector("[data-parallax-area]");
    if (!area) return;
    const tracos = Array.from(area.querySelectorAll("[data-profundidade]"));
    const AMPLITUDE = 28;

    const seguidor = criarSeguidor((x, y) => {
      tracos.forEach((traco) => {
        const p = Number(traco.dataset.profundidade);
        traco.style.setProperty("--px", (x * p * AMPLITUDE).toFixed(2) + "px");
        traco.style.setProperty("--py", (y * p * AMPLITUDE).toFixed(2) + "px");
      });
    }, 0.08);

    // coordenadas normalizadas de -0.5 a 0.5 relativas ao próprio cartão
    area.addEventListener(
      "pointermove",
      (evento) => {
        if (!efeitosDeCursor()) return;
        const r = area.getBoundingClientRect();
        seguidor.mover(
          (evento.clientX - r.left) / r.width - 0.5,
          (evento.clientY - r.top) / r.height - 0.5,
        );
      },
      { passive: true },
    );
    area.addEventListener("pointerleave", () => seguidor.mover(0, 0), {
      passive: true,
    });
  }

  /* ---------- PROJETOS: rótulo "Ver projeto" que segue o cursor ---------- */
  function iniciarCursorProjetos() {
    document.querySelectorAll(".projeto-midia").forEach((midia) => {
      const rotulo = midia.querySelector(".projeto-cursor");
      if (!rotulo) return;
      let quadro = 0;
      midia.addEventListener(
        "pointermove",
        (evento) => {
          if (!ponteiroFino.matches || quadro) return;
          quadro = requestAnimationFrame(() => {
            const r = midia.getBoundingClientRect();
            rotulo.style.setProperty("--cx", evento.clientX - r.left + "px");
            rotulo.style.setProperty("--cy", evento.clientY - r.top + "px");
            quadro = 0;
          });
        },
        { passive: true },
      );
    });
  }

  iniciarHero();
  iniciarRevelacoes();
  iniciarFaixa();
  iniciarBrilhoHero();
  iniciarParallaxPerfil();
  iniciarCursorProjetos();
})();
