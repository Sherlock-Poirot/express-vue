<template>
  <div class="profile-container">
    <div class="profile-card">
      <div class="avatar-section">
        <el-avatar :size="120" class="user-avatar">
          {{ userAvatar }}
        </el-avatar>
        <h2 class="user-name">{{ user?.realName || user?.username }}</h2>
        <p class="user-role" v-if="user?.roles">
          <el-tag v-for="(role, idx) in user.roles" :key="idx" style="margin-right: 5px;">
            {{ role }}
          </el-tag>
        </p>
      </div>

      <el-divider />

      <el-form :model="form" label-width="100px" class="info-form">
        <el-form-item label="账号">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { getUser, setUser } from '../utils/auth'

const user = ref(getUser())

const userAvatar = computed(() => {
  const name = user.value?.realName || user.value?.username || 'U'
  return name.charAt(0).toUpperCase()
})

const form = reactive({
  id: null,
  username: '',
  realName: '',
  phone: '',
  email: ''
})

const loadUserInfo = async () => {
  try {
    const res = await axios.post('/api/auth/current')
    user.value = res.data.data
    setUser(res.data.data)
    Object.assign(form, {
      id: res.data.data.userId,
      username: res.data.data.username,
      realName: res.data.data.realName || '',
      phone: '',
      email: ''
    })
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

const handleSubmit = async () => {
  try {
    await axios.post('/api/user/update', form)
    ElMessage.success('保存成功')
    await loadUserInfo()
  } catch (err) {
    console.error('保存失败:', err)
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.profile-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.profile-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  width: 100%;
  max-width: 600px;
}

.avatar-section {
  text-align: center;
  margin-bottom: 20px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 15px;
}

.user-name {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #333;
}

.user-role {
  margin: 0;
}

.info-form {
  margin-top: 30px;
}
</style>
