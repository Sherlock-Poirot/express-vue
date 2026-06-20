import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Dashboard from "../views/Dashboard.vue";
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
import Error403 from "../views/Error403.vue";
import Policy from "../views/Policy.vue";
import { getToken, removeToken, removeUser } from "../utils/auth";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { title: "登录", requiresAuth: false }
  },
  {
    path: "/403",
    name: "Error403",
    component: Error403,
    meta: { title: "无权限", requiresAuth: false }
  },
  {
    path: "/",
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      { path: "dashboard", name: "Dashboard", component: Dashboard, meta: { title: "数据大屏" } },
      { path: "", redirect: "/dashboard" },
      
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
        component: () => import("../views/ProfitReport.vue"),
        meta: { title: "量本利报表" },
      },
      {
        path: "report/policy",
        name: "Policy",
        component: Policy,
        meta: { title: "政策管理" },
      },
      {
        path: "report/cost",
        name: "CostManagement",
        component: () => import("../views/CostManagement.vue"),
        meta: { title: "成本管理" },
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

router.beforeEach((to, from) => {
  const baseTitle = "天晨快递财务系统";
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }

  const token = getToken();
  if (to.meta.requiresAuth !== false && !token) {
    return "/login";
  } else if (to.path === "/login" && token) {
    return "/";
  }
});

export const handleAuthError = (errorCode) => {
  if (errorCode === 401) {
    removeToken();
    removeUser();
    router.push("/login");
    return true;
  } else if (errorCode === 403) {
    router.push("/403");
    return true;
  }
  return false;
};

export default router;
