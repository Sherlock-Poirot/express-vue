import { createApp } from "vue";
import App from "./App.vue";
import router, { handleAuthError } from "./router";
import { $confirm, $msg } from "./utils/confirm";
import axios from "axios";
import "./assets/css/global.css";
import { getToken, clearAuth } from "./utils/auth";

// 🔥 在这里加入 Element Plus
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/dist/locale/zh-cn.mjs";

const app = createApp(App);

// 🔥 注册 Element Plus 并设置中文语言
app.use(ElementPlus, { locale: zhCn });

// ====================
// 全局 axios 配置（核心！）
// ====================
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['satoken'] = token;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

axios.interceptors.response.use(
  (res) => {
    // 如果是 blob 类型的响应，直接返回，不做 code 检查
    if (res.config.responseType === 'blob') {
      return res;
    }
    if (res.data.code !== 200) {
      $msg.error(res.data.message || "操作失败");
      return Promise.reject(res.data.message);
    }
    return res;
  },
  (err) => {
    // 如果是 blob 类型的请求错误，需要特殊处理
    if (err.config && err.config.responseType === 'blob') {
      return Promise.reject(err);
    }
    // 处理401和403认证错误
    if (err.response && err.response.status) {
      const status = err.response.status;
      if (handleAuthError(status)) {
        return Promise.reject('Auth error');
      }
    }
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
