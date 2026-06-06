<template>
  <div class="page-container">
    <div class="table-box">
      <el-table :data="tableData" v-loading="loading" border :span-method="objectSpanMethod">
        <el-table-column label="菜单权限分类" min-width="200">
          <template #default="{ row }">
            <span>{{ row.categoryName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="菜单名称" min-width="250">
          <template #default="{ row }">
            <span>{{ row.menuName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="按钮权限" min-width="300">
          <template #default="{ row }">
            <div v-if="row.buttons && row.buttons.length > 0" class="buttons-cell">
              <el-tag
                v-for="btn in row.buttons"
                :key="btn.id"
                size="small"
                type="warning"
                class="button-tag"
              >
                {{ btn.menuName }}
              </el-tag>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'MenuManage'
})

import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const menuTree = ref([])
const spanArr = ref([])

const tableData = computed(() => {
  const result = []
  spanArr.value = []
  
  const processCategory = (category) => {
    const menus = category.children?.filter(m => m.menuType === 2) || []
    const allButtons = category.children?.filter(b => b.menuType === 3) || []
    
    if (menus.length === 0 && allButtons.length > 0) {
      result.push({
        id: category.id,
        categoryName: category.menuName,
        categoryId: category.id,
        menuName: '',
        buttons: allButtons
      })
      spanArr.value.push({ row: 1, col: 1 })
    } else if (menus.length > 0) {
      menus.forEach((menu, index) => {
        const menuButtons = menu.children?.filter(b => b.menuType === 3) || []
        const combinedButtons = [...menuButtons, ...allButtons]
        
        result.push({
          id: menu.id,
          categoryName: index === 0 ? category.menuName : '',
          categoryId: category.id,
          menuName: menu.menuName,
          buttons: combinedButtons
        })
        
        if (index === 0) {
          spanArr.value.push({ row: menus.length, col: 1 })
        } else {
          spanArr.value.push({ row: 0, col: 0 })
        }
      })
    } else {
      result.push({
        id: category.id,
        categoryName: category.menuName,
        categoryId: category.id,
        menuName: '-',
        buttons: []
      })
      spanArr.value.push({ row: 1, col: 1 })
    }
    
    const subCategories = category.children?.filter(c => c.menuType === 1) || []
    subCategories.forEach(sub => {
      processCategory(sub)
    })
  }
  
  menuTree.value.forEach(category => {
    if (category.menuType === 1) {
      processCategory(category)
    }
  })
  
  return result
})

const objectSpanMethod = ({ row, column, rowIndex, columnIndex }) => {
  if (columnIndex === 0) {
    const { row: r, col: c } = spanArr.value[rowIndex] || { row: 1, col: 1 }
    return {
      rowspan: r,
      colspan: c
    }
  }
}

const getMenuTree = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/menu/all-tree')
    if (res.data.code === 200) {
      menuTree.value = res.data.data || []
    } else {
      ElMessage.error(res.data.message || '获取菜单树失败')
    }
  } catch (err) {
    console.error('获取菜单树失败:', err)
    ElMessage.error('获取菜单树失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getMenuTree()
})
</script>

<style scoped>
.page-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.action-bar {
  margin-bottom: 20px;
}

.table-box {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.buttons-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.button-tag {
  margin: 2px 0;
}

.empty-text {
  color: #c0c4cc;
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
  padding: 12px 16px;
}

:deep(.el-table--border th) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table--border td) {
  border-bottom: 1px solid #ebeef5;
}
</style>
