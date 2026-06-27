<template>
  <div class="page-container">
    <div class="search-box">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="字典名称" v-if="hasBtnPermission('查询字典', '查询')">
          <el-input v-model="searchForm.dictName" placeholder="请输入字典名称" clearable />
        </el-form-item>
        <el-form-item label="字典编码" v-if="hasBtnPermission('查询字典', '查询')">
          <el-input v-model="searchForm.dictCode" placeholder="请输入字典编码" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getDictList">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="primary" @click="handleAddDict" v-if="hasBtnPermission('新增字典', '新增')">
            新增
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-box">
      <el-table :data="dictTableData" v-loading="dictLoading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="dictCode" label="字典编码" width="180" />
        <el-table-column prop="dictName" label="字典名称" width="180" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column prop="createTime" label="创建时间" width="140">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEditDict(row)" v-if="hasBtnPermission('编辑字典', '编辑', '修改')">编辑</el-button>
            <el-button type="success" size="small" @click="handleDictItems(row)" v-if="hasBtnPermission('字典项管理', '管理')">字典项</el-button>
            <el-button type="danger" size="small" @click="handleDeleteDict(row)" v-if="hasBtnPermission('删除字典', '删除', '移除')">删除</el-button>
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
        @size-change="getDictList"
        @current-change="getDictList"
      />
    </div>

    <el-dialog
      v-model="dictDialogVisible"
      :title="dictDialogTitle"
      width="600px"
      destroy-on-close
    >
      <el-form :model="dictForm" :rules="dictRules" ref="dictFormRef" label-width="100px">
        <el-form-item label="字典编码" prop="dictCode">
          <el-input v-model="dictForm.dictCode" placeholder="请输入字典编码" :disabled="isEditDict" />
        </el-form-item>
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="dictForm.dictName" placeholder="请输入字典名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="dictForm.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="dictForm.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="dictForm.status">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDictSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dictItemDialogVisible"
      :title="`字典项管理 - ${currentDict?.dictName || ''}`"
      width="1000px"
      destroy-on-close
    >
      <div class="dict-item-action">
        <el-button type="primary" size="small" @click="handleAddDictItem" v-if="hasBtnPermission('新增字典项', '新增')">
          <el-icon><Plus /></el-icon>
          新增字典项
        </el-button>
      </div>
      <div class="dict-item-table">
        <el-table :data="dictItemTableData" v-loading="dictItemLoading" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="dictValue" label="字典值" width="150" />
          <el-table-column prop="dictLabel" label="字典标签" width="150" />
          <el-table-column prop="description" label="描述" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="80" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEditDictItem(row)" v-if="hasBtnPermission('编辑字典项', '编辑', '修改')">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDeleteDictItem(row)" v-if="hasBtnPermission('删除字典项', '删除', '移除')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog
        v-model="dictItemFormVisible"
        :title="dictItemFormTitle"
        width="500px"
        destroy-on-close
      >
        <el-form :model="dictItemForm" :rules="dictItemRules" ref="dictItemFormRef" label-width="100px">
          <el-form-item label="字典值" prop="dictValue">
            <el-input v-model="dictItemForm.dictValue" placeholder="请输入字典值" />
          </el-form-item>
          <el-form-item label="字典标签" prop="dictLabel">
            <el-input v-model="dictItemForm.dictLabel" placeholder="请输入字典标签" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="dictItemForm.description" type="textarea" placeholder="请输入描述" />
          </el-form-item>
          <el-form-item label="排序" prop="sortOrder">
            <el-input-number v-model="dictItemForm.sortOrder" :min="0" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="dictItemForm.status">
              <el-option :value="1" label="启用" />
              <el-option :value="0" label="禁用" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dictItemFormVisible = false">取消</el-button>
          <el-button type="primary" @click="handleDictItemSubmit">确定</el-button>
        </template>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({
  name: 'DictManage'
})

import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from 'axios'
import { hasBtnPermission } from '@/utils/auth'

const dictLoading = ref(false)
const dictTableData = ref([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

const dictDialogVisible = ref(false)
const dictDialogTitle = ref('新增字典')
const isEditDict = ref(false)
const dictFormRef = ref(null)

const dictItemDialogVisible = ref(false)
const dictItemTableData = ref([])
const dictItemLoading = ref(false)
const currentDict = ref(null)

const dictItemFormVisible = ref(false)
const dictItemFormTitle = ref('新增字典项')
const isEditDictItem = ref(false)
const dictItemFormRef = ref(null)

const searchForm = reactive({
  dictName: '',
  dictCode: ''
})

const dictForm = reactive({
  id: null,
  dictCode: '',
  dictName: '',
  description: '',
  sortOrder: 0,
  status: 1
})

const dictRules = {
  dictCode: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }]
}

const dictItemForm = reactive({
  id: null,
  dictCode: '',
  dictValue: '',
  dictLabel: '',
  description: '',
  sortOrder: 0,
  status: 1
})

