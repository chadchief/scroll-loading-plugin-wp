(function () {
  // Detect WooCommerce shop/archive pages
  function isShopPage() {
    const b = document.body.classList;
    return (
      b.contains("post-type-archive-product") ||
      b.contains("tax-product_cat") ||
      b.contains("tax-product_tag") ||
      b.contains("woocommerce-shop") ||
      (b.contains("archive") && b.contains("woocommerce"))
    );
  }

  function init() {
    const settings = window.InfiniteScrollSettings || {};
    const thresholdPx = settings.thresholdPx || 1200;
    const doneMessage = settings.doneMessage || "No more products to display.";

    // Targets and selectors
    const candidateListSelectors = [
      settings.targetList,
      "main ul.products",
      ".woocommerce ul.products",
      "ul.products",
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

    // Helpers
    const first = (selectors, d = document) => {
      for (const sel of selectors) {
        const el = d.querySelector(sel);
        if (el) return el;
      }
      return null;
    };
    const findNextUrl = (d = document) => {
      const a = first(nextLinkSelectors, d);
      return a && a.href ? a.href : null;
    };
    const hidePagination = (d = document) => {
      d.querySelectorAll(
        [...paginationContainers, ...ancillaryHideSelectors].join(", ")
      ).forEach((el) => {
        el.setAttribute("hidden", "hidden");
        el.style.display = "none";
        el.style.visibility = "hidden";
      });
    };
    const renderDoneMessage = (list) => {
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
    };
    const appendChildrenHTML = (list, children) => {
      if (!list || !children || !children.length) return;
      const html = children.map((c) => c.outerHTML).join("");
      if (html) list.insertAdjacentHTML("beforeend", html);
    };
    const isNearBottom = (px) => {
      const viewport = window.innerHeight;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const scrollPos = window.scrollY + viewport;
      return docHeight - scrollPos <= px;
    };

    // Spinner
    let spinnerShownAt = 0;
    const MIN_SPINNER_MS = 300;
    const ensureSpinner = (list) => {
      let el = document.getElementById("isp-spinner");
      if (!el) {
        el = document.createElement("div");
        el.id = "isp-spinner";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.innerHTML =
          '<span class="loader" aria-hidden="true"></span><span>Loading…</span>';
        if (list.parentNode) list.parentNode.insertBefore(el, list.nextSibling);
        if (!document.getElementById("isp-spinner-css")) {
          const style = document.createElement("style");
          style.id = "isp-spinner-css";
          style.textContent =
            "#isp-spinner{display:none;width:100%;text-align:center;padding:12px 0;margin:8px 0 24px;color:#555}#isp-spinner .loader{width:22px;height:22px;border:3px solid #d0d0d0;border-top-color:#555;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:8px;animation:isp-rot .8s linear infinite}@keyframes isp-rot{to{transform:rotate(360deg)}}";
          document.head.appendChild(style);
        }
      }
      return el;
    };
    const showSpinner = (list) => {
      const el = ensureSpinner(list);
      spinnerShownAt = Date.now();
      el.style.display = "block";
      el.hidden = false;
      el.style.visibility = "visible";
    };
    const hideSpinner = () => {
      const el = document.getElementById("isp-spinner");
      if (!el) return;
      const elapsed = Date.now() - spinnerShownAt;
      const delay = elapsed < MIN_SPINNER_MS ? MIN_SPINNER_MS - elapsed : 0;
      if (delay > 0)
        setTimeout(() => {
          el.style.display = "none";
        }, delay);
      else el.style.display = "none";
    };

    // Hide pagination globally
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

    // Locate list & state
    const list = first(candidateListSelectors);
    if (!list) return;
    hidePagination(document);
    ensureSpinner(list);

    let nextUrl = findNextUrl(document);
    let loading = false;
    let done = !nextUrl;
    if (done && isShopPage()) renderDoneMessage(list);

    // Load more
    function loadMore() {
      if (!nextUrl || loading || done) return;
      loading = true;
      showSpinner(list);
      fetch(nextUrl, { credentials: "same-origin" })
        .then((r) => r.text())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          let newList =
            first(candidateListSelectors, doc) ||
            doc.querySelector(".wp-block-post-template") ||
            doc.querySelector("#wp--skip-link--target ul") ||
            doc.querySelector("main ul") ||
            doc.querySelector("ul");
          if (!newList) {
            done = true;
            if (isShopPage()) renderDoneMessage(list);
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
            if (isShopPage()) renderDoneMessage(list);
          }
        })
        .catch(() => {
          done = true;
          if (isShopPage()) renderDoneMessage(list);
        })
        .finally(() => {
          loading = false;
          hideSpinner();
        });
    }

    // Scroll handling
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
  }

  // Boot
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
