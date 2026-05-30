import { h, render } from "vue";

// 确认弹窗
const ConfirmContainer = {
  props: ["text", "onOk", "onCancel"],
  setup(props) {
    return () =>
      h(
        "div",
        { class: "modal-overlay" },
        h("div", { class: "confirm-modal-box" }, [
          h("div", { class: "confirm-title" }, "提示"),
          h("div", { class: "confirm-text" }, props.text),
          h("div", { class: "confirm-btns" }, [
            h(
              "button",
              { class: "confirm-btn cancel", onClick: props.onCancel },
              "取消",
            ),
            h(
              "button",
              { class: "confirm-btn ok", onClick: props.onOk },
              "确定",
            ),
          ]),
        ]),
      );
  },
};

// 消息弹窗（带确定按钮）
const MsgModalContainer = {
  props: ["text", "onClose"],
  setup(props) {
    return () =>
      h(
        "div",
        { class: "modal-overlay" },
        h("div", { class: "msg-modal-box" }, [
          h("div", { class: "msg-text" }, props.text),
          h("button", { class: "msg-ok-btn", onClick: props.onClose }, "确定"),
        ]),
      );
  },
};

// 确认
export function $confirm(text = "确定执行此操作吗？") {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const vnode = h(ConfirmContainer, {
      text,
      onOk: () => {
        resolve(true);
        destroy();
      },
      onCancel: () => {
        resolve(false);
        destroy();
      },
    });
    render(vnode, div);
    function destroy() {
      render(null, div);
      document.body.removeChild(div);
    }
  });
}

// 消息弹窗（手动关闭）
export function $msg(text) {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const vnode = h(MsgModalContainer, {
      text,
      onClose: () => {
        render(null, div);
        document.body.removeChild(div);
        resolve();
      },
    });
    render(vnode, div);
  });
}
