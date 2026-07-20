<template>
  <div class="welcome-page">
    <div class="welcome-page__container">
      <section class="welcome-project" data-module-id="module-project">
        <div class="welcome-project__mark"><el-icon><OfficeBuilding /></el-icon></div>
        <div>
          <p class="welcome-project__label">原型项目</p>
          <h1>{{ projectConfig.projectName || '未配置项目名称' }}</h1>
          <p class="welcome-project__meta">项目原型工作台</p>
        </div>
      </section>

      <section class="welcome-panel" data-module-id="module-publish">
        <div class="welcome-panel__header">
          <div><h2>发布地址</h2><p>供开发、测试和评审人员访问当前版本。</p></div>
          <el-button v-if="isDevelopment && !editingAddresses" :icon="EditPen" @click="startEditAddresses">配置地址</el-button>
        </div>
        <div v-if="editingAddresses" class="welcome-address-form">
          <el-form label-width="92px">
            <el-form-item label="项目名称"><el-input v-model="addressDraft.projectName" placeholder="请输入项目名称" clearable /></el-form-item>
            <el-form-item label="原型发布地址"><el-input v-model="addressDraft.prototype" placeholder="请输入原型发布地址" clearable /></el-form-item>
            <el-form-item label="UI 发布地址"><el-input v-model="addressDraft.ui" placeholder="请输入 UI 发布地址" clearable /></el-form-item>
          </el-form>
          <div class="welcome-address-form__actions"><el-button @click="cancelEditAddresses">取消</el-button><el-button type="primary" @click="saveAddresses">保存</el-button></div>
        </div>
        <div v-else class="welcome-address-list">
          <div class="welcome-address-row"><div class="welcome-address-row__name"><el-icon><Monitor /></el-icon><span>原型发布地址</span></div><div class="welcome-address-row__value">{{ projectConfig.prototype || '暂未配置' }}</div><div class="welcome-address-row__actions"><el-button v-if="projectConfig.prototype" link type="primary" :icon="CopyDocument" @click="copyAddress(projectConfig.prototype)">复制</el-button><el-button v-if="projectConfig.prototype" link type="primary" :icon="Link" @click="openAddress(projectConfig.prototype)">打开</el-button></div></div>
          <div class="welcome-address-row"><div class="welcome-address-row__name"><el-icon><Grid /></el-icon><span>UI 发布地址</span></div><div class="welcome-address-row__value">{{ projectConfig.ui || '暂未配置' }}</div><div class="welcome-address-row__actions"><el-button v-if="projectConfig.ui" link type="primary" :icon="CopyDocument" @click="copyAddress(projectConfig.ui)">复制</el-button><el-button v-if="projectConfig.ui" link type="primary" :icon="Link" @click="openAddress(projectConfig.ui)">打开</el-button></div></div>
        </div>
      </section>

      <section class="welcome-panel" data-module-id="module-recent">
        <div class="welcome-panel__header"><div><h2>最近更新页面</h2><p>展示最近发生原型调整的 5 个页面。</p></div></div>
        <el-table :data="recentPages" border stripe style="width: 100%">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="pageName" label="页面名称" min-width="220" />
          <el-table-column label="原型状态" width="110" align="center"><template #default="{ row }"><el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">{{ row.status === 'completed' ? '已完成' : '设计中' }}</el-tag></template></el-table-column>
          <el-table-column prop="updatedAt" label="最近更新时间" width="190" />
          <el-table-column prop="description" label="更新说明" min-width="280" show-overflow-tooltip />
          <el-table-column label="操作" width="90" align="center"><template #default="{ row }"><el-button link type="primary" @click="goToPage(row)">查看</el-button></template></el-table-column>
        </el-table>
        <el-empty v-if="recentPages.length === 0" description="暂无页面更新记录" :image-size="70" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CopyDocument, EditPen, Grid, Link, Monitor, OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePrototypeStore } from '@/stores/prototypeStore'
import type { PrototypePage } from '@/types/prototype'
import storedProjectConfig from '@/data/project-publish-addresses.json'

interface ProjectConfig { projectName: string; prototype: string; ui: string }
interface RecentPage extends PrototypePage { status: string; updatedAt: string; description: string; timestamp: number }

const prototypeStore = usePrototypeStore()
const router = useRouter()
const isDevelopment = import.meta.env.DEV
const editingAddresses = ref(false)
const projectConfig = reactive<ProjectConfig>({
  projectName: storedProjectConfig.projectName,
  prototype: storedProjectConfig.prototype,
  ui: storedProjectConfig.ui,
})
const addressDraft = reactive<ProjectConfig>({ projectName: '', prototype: '', ui: '' })

