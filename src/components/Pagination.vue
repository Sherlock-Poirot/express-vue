<template>
  <div class="pagination-container">
    <el-pagination
      v-model:current-page="localCurrentPage"
      v-model:page-size="localPageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      prev-text="上一页"
      next-text="下一页"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'change'])

const localCurrentPage = ref(props.currentPage)
const localPageSize = ref(props.pageSize)

watch(() => props.currentPage, (newVal) => {
  localCurrentPage.value = newVal
})

watch(() => props.pageSize, (newVal) => {
  localPageSize.value = newVal
})

const handleSizeChange = (val) => {
  localPageSize.value = val
  localCurrentPage.value = 1
  emit('update:pageSize', val)
  emit('update:currentPage', 1)
  emit('change', { pageNo: 1, pageSize: val })
}

const handleCurrentChange = (val) => {
  localCurrentPage.value = val
  emit('update:currentPage', val)
  emit('change', { pageNo: val, pageSize: props.pageSize })
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 16px;
  padding: 16px 0;
}
</style>
