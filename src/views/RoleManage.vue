<template>
  <div class="page-container">
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd" v-if="hasBtnPermission('sys:role:add', '新增角色', '新增')">
        <el-icon><Plus /></el-icon>
        新增角色
      </el-button>
    </div>

    <div class="search-box">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="角色名称" v-if="hasBtnPermission('sys:role:query', '查询角色', '查询')">
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
            <el-button type="primary" size="small" @click="handleEdit(row)" v-if="hasBtnPermission('sys:role:edit', '编辑角色', '编辑', '修改')">编辑</el-button>
            <el-button type="success" size="small" @click="handleMenuAuth(row)" v-if="hasBtnPermission('sys:role:menuAuth', '菜单授权', '授权')">菜单授权</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)" v-if="hasBtnPermission('sys:role:delete', '删除角色', '删除', '移除')">删除</el-button>
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
      width="900px"
      :max-width="'90%'"
      :resizable="true"
      :drag="true"
      destroy-on-close
    >
      <div class="menu-auth-container">
        <div class="auth-tip">请选择要分配给该角色的菜单权限：</div>
        <div class="menu-table-box">
          <el-table
            :data="menuAuthTableData"
            v-loading="menuAuthLoading"
            border
            :span-method="menuAuthSpanMethod"
            ref="menuAuthTableRef"
          >
            <el-table-column label="菜单分类" min-width="180">
              <template #default="{ row }">
                <div v-if="row.categoryName" class="category-cell">
                  <el-checkbox
                    :model-value="selectedMenuIds.includes(row.categoryId)"
                    @click.prevent="toggleCategorySelection(row.categoryId)"
                  >
                    {{ row.categoryName }}
                  </el-checkbox>
                </div>
                <span v-else></span>
              </template>
            </el-table-column>
            <el-table-column label="菜单名称" min-width="200">
              <template #default="{ row }">
                <div v-if="row.menuName" class="menu-cell">
                  <el-checkbox
                    :model-value="selectedMenuIds.includes(row.id)"
                    @click.prevent="toggleMenuSelection(row.id, row.buttons)"
                  >
                    {{ row.menuName }}
                  </el-checkbox>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="按钮权限" min-width="350">
              <template #default="{ row }">
                <div v-if="row.buttons && row.buttons.length > 0" class="buttons-cell">
                  <el-checkbox
                    v-for="btn in row.buttons"
                    :key="btn.id"
                    :model-value="selectedMenuIds.includes(btn.id)"
                    @click.prevent="toggleButtonSelection(btn.id)"
                    class="button-checkbox"
                  >
                    {{ btn.menuName }}
                  </el-checkbox>
                </div>
                <span v-else class="empty-text">-</span>
              </template>
            </el-table-column>
          </el-table>
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

import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '@/utils/auth'

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
const menuAuthLoading = ref(false)
const menuAuthTableRef = ref(null)
const currentAuthRoleId = ref(null)
const menuAuthSubmitting = ref(false)
const selectedMenuIds = ref([])
const allMenuItems = ref([]) // 所有可选项（包括按钮）

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

// 表格合并处理
const categorySpanArr = ref([])

// 将菜单树转换为表格数据
const menuAuthTableData = computed(() => {
  const result = []
  categorySpanArr.value = []
  allMenuItems.value = []

  const processCategory = (category) => {
    const menus = category.children?.filter(m => m.menuType === 2) || []
    const allButtons = category.children?.filter(b => b.menuType === 3) || []

    if (menus.length === 0 && allButtons.length > 0) {
      // 收集所有按钮到可选项
      allButtons.forEach(btn => allMenuItems.value.push(btn))

      result.push({
        id: category.id,
        categoryName: category.menuName,
        categoryId: category.id,
        menuName: '',
        buttons: allButtons,
        isCategory: true
      })
      categorySpanArr.value.push({ row: 1, col: 1 })
    } else if (menus.length > 0) {
      menus.forEach((menu, index) => {
        const menuButtons = menu.children?.filter(b => b.menuType === 3) || []
        const combinedButtons = [...menuButtons, ...allButtons]

        // 收集所有按钮到可选项
        combinedButtons.forEach(btn => allMenuItems.value.push(btn))

        result.push({
          id: menu.id,
          categoryName: index === 0 ? category.menuName : '',
          categoryId: category.id,
          menuName: menu.menuName,
          buttons: combinedButtons,
          isCategory: false
        })

        if (index === 0) {
          categorySpanArr.value.push({ row: menus.length, col: 1 })
        } else {
          categorySpanArr.value.push({ row: 0, col: 0 })
        }
      })
    } else {
      result.push({
        id: category.id,
        categoryName: category.menuName,
        categoryId: category.id,
        menuName: '-',
        buttons: [],
        isCategory: true
      })
      categorySpanArr.value.push({ row: 1, col: 1 })
    }

    const subCategories = category.children?.filter(c => c.menuType === 1) || []
    subCategories.forEach(sub => processCategory(sub))
  }

  // 假设 menuAuthTreeData 存储菜单树数据
  menuAuthTreeData.value.forEach(category => {
    if (category.menuType === 1) {
      processCategory(category)
    }
  })

  return result
})

// 表格合并方法
const menuAuthSpanMethod = ({ row, column, rowIndex, columnIndex }) => {
  if (columnIndex === 0) {
    const span = categorySpanArr.value[rowIndex] || { row: 1, col: 1 }
    return {
      rowspan: span.row,
      colspan: span.col
    }
  }
}

