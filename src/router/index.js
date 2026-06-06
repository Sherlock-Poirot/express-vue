import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Price from "../views/Price.vue";
import Bill from "../views/Bill.vue";
import Area from "../views/Area.vue";
import Shop from "../views/Shop.vue";
import Login from "../views/Login.vue";
import Layout from "../views/Layout.vue";
import UserManage from "../views/UserManage.vue";
import RoleManage from "../views/RoleManage.vue";
import Menu from "../views/Menu.vue";
import Profile from "../views/Profile.vue";
import ComingSoon from "../views/ComingSoon.vue";
import { getToken } from "../utils/auth";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { title: "登录", requiresAuth: false }
  },
  {
    path: "/",
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      { path: "", name: "Home", component: Home, meta: { title: "首页" } },
      
      {
        path: "system/user",
        name: "UserManage",
        component: UserManage,
        meta: { title: "用户管理" },
      },
      {
        path: "system/role",
        name: "RoleManage",
        component: RoleManage,
        meta: { title: "角色管理" },
      },
      {
        path: "system/menu",
        name: "MenuManage",
        component: Menu,
        meta: { title: "菜单管理" },
      },
      
      {
        path: "settlement/price",
        name: "Price",
        component: Price,
        meta: { title: "价格管理" },
      },
      {
        path: "settlement/shop",
        name: "Shop",
        component: Shop,
        meta: { title: "店铺管理" },
      },
      {
        path: "settlement/bill",
        name: "Bill",
        component: Bill,
        meta: { title: "账单管理" },
      },
      {
        path: "settlement/employee",
        name: "StaffIndex",
        component: () => import("../views/Staff.vue"),
        meta: { title: "员工管理" },
      },
      
      {
        path: "report/profit",
        name: "ProfitReport",
        component: ComingSoon,
        meta: { title: "量本利报表" },
      },
      
      {
        path: "area",
        name: "Area",
        component: Area,
        meta: { title: "区域字典" },
      },
      
      {
        path: "profile",
        name: "Profile",
        component: Profile,
        meta: { title: "个人信息" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const baseTitle = "天晨快递财务系统";
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }

  const token = getToken();
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false && !token) {
    // 需要认证但未登录，跳转到登录页
    next("/login");
  } else if (to.path === "/login" && token) {
    // 已登录用户访问登录页，跳转到首页
    next("/");
  } else {
    next();
  }
});

export default router;
