// Marks the current page's nav link as active.
(function () {
  const links = document.querySelectorAll(".site-nav .links a");
  const path = window.location.pathname.split("/").pop() || "index.html";
  links.forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });
})();