const allPages = computed(() => flattenPages(prototypeStore.pages))
const recentPages = computed<RecentPage[]>(() => allPages.value
  .map(page => {
    const metadata = prototypeStore.getPageMetadata(page.pageId)
    const latest = [...metadata.versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    return {
      ...page,
      status: metadata.status,
      updatedAt: latest ? formatTime(latest.createdAt) : '暂无更新记录',
      description: latest?.description || '暂无更新说明',
      timestamp: latest ? new Date(latest.createdAt).getTime() : 0,
    }
  })
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 5))

onMounted(async () => {
  prototypeStore.loadPageMetadata()
  if (!isDevelopment) return

  try {
    const response = await fetch('/api/project-publish-addresses')
    if (!response.ok) throw new Error('load failed')
    const data = await response.json() as Partial<ProjectConfig>
    projectConfig.projectName = typeof data.projectName === 'string' ? data.projectName : ''
    projectConfig.prototype = typeof data.prototype === 'string' ? data.prototype : ''
    projectConfig.ui = typeof data.ui === 'string' ? data.ui : ''
  } catch {
    ElMessage.warning('发布地址读取失败，已使用项目配置文件中的默认值')
  }
})

function flattenPages(pages: PrototypePage[]): PrototypePage[] {
  return pages.flatMap(page => page.isFolder ? flattenPages(page.children || []) : [page])
}

function startEditAddresses() {
  addressDraft.projectName = projectConfig.projectName
  addressDraft.prototype = projectConfig.prototype
  addressDraft.ui = projectConfig.ui
  editingAddresses.value = true
}

function cancelEditAddresses() {
  editingAddresses.value = false
}

async function saveAddresses() {
  const addresses = { projectName: addressDraft.projectName.trim(), prototype: addressDraft.prototype.trim(), ui: addressDraft.ui.trim() }
  try {
    const response = await fetch('/api/project-publish-addresses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addresses),
    })
    if (!response.ok) throw new Error('save failed')
    projectConfig.projectName = addresses.projectName
    projectConfig.prototype = addresses.prototype
    projectConfig.ui = addresses.ui
    editingAddresses.value = false
    ElMessage.success('发布地址已保存')
  } catch {
    ElMessage.error('发布地址保存失败，请确认开发服务正在运行')
  }
}

async function copyAddress(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('地址已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制地址')
  }
}

function openAddress(value: string) {
  window.open(value, '_blank', 'noopener,noreferrer')
}

function goToPage(page: PrototypePage) {
  prototypeStore.setCurrentPage(page.pageId)
  if (page.pagePath) router.push(page.pagePath)
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style lang="scss" scoped>
.welcome-page { height:100%; overflow:auto; padding:28px; }.welcome-page__container { max-width:1180px; margin:0 auto; }.welcome-project { display:flex; align-items:center; gap:16px; padding:22px 24px; margin-bottom:16px; background:#fff; border:1px solid $border-color; border-radius:6px; }.welcome-project__mark { display:grid; place-items:center; width:48px; height:48px; color:#fff; background:$primary-color; border-radius:6px; font-size:24px; }.welcome-project__label { color:$text-secondary; font-size:12px; }.welcome-project h1 { margin:3px 0 4px; color:$text-color; font-size:22px; line-height:1.35; }.welcome-project__meta { color:$text-secondary; font-size:13px; }.welcome-panel { margin-bottom:16px; padding:18px 20px; background:#fff; border:1px solid $border-color; border-radius:6px; }.welcome-panel__header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }.welcome-panel h2 { color:$text-color; font-size:15px; line-height:1.4; }.welcome-panel p { margin-top:4px; color:$text-secondary; font-size:13px; }.welcome-address-list { border:1px solid #ebeef5; border-radius:4px; overflow:hidden; }.welcome-address-row { display:grid; grid-template-columns:180px minmax(0,1fr) 120px; align-items:center; min-height:54px; padding:0 14px; border-bottom:1px solid #ebeef5; font-size:13px; }.welcome-address-row:last-child { border-bottom:0; }.welcome-address-row__name { display:flex; align-items:center; gap:8px; color:$text-color; font-weight:500; }.welcome-address-row__name .el-icon { color:$primary-color; }.welcome-address-row__value { overflow:hidden; color:$text-secondary; text-overflow:ellipsis; white-space:nowrap; }.welcome-address-row__actions { display:flex; justify-content:flex-end; gap:4px; }.welcome-address-form { padding:16px; background:#fafbfc; border:1px solid #ebeef5; border-radius:4px; }.welcome-address-form__actions { display:flex; justify-content:flex-end; gap:8px; }.welcome-panel :deep(.el-table__cell) { padding:10px 0; } @media (max-width:800px) { .welcome-page { padding:16px; }.welcome-address-row { grid-template-columns:1fr; gap:7px; padding:12px 14px; }.welcome-address-row__actions { justify-content:flex-start; }.welcome-panel { overflow-x:auto; } }
</style>