// 获取分类下所有子节点ID（包括子分类、子菜单、按钮）
const getAllChildIds = (category) => {
  const ids = [category.id]
  if (category.children) {
    category.children.forEach(child => {
      ids.push(...getAllChildIds(child))
    })
  }
  return ids
}

// 切换分类选中状态
const toggleCategorySelection = (categoryId) => {
  const category = findCategoryById(menuAuthTreeData.value, categoryId)
  if (!category) return
  
  const allChildIds = getAllChildIds(category)
  const isCurrentlySelected = selectedMenuIds.value.includes(categoryId)
  
  if (isCurrentlySelected) {
    selectedMenuIds.value = selectedMenuIds.value.filter(id => !allChildIds.includes(id))
  } else {
    allChildIds.forEach(id => {
      if (!selectedMenuIds.value.includes(id)) {
        selectedMenuIds.value.push(id)
      }
    })
  }
}

// 根据ID查找分类节点
const findCategoryById = (categories, id) => {
  for (const category of categories) {
    if (category.id === id) return category
    if (category.children) {
      const found = findCategoryById(category.children, id)
      if (found) return found
    }
  }
  return null
}

// 切换菜单选中状态
const toggleMenuSelection = (menuId, buttons) => {
  const isCurrentlySelected = selectedMenuIds.value.includes(menuId)
  const buttonIds = buttons ? buttons.map(b => b.id) : []
  const allIds = [menuId, ...buttonIds]
  
  if (isCurrentlySelected) {
    selectedMenuIds.value = selectedMenuIds.value.filter(id => !allIds.includes(id))
  } else {
    allIds.forEach(id => {
      if (!selectedMenuIds.value.includes(id)) {
        selectedMenuIds.value.push(id)
      }
    })
  }
}

// 切换按钮选中状态
const toggleButtonSelection = (buttonId) => {
  const index = selectedMenuIds.value.indexOf(buttonId)
  if (index > -1) {
    selectedMenuIds.value.splice(index, 1)
  } else {
    selectedMenuIds.value.push(buttonId)
  }
}

// 菜单授权树数据
const menuAuthTreeData = ref([])

const getAllMenus = async () => {
  try {
    const res = await axios.get('/api/menu/all-tree')
    if (res.data.code === 200) {
      menuAuthTreeData.value = res.data.data || []
    }
  } catch (err) {
    console.error('获取菜单树失败:', err)
  }
}

const getRoleMenus = async (roleId) => {
  try {
    const res = await axios.get(`/api/role-menu/menu-ids/${roleId}`)
    if (res.data.code === 200) {
      selectedMenuIds.value = res.data.data || []
    }
  } catch (err) {
    console.error('获取角色菜单失败:', err)
    selectedMenuIds.value = []
  }
}

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
  menuAuthLoading.value = true

  try {
    // 获取所有菜单树
    await getAllMenus()
    // 获取角色已分配的菜单ID
    await getRoleMenus(row.id)
  } finally {
    menuAuthLoading.value = false
  }

  menuAuthDialogVisible.value = true
}

// 打开弹窗后设置选中状态（现在使用 checkbox 自动绑定，无需手动设置）
const setTableSelection = () => {
}

// 监听弹窗打开，设置选中状态（现在使用 checkbox 自动绑定，无需手动设置）
watch(menuAuthDialogVisible, (val) => {
  if (val) {
  }
})

const handleMenuAuthSubmit = async () => {
  menuAuthSubmitting.value = true
  try {
    await axios.post('/api/role-menu/assign', {
      roleId: currentAuthRoleId.value,
      menuIds: selectedMenuIds.value
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
  padding: 16px;

  @media (min-width: 1400px) {
    padding: 20px;
  }
}

.action-bar {
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    margin-bottom: 20px;
  }
}

.search-box {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    padding: 15px;
    margin-bottom: 20px;
  }
}

.table-box {
  margin-bottom: 16px;

  @media (min-width: 1400px) {
    margin-bottom: 20px;
  }
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
}

.menu-auth-container {
  padding: 10px 0;
}

.auth-tip {
  margin-bottom: 16px;
  color: #606266;
  font-size: 13px;

  @media (min-width: 1400px) {
    margin-bottom: 20px;
    font-size: 14px;
  }
}

.menu-table-box {
  max-height: 400px;
  overflow-y: auto;

  @media (min-width: 1400px) {
    max-height: 450px;
  }
}

.buttons-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.button-tag {
  margin: 2px 0;
  cursor: pointer;
}

.button-tag.is-hit {
  background-color: #fdf6ec;
  border-color: #f5dab1;
  color: #e6a23c;
}

.button-checkbox {
  margin: 2px 6px 2px 0;
}

.empty-text {
  color: #c0c4cc;
}

:deep(.el-table) {
  font-size: 12px;

  @media (min-width: 1400px) {
    font-size: 14px;
  }
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 500;
  padding: 8px 8px;

  @media (min-width: 1400px) {
    padding: 10px 12px;
  }
}

:deep(.el-table td) {
  padding: 8px 8px;

  @media (min-width: 1400px) {
    padding: 10px 12px;
  }
}

:deep(.el-table--border th) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table--border td) {
  border-bottom: 1px solid #ebeef5;
}
</style>