const dictItemRules = {
  dictValue: [{ required: true, message: '请输入字典值', trigger: 'blur' }],
  dictLabel: [{ required: true, message: '请输入字典标签', trigger: 'blur' }]
}

const getDictList = async () => {
  dictLoading.value = true
  try {
    const res = await axios.get('/api/dict/list')
    let data = res.data.data || []
    
    if (searchForm.dictName) {
      data = data.filter(item => item.dictName && item.dictName.includes(searchForm.dictName))
    }
    if (searchForm.dictCode) {
      data = data.filter(item => item.dictCode && item.dictCode.includes(searchForm.dictCode))
    }
    
    total.value = data.length
    const start = (pageNo.value - 1) * pageSize.value
    dictTableData.value = data.slice(start, start + pageSize.value)
  } catch (err) {
    console.error('获取字典列表失败:', err)
  } finally {
    dictLoading.value = false
  }
}

const resetSearch = () => {
  searchForm.dictName = ''
  searchForm.dictCode = ''
  pageNo.value = 1
  getDictList()
}

const handleAddDict = () => {
  dictDialogTitle.value = '新增字典'
  isEditDict.value = false
  Object.assign(dictForm, {
    id: null,
    dictCode: '',
    dictName: '',
    description: '',
    sortOrder: 0,
    status: 1
  })
  dictDialogVisible.value = true
}

const handleEditDict = (row) => {
  dictDialogTitle.value = '编辑字典'
  isEditDict.value = true
  Object.assign(dictForm, {
    id: row.id,
    dictCode: row.dictCode,
    dictName: row.dictName,
    description: row.description,
    sortOrder: row.sortOrder || 0,
    status: row.status
  })
  dictDialogVisible.value = true
}

const handleDictSubmit = async () => {
  if (!dictFormRef.value) return
  await dictFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEditDict.value) {
          await axios.put(`/api/dict/${dictForm.id}`, dictForm)
          ElMessage.success('更新成功')
        } else {
          await axios.post('/api/dict/create', dictForm)
          ElMessage.success('新增成功')
        }
        dictDialogVisible.value = false
        getDictList()
      } catch (err) {
        console.error('提交失败:', err)
      }
    }
  })
}

const handleDeleteDict = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该字典吗？删除后相关字典项也会被删除。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete(`/api/dict/${row.id}`)
    ElMessage.success('删除成功')
    getDictList()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const handleDictItems = async (row) => {
  currentDict.value = row
  await getDictItemList(row.dictCode)
  dictItemDialogVisible.value = true
}

const getDictItemList = async (dictCode) => {
  dictItemLoading.value = true
  try {
    const res = await axios.get(`/api/dict/items/${dictCode}`)
    dictItemTableData.value = res.data.data || []
  } catch (err) {
    console.error('获取字典项列表失败:', err)
  } finally {
    dictItemLoading.value = false
  }
}

const handleAddDictItem = () => {
  dictItemFormTitle.value = '新增字典项'
  isEditDictItem.value = false
  Object.assign(dictItemForm, {
    id: null,
    dictCode: currentDict.value.dictCode,
    dictValue: '',
    dictLabel: '',
    description: '',
    sortOrder: 0,
    status: 1
  })
  dictItemFormVisible.value = true
}

const handleEditDictItem = (row) => {
  dictItemFormTitle.value = '编辑字典项'
  isEditDictItem.value = true
  Object.assign(dictItemForm, {
    id: row.id,
    dictCode: row.dictCode,
    dictValue: row.dictValue,
    dictLabel: row.dictLabel,
    description: row.description,
    sortOrder: row.sortOrder || 0,
    status: row.status
  })
  dictItemFormVisible.value = true
}

const handleDictItemSubmit = async () => {
  if (!dictItemFormRef.value) return
  await dictItemFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEditDictItem.value) {
          await axios.put(`/api/dict/item/${dictItemForm.id}`, dictItemForm)
          ElMessage.success('更新成功')
        } else {
          await axios.post('/api/dict/item/create', dictItemForm)
          ElMessage.success('新增成功')
        }
        dictItemFormVisible.value = false
        await getDictItemList(currentDict.value.dictCode)
      } catch (err) {
        console.error('提交失败:', err)
      }
    }
  })
}

const handleDeleteDictItem = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该字典项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete(`/api/dict/item/${row.id}`)
    ElMessage.success('删除成功')
    await getDictItemList(currentDict.value.dictCode)
  } catch (err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
    }
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(() => {
  getDictList()
})
</script>

<style scoped>
.page-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
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

.dict-item-action {
  margin-bottom: 15px;
}

.dict-item-table {
  max-height: 400px;
  overflow-y: auto;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 500;
}

:deep(.el-table td) {
  padding: 10px 12px;
}

:deep(.el-table--border th) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table--border td) {
  border-bottom: 1px solid #ebeef5;
}
</style>