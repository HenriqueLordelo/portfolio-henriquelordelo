/* COMPORTAMENTO DA PÁGINA: menu, cabeçalho, navegação ativa, vídeos, paleta e formulário */
(function () {
  "use strict";

  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- MENU MOBILE ---------- */
  function iniciarMenu() {
    const nav = document.getElementById("nav");
    const botao = document.querySelector("[data-menu-botao]");
    const rotulo = document.querySelector("[data-menu-rotulo]");
    if (!nav || !botao) return;
    const links = nav.querySelectorAll(".nav-menu a");
    const foraDoMenu = [
      document.getElementById("conteudo"),
      document.querySelector(".footer"),
    ];
    const larguraDesktop = window.matchMedia("(min-width: 961px)");

    function definir(aberto, devolverFoco) {
      nav.classList.toggle("aberto", aberto);
      document.body.classList.toggle("menu-aberto", aberto);
      botao.setAttribute("aria-expanded", String(aberto));
      rotulo.textContent = aberto ? "Fechar menu" : "Abrir menu";
      // enquanto o menu cobre a tela, o restante da página fica fora da navegação por teclado
      foraDoMenu.forEach((el) => el && el.toggleAttribute("inert", aberto));
      if (aberto) {
        links[0].focus({ preventScroll: true });
      } else if (devolverFoco) {
        botao.focus({ preventScroll: true });
      }
    }

    botao.addEventListener("click", () =>
      definir(!nav.classList.contains("aberto"), true),
    );
    links.forEach((link) =>
      link.addEventListener("click", () => definir(false, false)),
    );

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && nav.classList.contains("aberto"))
        definir(false, true);
    });

    larguraDesktop.addEventListener("change", (mq) => {
      if (mq.matches && nav.classList.contains("aberto")) definir(false, false);
    });
  }

  /* ---------- CABEÇALHO: fundo após rolar; esconde ao descer e volta ao subir ---------- */
  function iniciarCabecalho() {
    const header = document.querySelector("[data-header]");
    if (!header) return;
    let ultimaPosicao = window.scrollY;
    let agendado = false;

    function atualizar() {
      const y = window.scrollY;
      const delta = y - ultimaPosicao;
      header.classList.toggle("header-rolado", y > 24);
      if (
        !document.body.classList.contains("menu-aberto") &&
        Math.abs(delta) > 6
      ) {
        header.classList.toggle("header-oculto", delta > 0 && y > 480);
      }
      if (Math.abs(delta) > 6) ultimaPosicao = y;
      agendado = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (agendado) return;
        agendado = true;
        requestAnimationFrame(atualizar);
      },
      { passive: true },
    );

    // ao navegar pelo teclado, o cabeçalho reaparece para o foco não ficar escondido
    header.addEventListener("focusin", () =>
      header.classList.remove("header-oculto"),
    );
    atualizar();
  }

  /* ---------- NAVEGAÇÃO ATIVA: marca o link da seção visível ---------- */
  function iniciarNavegacaoAtiva() {
    if (!("IntersectionObserver" in window)) return;
    const links = Array.from(
      document.querySelectorAll(".nav-menu a[href^='#']"),
    );
    const secoes = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          links.forEach((link) => {
            const ativo = link.getAttribute("href") === "#" + entrada.target.id;
            if (ativo) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    secoes.forEach((secao) => observador.observe(secao));
  }

  /* ---------- PROJETOS: vídeo carregado só quando há intenção (hover ou foco) ----------
     Antes os 4 vídeos (~27 MB) baixavam e tocavam escondidos ao abrir a página. */
  function iniciarVideosProjetos() {
    document.querySelectorAll("[data-projeto]").forEach((projeto) => {
      const midia = projeto.querySelector(".projeto-midia");
      const video = projeto.querySelector("video[data-src]");
      if (!midia || !video) return;

      video.addEventListener("playing", () => projeto.classList.add("tocando"));

      function tocar() {
        if (reduzMovimento.matches) return;
        if (!video.getAttribute("src")) video.src = video.dataset.src;
        const promessa = video.play();
        if (promessa) promessa.catch(() => {});
      }

      function parar() {
        projeto.classList.remove("tocando");
        if (!video.paused) video.pause();
      }

      midia.addEventListener("pointerenter", () => {
        if (ponteiroFino.matches) tocar();
      });
      midia.addEventListener("pointerleave", parar);
      projeto.addEventListener("focusin", tocar);
      projeto.addEventListener("focusout", (evento) => {
        if (!projeto.contains(evento.relatedTarget)) parar();
      });
    });
  }

  /* ---------- PALETA: copiar código da cor ---------- */
  function iniciarPaleta() {
    const status = document.querySelector("[data-copiar-status]");

    function copiarTexto(texto) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(texto);
      }
      // alternativa para contextos sem a Clipboard API (ex.: http local)
      return new Promise((resolve, reject) => {
        const campo = document.createElement("textarea");
        campo.value = texto;
        campo.setAttribute("readonly", "");
        campo.style.position = "fixed";
        campo.style.opacity = "0";
        document.body.appendChild(campo);
        campo.select();
        const ok = document.execCommand("copy");
        campo.remove();
        ok ? resolve() : reject();
      });
    }

    document.querySelectorAll("[data-copiar]").forEach((botao) => {
      let temporizador;
      botao.setAttribute("aria-label", "Copiar " + botao.textContent.trim());
      botao.addEventListener("click", () => {
        const valor = botao.dataset.copiar;
        copiarTexto(valor)
          .then(() => {
            botao.setAttribute("data-copiado", "");
            if (status)
              status.textContent = botao.textContent.trim() + " copiado.";
            clearTimeout(temporizador);
            temporizador = setTimeout(
              () => botao.removeAttribute("data-copiado"),
              1600,
            );
          })
          .catch(() => {
            if (status)
              status.textContent = "Não foi possível copiar. Código: " + valor;
          });
      });
    });
  }

  /* ---------- FORMULÁRIO: abre o WhatsApp com uma saudação + a mensagem ----------
     Sem JS, o próprio form envia ?text= para wa.me. */
  function iniciarFormulario() {
    const form = document.querySelector("[data-contato-form]");
    if (!form) return;
    form.addEventListener("submit", (evento) => {
      const campo = form.querySelector("textarea");
      const mensagem = campo.value.trim();
      if (!mensagem) return;
      evento.preventDefault();
      const texto = "Olá! Vim pelo seu portfólio.\n\n" + mensagem;
      const destino = form.action + "?text=" + encodeURIComponent(texto);
      window.open(destino, "_blank", "noopener");
    });
  }

  function iniciarAno() {
    const ano = document.querySelector("[data-ano]");
    if (ano) ano.textContent = String(new Date().getFullYear());
  }

  iniciarMenu();
  iniciarCabecalho();
  iniciarNavegacaoAtiva();
  iniciarVideosProjetos();
  iniciarPaleta();
  iniciarFormulario();
  iniciarAno();
})();
