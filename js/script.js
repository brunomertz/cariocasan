let produtos = [];

/**
 * Carrega produtos do JSON (mantém o mesmo comportamento anterior)
 */
async function carregarProdutos() {
  try {
    const resposta = await fetch("js/produtos.json");
    produtos = await resposta.json();
    // não chamamos exibirProdutos aqui para que possamos controlar o primeiro filtro
    return produtos;
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    throw erro;
  }
}

/**
 * Exibe produtos por categoria (mantive sua lógica, apenas pequena limpeza)
 */
function exibirProdutos(categoria) {
  const container = document.getElementById("produtosContainer");
  if (!container) return;
  container.innerHTML = "";

  const filtrados = categoria === "todas" ? produtos : produtos.filter(p => p.categoria === categoria);

  const categoriasAgrupadas = {};
  filtrados.forEach(produto => {
    if (!categoriasAgrupadas[produto.categoria]) categoriasAgrupadas[produto.categoria] = [];
    categoriasAgrupadas[produto.categoria].push(produto);
  });

  for (const cat in categoriasAgrupadas) {
    const titulo = document.createElement("h3");
    titulo.className = "mt-4 mb-3 titulo-categoria";
    titulo.textContent = cat;
    container.appendChild(titulo);

    const row = document.createElement("div");
    row.className = "row g-4";

    categoriasAgrupadas[cat].forEach(produto => {
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 mb-3";

      col.innerHTML = `
        <div class="card h-100 shadow-sm text-center">
          <img src="${produto.imagem}" class="card-img-top mx-auto" alt="${produto.nome}">
          <div class="card-body">
            <h5 class="card-title">${produto.nome}</h5>
            <a href="https://wa.me/${produto.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de mais informações sobre: ' + produto.nome)}"
               target="_blank"
               class="btn btn-success btn-zap">
               Pedir agora <i class="fab fa-whatsapp mr-2"></i>
            </a>
          </div>
        </div>
      `;
      row.appendChild(col);
    });

    container.appendChild(row);
  }
}

/* ----------------- Helpers para deep-link / matching ----------------- */

/**
 * Pega categoria pedida na URL:
 * - prioriza ?categoria=Nome
 * - se não existir, usa location.hash (ex: #Ingredientes-Essenciais)
 */
function getRequestedCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('categoria')) {
    return params.get('categoria');
  }
  if (window.location.hash) {
    // hash sem '#' e decode
    return decodeURIComponent(window.location.hash.slice(1));
  }
  return null;
}

/**
 * Normaliza string para comparar (remove acentos, pontuação, lower case)
 */
function normalizeForCompare(s) {
  if (!s) return '';
  return s.toString()
    .normalize('NFD')                    // separa diacríticos
    .replace(/[\u0300-\u036f]/g, '')     // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')         // transforma não-alfa em espaço
    .trim();
}

/**
 * Encontra um elemento de menu (desktop ou mobile) cujo data-categoria
 * corresponda à categoria solicitada (faz comparação normalizada).
 * Retorna o primeiro link encontrado ou null.
 */
function findMenuLinkByCategory(requested) {
  if (!requested) return null;
  const normalizedRequested = normalizeForCompare(requested);

  // Busca em ambos menus: desktop e mobile (se existirem)
  const selectors = [
    '#menuCategorias .nav-link',        // seu menu desktop (id original)
    '.menuCategoriasMobile .nav-link'   // menu mobile (classe que você colocou)
  ];
  const allLinks = [];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(n => allLinks.push(n));
  });

  for (const link of allLinks) {
    const dataCat = link.getAttribute('data-categoria') || link.textContent || '';
    if (normalizeForCompare(dataCat) === normalizedRequested) return link;
  }

  return null;
}

/**
 * Fecha o menu mobile sidebar (remove classes). Não depende de outros escopos.
 */
function closeMobileMenu() {
  const sb = document.getElementById('sidebarCategorias');
  const ov = document.getElementById('overlayCategorias');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

/* ----------------- Inicialização e binding de eventos ----------------- */

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Carrega produtos (aguarda)
  try {
    await carregarProdutos();
  } catch (err) {
    // se falhar, mostra erro no console e aborta inicialização
    return;
  }

  // 2) Seleciona os links do menu (desktop + mobile) e coloca listeners (mantendo comportamento atual)
  const menuLinks = Array.from(document.querySelectorAll('#menuCategorias .nav-link'))
    .concat(Array.from(document.querySelectorAll('.menuCategoriasMobile .nav-link')));

  // Se não encontrou nenhum link, cria fallback mostrando todos
  if (!menuLinks.length) {
    exibirProdutos("todas");
    return;
  }

  // Event listener: clique no menu — chama exibirProdutos com data-categoria e destaca active
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // remove active de todos
      menuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const categoria = link.getAttribute('data-categoria') || 'todas';
      exibirProdutos(categoria);

      // se estiver em mobile, fecha o drawer
      closeMobileMenu();
      // atualiza URL sem recarregar (opcional, comentado):
      // history.replaceState(null, '', '?categoria=' + encodeURIComponent(categoria));
    });
  });

  // 3) Detecta se a página foi aberta com um filtro vindo da index (hash ou query)
  const requested = getRequestedCategoryFromUrl();
  if (requested) {
    const menuLink = findMenuLinkByCategory(requested);
    if (menuLink) {
      // simula o clique no link encontrado (vai chamar exibirProdutos com a string correta)
      menuLink.click();
    } else {
      // fallback: tenta usar a string bruta (pouco provável de funcionar se produto.categoria exige exato)
      // exibirProdutos(requested);
      // Se preferir mostrar "todos" em caso de mismatch:
      exibirProdutos("todas");
    }
  } else {
    // sem request => mostrar todos (comportamento antigo)
    // e marcar o link 'Todos' como ativo (se existir)
    const linkTodos = menuLinks.find(l => normalizeForCompare(l.getAttribute('data-categoria')) === 'todos');
    if (linkTodos) {
      menuLinks.forEach(l => l.classList.remove('active'));
      linkTodos.classList.add('active');
    }
    exibirProdutos("todas");
  }
});
