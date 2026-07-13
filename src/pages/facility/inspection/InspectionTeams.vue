<template>
  <div>
    <div class="it-page">
      <el-form :model="query" inline class="it-search">
        <el-form-item label="班组名称">
          <el-input v-model="query.keyword" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="it-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新建班组</el-button>
      </div>

      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="name" label="班组名称" width="160" />
        <el-table-column prop="leader" label="班组长" width="100" />
        <el-table-column label="班组人员" min-width="280">
          <template #default="{ row }">
            <div class="it-members">
              <el-tag v-for="m in row.members" :key="m.name" size="small" style="margin: 2px 4px">{{ m.name }}</el-tag>
              <span v-if="row.members.length === 0" style="color: #c0c4cc; font-size: 13px">暂无人员</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="memberCount" label="人数" width="70" align="center" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="it-pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @change="applyFilters" />
      </div>
    </div>

    <!-- 新建/编辑班组抽屉 -->
    <el-drawer v-model="formVisible" :title="isEditing ? '编辑班组' : '新建班组'" direction="rtl" size="650px" :close-on-click-modal="false">
      <template #header>
        <span class="it-drawer-title">{{ isEditing ? '编辑班组' : '新建班组' }}</span>
      </template>
      <div class="it-drawer-body">
        <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" size="small">
          <el-form-item label="班组名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入班组名称" />
          </el-form-item>
          <el-form-item label="班组长" prop="leader">
            <el-select v-model="form.leader" placeholder="请搜索选择班组长" style="width: 100%" filterable>
              <el-option v-for="p in allPersonnel" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="it-member-section">
          <div class="it-member-section__title">班组人员</div>
          <div class="it-member-layout">
            <!-- 左侧：可选人员 -->
            <div class="it-member-panel it-member-panel--left">
              <div class="it-member-panel__header">
                <span class="it-member-panel__label">可选人员</span>
                <el-select v-model="deptFilter" placeholder="全部部门" clearable size="small" style="width: 130px">
                  <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
                </el-select>
              </div>
              <div class="it-member-panel__search">
                <el-input v-model="searchText" placeholder="搜索人员" clearable size="small" />
              </div>
              <div class="it-member-panel__list">
                <div
                  v-for="p in leftPersonnel"
                  :key="p.name"
                  class="it-member-item"
                  :class="{ 'it-member-item--selected': isSelected(p.name) }"
                  @click="toggleMember(p.name)"
                >
                  <span class="it-member-item__name">{{ p.name }}</span>
                  <span class="it-member-item__dept">{{ p.dept }}</span>
                </div>
                <el-empty v-if="leftPersonnel.length === 0" description="无匹配人员" :image-size="40" />
              </div>
            </div>

            <!-- 右侧：已选人员 -->
            <div class="it-member-panel it-member-panel--right">
              <div class="it-member-panel__header">
                <span class="it-member-panel__label">已选人员（{{ selectedMembers.length }}）</span>
                <el-button v-if="selectedMembers.length > 0" link type="danger" size="small" @click="selectedMembers = []">清空</el-button>
              </div>
              <div class="it-member-panel__list">
                <div v-for="name in selectedMembers" :key="name" class="it-member-item it-member-item--removable" @click="toggleMember(name)">
                  <span class="it-member-item__name">{{ name }}</span>
                  <span class="it-member-item__dept">{{ getDept(name) }}</span>
                </div>
                <el-empty v-if="selectedMembers.length === 0" description="请从左侧选择人员" :image-size="40" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="it-drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface Personnel { name: string; phone: string; dept: string }
interface Team {
  id: number
  name: string
  leader: string
  members: Personnel[]
  memberCount: number
}

const departments = ['运维部', '工程部', '安全部', '设备部', '管理部']

const allPersonnel: Personnel[] = [
  { name: '李建国', phone: '137****7001', dept: '运维部' },
  { name: '王德发', phone: '139****9002', dept: '运维部' },
  { name: '赵志强', phone: '136****6003', dept: '工程部' },
  { name: '张维修', phone: '138****8004', dept: '工程部' },
  { name: '陈师傅', phone: '135****5005', dept: '工程部' },
  { name: '刘工', phone: '133****3006', dept: '设备部' },
  { name: '周技师', phone: '131****1007', dept: '设备部' },
  { name: '吴工程师', phone: '132****2008', dept: '设备部' },
  { name: '孙班长', phone: '134****4009', dept: '安全部' },
  { name: '钱主管', phone: '136****6010', dept: '安全部' },
  { name: '郑师傅', phone: '138****8011', dept: '管理部' },
  { name: '冯技术员', phone: '139****9012', dept: '管理部' },
]

