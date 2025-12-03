(function () {
  const settings = window.InfiniteScrollSettings || {};
  const thresholdPx = settings.thresholdPx || 500;
  const doneMessage = settings.doneMessage || "No more products to display.";

  const candidateListSelectors = [
    settings.targetList,
    ".wp-block-post-template",
    "#wp--skip-link--target > div > ul",
    "#wp--skip-link--target ul",
    "main .wp-block-post-template",
    "main ul",
  ].filter(Boolean);
  const nextLinkSelectors = [
    ".wp-block-query-pagination-next a",
    ".wp-block-query-pagination-next",
    ".pagination .next a",
    ".nav-links .nav-next a",
    'a[rel="next"]',
    "a.next",
    ".woocommerce-pagination .next a",
    ".woocommerce-pagination a.next",
    ".woocommerce-pagination .next",
  ];
  const paginationContainers = [
    ".wp-block-query-pagination",
    ".pagination",
    ".nav-links",
    ".woocommerce-pagination",
    "nav.woocommerce-pagination",
    ".page-numbers",
    ".pagination-wrap",
  ];
  const ancillaryHideSelectors = [".woocommerce-result-count"];

  function selectFirst(selectors, scope) {
    const d = scope || document;
    for (const sel of selectors) {
      const el = d.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function findNextUrl(scope) {
    const a = selectFirst(nextLinkSelectors, scope);
    return a && a.href ? a.href : null;
  }
  function hidePagination(scope) {
    const d = scope || document;
    const allSel = [...paginationContainers, ...ancillaryHideSelectors];
    allSel.forEach((sel) => {
      d.querySelectorAll(sel).forEach((el) => {
        el.setAttribute("hidden", "hidden");
        el.style.display = "none";
        el.style.visibility = "hidden";
      });
    });
  }
  function renderDoneMessage(list) {
    if (!list || document.getElementById("infinite-scroll-done-msg")) return;
    const msg = document.createElement("div");
    msg.id = "infinite-scroll-done-msg";
    msg.textContent = doneMessage;
    msg.setAttribute("role", "status");
    msg.style.margin = "24px 0";
    msg.style.padding = "12px 16px";
    msg.style.background = "#f6f7f7";
    msg.style.border = "1px solid #dcdcde";
    msg.style.color = "#1d2327";
    msg.style.borderRadius = "4px";
    if (list.parentNode) list.parentNode.insertBefore(msg, list.nextSibling);
  }
  function appendChildrenHTML(list, children) {
    if (!list || !children || !children.length) return;
    const html = children.map((c) => c.outerHTML).join("");
    if (html) list.insertAdjacentHTML("beforeend", html);
  }
  function isNearBottom(px) {
    const viewport = window.innerHeight;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const scrollPos = window.scrollY + viewport;
    return docHeight - scrollPos <= px;
  }

  try {
    const styleId = "infinite-scroll-hide-pagination";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `nav.woocommerce-pagination, .woocommerce-pagination, .woocommerce-pagination .page-numbers, .woocommerce-pagination .page-numbers a, ${[
        ...paginationContainers,
        ...ancillaryHideSelectors,
      ].join(
        ", "
      )} { display: none !important; visibility: hidden !important; }`;
      document.head.appendChild(style);
    }
  } catch (_) {}

  const list = selectFirst(candidateListSelectors);
  if (!list) return;
  hidePagination(document);

  let nextUrl = findNextUrl(document);
  let loading = false;
  let done = !nextUrl;
  if (done) renderDoneMessage(list);

  function loadMore() {
    if (!nextUrl || loading || done) return;
    loading = true;
    fetch(nextUrl, { credentials: "same-origin" })
      .then((r) => r.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        let newList = selectFirst(candidateListSelectors, doc);
        if (!newList) {
          newList =
            doc.querySelector(".wp-block-post-template") ||
            doc.querySelector("#wp--skip-link--target ul") ||
            doc.querySelector("main ul") ||
            doc.querySelector("ul");
        }
        if (!newList) {
          done = true;
          return;
        }
        const children = Array.from(newList.children).filter((el) => {
          if (["UL", "OL"].includes(newList.tagName))
            return el.tagName === "LI";
          const isPagination = el.matches(
            ".wp-block-query-pagination, .pagination, .nav-links"
          );
          const looksLikePost = el.matches(
            ".wp-block-post, article, .post, .hentry, .entry"
          );
          return looksLikePost && !isPagination;
        });
        appendChildrenHTML(list, children);
        hidePagination(doc);
        nextUrl = findNextUrl(doc);
        if (!nextUrl) {
          done = true;
          renderDoneMessage(list);
        }
      })
      .catch(() => {
        done = true;
      })
      .finally(() => {
        loading = false;
      });
  }

  let scrollTick = false;
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      if (loading || done) return;
      if (isNearBottom(thresholdPx)) loadMore();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();
