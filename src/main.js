import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { $confirm, $msg } from "./utils/confirm";
import axios from "axios";
import "./assets/css/global.css";

// 🔥 在这里加入 Element Plus
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

const app = createApp(App);

// 🔥 注册 Element Plus
app.use(ElementPlus);

// ====================
// 全局 axios 配置（核心！）
// ====================
axios.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      $msg.error(res.data.message || "操作失败");
      return Promise.reject(res.data.message);
    }
    return res;
  },
  (err) => {
    const msg = err?.response?.data?.message || err.message || "服务异常";
    $msg.error(msg);
    return Promise.reject(msg);
  },
);

// 全局挂载
app.config.globalProperties.$axios = axios;
app.config.globalProperties.$confirm = $confirm;
app.config.globalProperties.$msg = $msg;

app.use(router).mount("#app");
