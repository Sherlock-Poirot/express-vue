<template>
  <div class="page-container">
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增角色
      </el-button>
    </div>

    <div class="search-box">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="角色名称">
          <el-input v-model="searchForm.roleName" placeholder="请输入角色名称" clearable />
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
        <el-table-column prop="roleName" label="角色名称" width="150" />
        <el-table-column prop="roleCode" label="角色编码" width="150" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleMenuAuth(row)">菜单授权</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" placeholder="请输入角色编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 菜单授权弹窗 -->
    <el-dialog
      v-model="menuAuthDialogVisible"
      title="菜单授权"
      width="600px"
      destroy-on-close
    >
      <div class="menu-auth-container">
        <div class="auth-tip">请选择要分配给该角色的菜单权限：</div>
        <div class="menu-tree-box">
          <el-tree
            ref="menuTreeRef"
            :data="menuTreeData"
            :props="menuTreeProps"
            node-key="id"
            show-checkbox
            default-expand-all
            :expand-on-click-node="false"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="menuAuthDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleMenuAuthSubmit" :loading="menuAuthSubmitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'RoleManage'
})

import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from 'axios'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const isEdit = ref(false)
const formRef = ref(null)

// 菜单授权相关
const menuAuthDialogVisible = ref(false)
const menuTreeData = ref([])
const menuTreeRef = ref(null)
const currentAuthRoleId = ref(null)
const menuAuthSubmitting = ref(false)
const menuTreeProps = {
  children: 'children',
  label: 'menuName'
}

const searchForm = reactive({
  roleName: ''
})

const form = reactive({
  id: null,
  roleName: '',
  roleCode: '',
  description: '',
  sortOrder: 0,
  status: 1
})

const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const getList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/role/page', {
      params: {
        pageNo: pageNo.value,
        pageSize: pageSize.value,
        roleName: searchForm.roleName
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

const getAllMenus = async () => {
  try {
    const res = await axios.get('/api/menu/all-tree')
    if (res.data.code === 200) {
      menuTreeData.value = res.data.data || []
    }
  } catch (err) {
    console.error('获取菜单树失败:', err)
  }
}

const getRoleMenus = async (roleId) => {
  try {
    const res = await axios.get(`/api/role-menu/menus/${roleId}`)
    if (res.data.code === 200) {
      // 提取所有菜单ID
      const menuIds = []
      const extractIds = (nodes) => {
        nodes.forEach(node => {
          menuIds.push(node.id)
          if (node.children && node.children.length > 0) {
            extractIds(node.children)
          }
        })
      }
      extractIds(res.data.data || [])
      
      // 设置勾选状态
      nextTick(() => {
        if (menuTreeRef.value) {
          menuTreeRef.value.setCheckedKeys(menuIds)
        }
      })
    }
  } catch (err) {
    console.error('获取角色菜单失败:', err)
  }
}

import { nextTick } from 'vue'

const resetSearch = () => {
  searchForm.roleName = ''
  pageNo.value = 1
  getList()
}

const handleAdd = () => {
  dialogTitle.value = '新增角色'
  isEdit.value = false
  Object.assign(form, {
    id: null,
    roleName: '',
    roleCode: '',
    description: '',
    sortOrder: 0,
    status: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑角色'
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    roleName: row.roleName,
    roleCode: row.roleCode,
    description: row.description,
    sortOrder: row.sortOrder || 0,
    status: row.status
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const url = isEdit.value ? '/api/role/update' : '/api/role/add'
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

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该角色吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.post('/api/role/delete', row.id)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

// 菜单授权功能
const handleMenuAuth = async (row) => {
  currentAuthRoleId.value = row.id
  await getAllMenus()
  
  // 清空选中状态
  if (menuTreeRef.value) {
    menuTreeRef.value.setCheckedKeys([])
  }
  
  await getRoleMenus(row.id)
  menuAuthDialogVisible.value = true
}

const handleMenuAuthSubmit = async () => {
  menuAuthSubmitting.value = true
  try {
    // 获取所有选中的菜单ID
    const checkedKeys = menuTreeRef.value.getCheckedKeys()
    // 同时获取半选中的父节点ID
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys()
    // 合并所有选中的ID
    const allMenuIds = [...checkedKeys, ...halfCheckedKeys]
    
    await axios.post('/api/role-menu/assign', {
      roleId: currentAuthRoleId.value,
      menuIds: allMenuIds
    })
    ElMessage.success('菜单授权成功')
    menuAuthDialogVisible.value = false
  } catch (err) {
    console.error('菜单授权失败:', err)
    ElMessage.error('菜单授权失败')
  } finally {
    menuAuthSubmitting.value = false
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

.menu-auth-container {
  padding: 10px 0;
}

.auth-tip {
  margin-bottom: 20px;
  color: #606266;
  font-size: 14px;
}

.menu-tree-box {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

:deep(.el-tree-node__content) {
  padding: 5px 0;
}
</style>
