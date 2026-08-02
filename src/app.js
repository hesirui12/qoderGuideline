// app.js — 主题切换 / 进度条 / 目录搜索 / 键盘翻页 / 回到顶部
(function () {
  "use strict";

  // ---------- 主题 ----------
  var saved = localStorage.getItem("qoder-theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (dark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("qoder-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("qoder-theme", "dark");
      }
    });
  }

  // ---------- 年份 ----------
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ---------- 进度条 + 回到顶部 ----------
  var progress = document.getElementById("progress");
  var toTop = document.getElementById("totop");

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    if (progress) progress.style.width = pct + "%";
    if (toTop) toTop.classList.toggle("show", doc.scrollTop > 400);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ---------- 键盘翻页（章节页） ----------
  var body = document.body;
  if (body.dataset.page === "chapter") {
    var prev = parseInt(body.dataset.prev, 10);
    var next = parseInt(body.dataset.next, 10);
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft" && prev >= 1) {
        window.location.href = String(prev).padStart(2, "0") + ".html";
      } else if (e.key === "ArrowRight" && next <= 50) {
        window.location.href = String(next).padStart(2, "0") + ".html";
      }
    });
  }

  // ---------- 首页目录搜索 ----------
  var search = document.getElementById("ch-search");
  if (search) {
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      var cards = document.querySelectorAll(".ch-card");
      var parts = document.querySelectorAll(".part-block");
      cards.forEach(function (card) {
        var hay = (card.textContent || "").toLowerCase();
        var show = !q || hay.indexOf(q) !== -1;
        card.style.display = show ? "" : "none";
      });
      parts.forEach(function (part) {
        var any = Array.prototype.some.call(
          part.querySelectorAll(".ch-card"),
          function (c) { return c.style.display !== "none"; }
        );
        part.style.display = any ? "" : "none";
      });
    });
  }
})();
