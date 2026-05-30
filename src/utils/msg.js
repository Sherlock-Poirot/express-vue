// 全局消息提示（成功/错误）
export const $msg = {
  // 成功（绿色）
  success(text) {
    showMsg(text, "success");
  },
  // 错误（红色）
  error(text) {
    showMsg(text, "error");
  },
  // 警告（黄色）
  warning(text) {
    showMsg(text, "warning");
  },
};

function showMsg(text, type) {
  const div = document.createElement("div");
  div.className = `global-msg ${type}`;
  div.innerText = text;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.opacity = 0;
    div.style.transform = "translate(-50%, -50px)";
    setTimeout(() => div.remove(), 300);
  }, 2500);
}
