const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(["serverUrl", "webhookSecret", "myBlogIds"], (cfg) => {
  $("serverUrl").value = cfg.serverUrl || "http://localhost:3000";
  $("webhookSecret").value = cfg.webhookSecret || "";
  $("myBlogIds").value = Array.isArray(cfg.myBlogIds)
    ? cfg.myBlogIds.join(", ")
    : cfg.myBlogIds || "";
});

$("saveBtn").addEventListener("click", () => {
  const myBlogIds = $("myBlogIds")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  chrome.storage.sync.set(
    {
      serverUrl: $("serverUrl").value.trim(),
      webhookSecret: $("webhookSecret").value.trim(),
      myBlogIds,
    },
    () => {
      $("status").textContent = "저장됨";
      setTimeout(() => ($("status").textContent = ""), 1500);
    },
  );
});
