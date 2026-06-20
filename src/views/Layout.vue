<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <h2>天晨快递财务系统</h2>
      </div>
      <div class="sidebar-menu">
        <div
          v-for="menu in menuList"
          :key="menu.id"
          class="menu-item"
        >
          <template v-if="menu.children && menu.children.length > 0">
            <div
              class="menu-parent"
              @click="toggleMenu(menu.id)"
            >
              <el-icon :size="16"><component :is="getIcon(menu.icon)" /></el-icon>
              <span>{{ menu.menuName }}</span>
              <el-icon class="arrow-icon"><ArrowDown :class="{ 'rotated': openedMenus.includes(menu.id) }" /></el-icon>
            </div>
            <div
              v-show="openedMenus.includes(menu.id)"
              class="menu-children"
            >
              <div
                v-for="child in menu.children"
                :key="child.id"
                class="menu-child"
                :class="{ 'active': currentPath === child.path }"
                @click="openTab(child)"
              >
                {{ child.menuName }}
              </div>
            </div>
          </template>
          <div
            v-else-if="menu.menuType === 2"
            class="menu-parent"
            :class="{ 'active': currentPath === menu.path }"
            @click="openTab(menu)"
          >
            <el-icon :size="16"><component :is="getIcon(menu.icon)" /></el-icon>
            <span>{{ menu.menuName }}</span>
          </div>
        </div>
      </div>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentParentMenu">
              {{ currentParentMenu.menuName }}
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTab && currentTab.path !== '/'">
              {{ currentTab.menuName }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="40" class="user-avatar">{{ userAvatar }}</el-avatar>
              <span class="user-name">{{ currentUser?.realName || currentUser?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 标签页栏 -->
      <div class="tabs-bar" v-if="tabs.length > 0">
        <div class="tabs-container">
          <div
            v-for="tab in tabs"
            :key="tab.path"
            class="tab-item"
            :class="{ 'active': currentPath === tab.path }"
            @click="switchTab(tab)"
          >
            <span class="tab-title">{{ tab.menuName }}</span>
            <el-icon
              class="tab-close"
              v-if="tab.path !== '/'"
              @click.stop="closeTab(tab)"
            >
              <Close />
            </el-icon>
          </div>
        </div>
      </div>
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessageBox, ElMessage } from 'element-plus'
import { User, ArrowDown, SwitchButton, Document, Menu, Setting, DataLine, UserFilled, TrendCharts, Folder, Close } from '@element-plus/icons-vue'
import { getToken, getUser, clearAuth, setUser } from '../utils/auth'

const route = useRoute()
const router = useRouter()

const menuList = ref([])
const currentUser = ref(getUser())
const openedMenus = ref([])
const tabs = ref([])
const tabStates = ref({})
const cachedComponents = ref([])

const menuIconMap = {
  'el-icon-setting': Setting,
  'el-icon-user': User,
  'el-icon-s-custom': UserFilled,
  'el-icon-menu': Menu,
  'el-icon-document': Document,
  'el-icon-document-copy': Document,
  'el-icon-plus': Document,
  'el-icon-check': Document,
  'el-icon-download': Document,
  'el-icon-s-data': DataLine,
  'el-icon-trending-up': TrendCharts
}

const currentPath = computed(() => route.path)

const currentTab = computed(() => {
  return tabs.value.find(tab => tab.path === currentPath.value)
})

const currentParentMenu = computed(() => {
  if (!currentTab.value || currentTab.value.path === '/') {
    return null
  }
  
  for (const menu of menuList.value) {
    if (menu.children && menu.children.length > 0) {
      const child = menu.children.find(c => c.path === currentPath.value)
      if (child) {
        return menu
      }
    }
  }
  
  return null
})

const userAvatar = computed(() => {
  const name = currentUser.value?.realName || currentUser.value?.username || 'U'
  return name.charAt(0).toUpperCase()
})

const getIcon = (iconName) => {
  return menuIconMap[iconName] || Folder
}

const toggleMenu = (menuId) => {
  const index = openedMenus.value.indexOf(menuId)
  if (index > -1) {
    openedMenus.value.splice(index, 1)
  } else {
    openedMenus.value.push(menuId)
  }
}

const openTab = (menu) => {
  const existingTab = tabs.value.find(tab => tab.path === menu.path)
  if (!existingTab) {
    tabs.value.push({
      path: menu.path,
      menuName: menu.menuName,
      id: menu.id
    })
    updateCachedComponents()
  }
  router.push(menu.path)
}

const switchTab = (tab) => {
  router.push(tab.path)
}

const closeTab = (tab) => {
  const index = tabs.value.findIndex(t => t.path === tab.path)
  if (index > -1) {
    // 清除该页面的状态
    delete tabStates.value[tab.path]
    
    // 从缓存组件中移除，销毁组件实例
    const componentName = getComponentName(tab.path)
    const cachedIndex = cachedComponents.value.indexOf(componentName)
    if (cachedIndex > -1) {
      cachedComponents.value.splice(cachedIndex, 1)
    }
    
    tabs.value.splice(index, 1)
    
    if (currentPath.value === tab.path) {
      const nextTab = tabs.value[index] || tabs.value[index - 1]
      if (nextTab) {
        router.push(nextTab.path)
      } else {
        router.push('/')
      }
    }
  }
}

const updateCachedComponents = () => {
  cachedComponents.value = tabs.value.map(tab => {
    const componentName = getComponentName(tab.path)
    return componentName
  })
}

const getComponentName = (path) => {
  const pathMap = {
    '/': 'Dashboard',
    '/settlement/price': 'Price',
    '/settlement/shop': 'Shop',
    '/settlement/bill': 'Bill',
    '/settlement/employee': 'Staff',
    '/system/user': 'UserManage',
    '/system/role': 'RoleManage',
    '/area': 'Area',
    '/profile': 'Profile',
    '/report/profit': 'ProfitReport',
    '/report/policy': 'Policy',
    '/report/cost': 'CostManagement',
    '/dashboard': 'Dashboard'
  }
  return pathMap[path] || ''
}

const saveTabState = (path, state) => {
  tabStates.value[path] = state
}

const getTabState = (path) => {
  return tabStates.value[path]
}

const updateTabState = (path, state) => {
  if (tabStates.value[path]) {
    tabStates.value[path] = { ...tabStates.value[path], ...state }
  } else {
    tabStates.value[path] = state
  }
}

provide('saveTabState', saveTabState)
provide('getTabState', getTabState)
provide('updateTabState', updateTabState)

const fetchMenuTree = async () => {
  try {
    const res = await axios.get('/api/menu/tree')
    menuList.value = res.data.data || []
  } catch (err) {
    console.error('获取菜单失败:', err)
  }
}

const fetchCurrentUser = async () => {
  try {
    const res = await axios.post('/api/auth/current')
    currentUser.value = res.data.data
    setUser(res.data.data)
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await axios.post('/api/auth/logout')
      clearAuth()
      ElMessage.success('退出成功')
      router.push('/login')
    } catch (err) {
      if (err !== 'cancel') {
        console.error('退出失败:', err)
      }
    }
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => {
  fetchMenuTree()
  fetchCurrentUser()

  // 确保首页 tab 始终存在
  if (!tabs.value.find(tab => tab.path === '/')) {
    const homeTab = { path: '/', menuName: '首页', id: 'home' }
    tabs.value.push(homeTab)
    updateCachedComponents()
  }
})

watch(() => route.path, (newPath) => {
  if (newPath === '/' && tabs.value.length === 0) {
    const homeTab = { path: '/', menuName: '首页', id: 'home' }
    tabs.value.push(homeTab)
    updateCachedComponents()
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, #304156 0%, #1a2a3a 100%);
  overflow-x: hidden;
  overflow-y: auto;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

.logo h2 {
  margin: 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-menu {
  padding: 10px 0;
}

.menu-item {
  margin-bottom: 2px;
}

.menu-parent {
  display: flex;
  align-items: center;
  height: 44px;
  padding-left: 20px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-parent:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-parent.active {
  background: #409eff;
}

.menu-parent > .el-icon {
  margin-right: 8px;
  font-size: 16px;
  color: white;
}

.menu-parent > span {
  flex: 1;
  font-size: 14px;
}

.arrow-icon {
  font-size: 14px;
  color: white;
  transition: transform 0.2s;
}

.arrow-icon .rotated {
  transform: rotate(180deg);
}

.menu-children {
  background: #1a2a3a;
}

.menu-child {
  display: flex;
  align-items: center;
  height: 40px;
  padding-left: 50px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-child:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-child.active {
  background: #409eff;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-left .el-breadcrumb {
  font-size: 14px;
}

.header-left .el-breadcrumb__inner,
.header-left .el-breadcrumb__separator {
  color: #606266;
}

.header-left .el-breadcrumb__inner a {
  color: #606266;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.3s;
}

.user-info:hover {
  background: #f5f7fa;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  color: #606266;
}

.tabs-bar {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 8px 20px;
  display: flex;
  align-items: center;
}

.tabs-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
}

.tab-item.active {
  background: #409eff;
  border-color: #409eff;
  color: white;
}

.tab-title {
  font-size: 13px;
}

.tab-close {
  font-size: 14px;
  transition: transform 0.2s;
}

.tab-close:hover {
  transform: scale(1.2);
}

.tab-item.active .tab-close {
  color: white;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
