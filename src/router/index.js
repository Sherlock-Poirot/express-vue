import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Price from "../views/Price.vue";
import Bill from "../views/Bill.vue";
import Area from "../views/Area.vue";
import Shop from "../views/Shop.vue";

const routes = [
  { path: "/", name: "Home", component: Home, meta: { title: "首页" } },
  {
    path: "/price",
    name: "Price",
    component: Price,
    meta: { title: "客户价格" },
  },
  { path: "/bill", name: "Bill", component: Bill, meta: { title: "账单处理" } },
  { path: "/area", name: "Area", component: Area, meta: { title: "区域字典" } },
  { path: "/shop", name: "Shop", component: Shop, meta: { title: "店铺管理" } },
  {
    path: "/staff",
    name: "StaffIndex",
    component: () => import("../views/staff.vue"),
    meta: { title: "员工管理" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 🔥 核心：动态浏览器标题（切换页面自动更新）
router.beforeEach((to, from, next) => {
  const baseTitle = "天晨快递财务系统";
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
  next();
});

export default router;
