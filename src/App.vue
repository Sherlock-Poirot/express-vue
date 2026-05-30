<template>
  <div class="container">
    <!-- 左侧菜单 -->
    <div class="aside">
      <h3>快递财务系统</h3>
      <ul class="menu">
        <li
          v-for="item in menuList"
          :key="item.key"
          :class="{ active: $route.path === item.path }"
          @click="$router.push(item.path)"
        >
          {{ item.name }}
        </li>
      </ul>
    </div>

    <!-- 右侧内容 -->
    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
const menuList = [
  { key: "home", name: "首页", path: "/" },
  { key: "price", name: "客户价格", path: "/price" },
  { key: "shop", name: "店铺管理", path: "/shop" },
  { key: "bill", name: "账单处理", path: "/bill" },
  { key: "staff", name: "员工管理", path: "/staff" },
  { key: "area", name: "区域字典", path: "/area" },
];
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.container {
  display: flex;
  height: 100vh;
}
.aside {
  width: 220px;
  background: #2f4050;
  color: white;
  padding: 20px;
  flex-shrink: 0;
}
.aside h3 {
  margin-bottom: 20px;
  font-size: 16px;
}
.menu {
  list-style: none;
}
.menu li {
  padding: 12px 10px;
  cursor: pointer;
  border-radius: 4px;
}
.menu li:hover {
  background: #1f2d3d;
}
.menu li.active {
  background: #409eff;
}
.main {
  flex: 1;
  padding: 30px;
  background: #f3f3f4;
  overflow: auto;
}
.search-box {
  margin-bottom: 20px;
}
.search-box input {
  padding: 8px 12px;
  width: 300px;
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}
table {
  width: 100%;
  background: white;
  border-collapse: collapse;
  margin-top: 10px;
}
th,
td {
  padding: 12px;
  border: 1px solid #eee;
  text-align: center;
  white-space: nowrap;
}
th {
  background: #f8f8f8;
}
tbody tr:hover {
  background: #f5f7fa;
}
tbody tr.price-row {
  cursor: pointer;
}

/* 弹窗 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: white;
  width: 90%;
  max-width: 1200px;
  border-radius: 8px;
  padding: 20px;
  max-height: 90vh;
  overflow: auto;
  position: relative;
}
.modal-content::after {
  content: "";
  position: absolute;
  top: 15px;
  right: 15px;
  width: 120px;
  height: 120px;
  /* background-image: url("../public/logo.jpg"); */
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.4;
  pointer-events: none;
  z-index: 10;
}
.modal-header,
table {
  position: relative;
  z-index: 2;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}
.close-btn {
  cursor: pointer;
  font-size: 20px;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    height: auto;
  }
  .aside {
    width: 100%;
  }
  .main {
    padding: 15px;
    min-height: 100vh;
  }
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  table {
    display: block;
    overflow-x: auto;
  }
}

/* 遮罩层 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* 确认弹窗 */
.confirm-modal-box {
  background: #fff;
  width: 380px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.confirm-title {
  padding: 18px 20px 10px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.confirm-text {
  padding: 10px 24px 24px;
  font-size: 15px;
  color: #555;
  text-align: center;
  line-height: 1.5;
}
.confirm-btns {
  display: flex;
  border-top: 1px solid #f0f0f0;
}
.confirm-btn {
  flex: 1;
  border: none;
  padding: 15px 0;
  font-size: 15px;
  cursor: pointer;
}
.confirm-btn.cancel {
  background: #f9fafb;
  color: #666;
}
.confirm-btn.ok {
  background: #ff4d4f;
  color: #fff;
}

/* 消息弹窗（带确定）*/
.msg-modal-box {
  background: #fff;
  width: 320px;
  border-radius: 16px;
  padding: 30px 24px 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  text-align: center;
}
.msg-text {
  font-size: 15px;
  color: #333;
  margin-bottom: 24px;
  line-height: 1.5;
}
.msg-ok-btn {
  width: 100%;
  border: none;
  background: #1890ff;
  color: #fff;
  padding: 12px 0;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}
</style>