function mockTeams(): Team[] {
  return [
    { id: 1, name: '巡检一组', leader: '李建国', members: [{ name: '李建国', phone: '137****7001', dept: '运维部' }, { name: '陈师傅', phone: '135****5005', dept: '工程部' }, { name: '刘工', phone: '133****3006', dept: '设备部' }], memberCount: 3 },
    { id: 2, name: '巡检二组', leader: '王德发', members: [{ name: '王德发', phone: '139****9002', dept: '运维部' }, { name: '周技师', phone: '131****1007', dept: '设备部' }, { name: '孙班长', phone: '134****4009', dept: '安全部' }, { name: '郑师傅', phone: '138****8011', dept: '管理部' }], memberCount: 4 },
    { id: 3, name: '巡检三组', leader: '赵志强', members: [{ name: '赵志强', phone: '136****6003', dept: '工程部' }, { name: '张维修', phone: '138****8004', dept: '工程部' }], memberCount: 2 },
  ]
}

const allTeams = ref<Team[]>(mockTeams())
let nextId = 4

const page = ref(1)
const pageSize = ref(10)
const query = reactive({ keyword: '' })
const filtered = computed(() => {
  let list = allTeams.value
  if (query.keyword) list = list.filter(t => t.name.includes(query.keyword))
  return list
})
const total = computed(() => filtered.value.length)
const tableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
function applyFilters() { page.value = 1 }
function resetQuery() { query.keyword = ''; page.value = 1 }

const formRef = ref<FormInstance>()
const formVisible = ref(false)
const isEditing = ref(false)
const editingTeamId = ref(0)
const form = reactive({ name: '', leader: '' })
const formRules: FormRules = {
  name: [{ required: true, message: '请输入班组名称', trigger: 'blur' }],
  leader: [{ required: true, message: '请选择班组长', trigger: 'change' }],
}

const deptFilter = ref('')
const searchText = ref('')
const selectedMembers = ref<string[]>([])

const leftPersonnel = computed(() => {
  let list = allPersonnel
  if (deptFilter.value) list = list.filter(p => p.dept === deptFilter.value)
  if (searchText.value) list = list.filter(p => p.name.includes(searchText.value) || p.dept.includes(searchText.value))
  return list.filter(p => !selectedMembers.value.includes(p.name))
})

function isSelected(name: string) { return selectedMembers.value.includes(name) }
function toggleMember(name: string) {
  const idx = selectedMembers.value.indexOf(name)
  if (idx >= 0) selectedMembers.value.splice(idx, 1)
  else selectedMembers.value.push(name)
}
function getDept(name: string) { return allPersonnel.find(p => p.name === name)?.dept || '' }

function openCreate() {
  isEditing.value = false; editingTeamId.value = 0
  form.name = ''; form.leader = ''
  deptFilter.value = ''; searchText.value = ''
  selectedMembers.value = []
  formVisible.value = true
}
function openEdit(row: Team) {
  isEditing.value = true; editingTeamId.value = row.id
  form.name = row.name; form.leader = row.leader
  deptFilter.value = ''; searchText.value = ''
  selectedMembers.value = row.members.map(m => m.name)
  formVisible.value = true
}
function submitForm() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return
    const members = selectedMembers.value.map(name => {
      const p = allPersonnel.find(p => p.name === name)
      return p ? { ...p } : null
    }).filter(Boolean) as Personnel[]

    if (isEditing.value) {
      const team = allTeams.value.find(t => t.id === editingTeamId.value)
      if (team) { team.name = form.name; team.leader = form.leader; team.members = members; team.memberCount = members.length }
    } else {
      const id = nextId++
      allTeams.value.unshift({ id, name: form.name, leader: form.leader, members, memberCount: members.length })
    }
    formVisible.value = false
  })
}

function handleDelete(row: Team) {
  const idx = allTeams.value.findIndex(t => t.id === row.id)
  if (idx >= 0) allTeams.value.splice(idx, 1)
}
</script>

<style scoped>
.it-page { max-width: 1300px; }
.it-search { background: #fafbfc; padding: 16px; border-radius: 4px; margin-bottom: 16px; }
.it-actions { margin-bottom: 16px; }
.it-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
.it-members { display: flex; flex-wrap: wrap; }

.it-drawer-title { font-size: 18px; font-weight: 600; color: #303133; }
.it-drawer-body { padding: 0 4px; }
.it-drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }

.it-member-section { margin-top: 20px; }
.it-member-section__title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 10px; }
.it-member-layout { display: flex; gap: 0; height: 360px; border: 1px solid #ebeef5; border-radius: 4px; overflow: hidden; }

.it-member-panel { display: flex; flex-direction: column; width: 50%; }
.it-member-panel--left { border-right: 1px solid #ebeef5; }
.it-member-panel__header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #ebeef5; background: #fafbfc; }
.it-member-panel__label { font-size: 13px; font-weight: 600; color: #303133; }
.it-member-panel__search { padding: 8px 12px; border-bottom: 1px solid #ebeef5; }
.it-member-panel__list { flex: 1; overflow-y: auto; padding: 4px 0; }

.it-member-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #606266; transition: background 0.15s; border-bottom: 1px solid #f2f3f5; }
.it-member-item:hover { background: #ecf5ff; }
.it-member-item--selected { background: #e1f3d8; color: #67c23a; }
.it-member-item--removable { padding-right: 8px; }
.it-member-item__name { font-weight: 500; }
.it-member-item__dept { font-size: 11px; color: #909399; }
</style>
