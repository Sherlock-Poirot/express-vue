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
                @click="navigateTo(child.path)"
              >
                {{ child.menuName }}
              </div>
            </div>
          </template>
          <div
            v-else-if="menu.menuType === 2"
            class="menu-parent"
            :class="{ 'active': currentPath === menu.path }"
            @click="navigateTo(menu.path)"
          >
            <el-icon :size="16"><component :is="getIcon(menu.icon)" /></el-icon>
            <span>{{ menu.menuName }}</span>
          </div>
        </div>
      </div>
    </el-aside>
    
    <el-container>
      <el-header class="header">
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
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessageBox, ElMessage } from 'element-plus'
import { User, ArrowDown, SwitchButton, Document, Menu, Setting, DataLine, UserFilled, TrendCharts, Folder } from '@element-plus/icons-vue'
import { getToken, getUser, clearAuth, setUser } from '../utils/auth'

const route = useRoute()
const router = useRouter()

const menuList = ref([])
const currentUser = ref(getUser())
const openedMenus = ref([])

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

const navigateTo = (path) => {
  router.push(path)
}

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
})

watch(() => route.path, () => {
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
  background: linear-gradient(180deg, #304156 0%, #1a2a3a 100%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
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
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  color: white;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
