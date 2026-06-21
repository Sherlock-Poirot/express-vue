<template>
  <div class="page-container">
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd" v-if="hasBtnPermission('新增用户', '新增')">
        <el-icon><Plus /></el-icon>
        新增用户
      </el-button>
    </div>

    <div class="search-box">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="账号">
          <el-input v-model="searchForm.username" placeholder="请输入账号" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="searchForm.realName" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-box">
      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="账号" width="150" />
        <el-table-column prop="realName" label="姓名" width="150" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="150">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="150">
          <template #default="{ row }">
            {{ formatDate(row.updateTime || row.updatetime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)" v-if="hasBtnPermission('编辑用户', '编辑', '修改')">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="handleStatus(row)"
              v-if="hasBtnPermission('禁用/启用用户', '禁用', '启用', '状态')"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="info" size="small" @click="handleAuthorize(row)" v-if="hasBtnPermission('用户授权', '授权', '角色授权')">授权</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)" v-if="hasBtnPermission('删除用户', '删除', '移除')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-box">
      <el-pagination
        v-model:current-page="pageNo"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList"
        @current-change="getList"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 授权弹窗 -->
    <el-dialog
      v-model="authDialogVisible"
      title="角色授权"
      width="500px"
      destroy-on-close
    >
      <div class="auth-container">
        <div class="auth-tip">请选择要分配给该用户的角色：</div>
        <el-checkbox-group v-model="selectedRoleIds" class="role-list">
          <el-checkbox 
            v-for="role in allRoles" 
            :key="role.id" 
            :value="role.id"
            class="role-item"
          >
            {{ role.roleName }}
          </el-checkbox>
        </el-checkbox-group>
        <div v-if="allRoles.length === 0" class="empty-roles">
          暂无可分配的角色
        </div>
      </div>
      <template #footer>
        <el-button @click="authDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAuthSubmit" :loading="authSubmitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'UserManage'
})

import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '@/utils/auth'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const isEdit = ref(false)
const formRef = ref(null)

// 授权相关
const authDialogVisible = ref(false)
const allRoles = ref([])
const selectedRoleIds = ref([])
const currentAuthUserId = ref(null)
const authSubmitting = ref(false)

const searchForm = reactive({
  username: '',
  realName: ''
})

const form = reactive({
  id: null,
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const getList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/user/page', {
      params: {
        pageNo: pageNo.value,
        pageSize: pageSize.value,
        username: searchForm.username,
        realName: searchForm.realName
      }
    })
    tableData.value = res.data.data.records || []
    total.value = res.data.data.total || 0
  } catch (err) {
    console.error('获取列表失败:', err)
  } finally {
    loading.value = false
  }
}

const getAllRoles = async () => {
  try {
    const res = await axios.get('/api/role/list')
    if (res.data.code === 200) {
      allRoles.value = res.data.data || []
    }
  } catch (err) {
    console.error('获取角色列表失败:', err)
  }
}

const getUserRoles = async (userId) => {
  try {
    const res = await axios.get(`/api/user-role/role-ids/${userId}`)
    if (res.data.code === 200) {
      selectedRoleIds.value = res.data.data || []
    }
  } catch (err) {
    console.error('获取用户角色失败:', err)
  }
}

const resetSearch = () => {
  searchForm.username = ''
  searchForm.realName = ''
  pageNo.value = 1
  getList()
}

const handleAdd = () => {
  dialogTitle.value = '新增用户'
  isEdit.value = false
  Object.assign(form, {
    id: null,
    username: '',
    password: '',
    realName: '',
    phone: '',
    email: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    username: row.username,
    password: '',
    realName: row.realName,
    phone: row.phone,
    email: row.email
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const url = isEdit.value ? '/api/user/update' : '/api/user/add'
        await axios.post(url, form)
        ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
        dialogVisible.value = false
        getList()
      } catch (err) {
        console.error('提交失败:', err)
      }
    }
  })
}

const handleStatus = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要${row.status === 1 ? '禁用' : '启用'}该用户吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await axios.post('/api/user/status', null, {
      params: { id: row.id, status: row.status === 1 ? 0 : 1 }
    })
    ElMessage.success('操作成功')
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('操作失败:', err)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.post('/api/user/delete', row.id)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

// 授权功能
const handleAuthorize = async (row) => {
  currentAuthUserId.value = row.id
  selectedRoleIds.value = []
  await getAllRoles()
  await getUserRoles(row.id)
  authDialogVisible.value = true
}

const handleAuthSubmit = async () => {
  authSubmitting.value = true
  try {
    await axios.post('/api/user-role/assign', {
      userId: currentAuthUserId.value,
      roleIds: selectedRoleIds.value
    })
    ElMessage.success('授权成功')
    authDialogVisible.value = false
  } catch (err) {
    console.error('授权失败:', err)
    ElMessage.error('授权失败')
  } finally {
    authSubmitting.value = false
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.page-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.action-bar {
  margin-bottom: 20px;
}

.search-box {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.table-box {
  margin-bottom: 20px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
}

.auth-container {
  padding: 10px 0;
}

.auth-tip {
  margin-bottom: 20px;
  color: #606266;
  font-size: 14px;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  padding: 8px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-right: 0 !important;
  transition: all 0.3s;
}

.role-item:hover {
  background: #f5f7fa;
}

.empty-roles {
  text-align: center;
  padding: 30px;
  color: #909399;
}
</style>
