<template>
  <div>
    <div class="rai-page">
      <!-- 搜索栏 -->
      <el-form :model="filters" inline class="rai-search">
        <el-form-item label="资产名称">
          <el-input v-model="filters.assetName" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="资产编号">
          <el-input v-model="filters.assetNo" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="资产分类">
          <el-input v-model="filters.category" placeholder="请输入" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="所属建筑">
          <el-select v-model="filters.building" placeholder="全部" clearable style="width: 180px">
            <el-option v-for="b in buildingOptions" :key="b" :label="b" :value="b" />
          </el-select>
        </el-form-item>
        <el-form-item label="资产状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="在用" value="在用" />
            <el-option label="闲置" value="闲置" />
            <el-option label="维修中" value="维修中" />
            <el-option label="待报废" value="待报废" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <div class="rai-actions">
        <div class="rai-actions__left">
          <el-button type="primary" :icon="Upload" @click="openImport">导入资产</el-button>
          <el-button :icon="Download" @click="downloadTemplate">下载模板</el-button>
          <el-button type="danger" :icon="Delete" :disabled="selectedIds.length === 0" @click="batchDelete">
            批量删除（{{ selectedIds.length }}）
          </el-button>
        </div>
        <span class="rai-actions__count">共 {{ store.count }} 条记录</span>
      </div>

      <!-- 资产列表 -->
      <el-table
        ref="assetTableRef"
        :data="pagedAssets"
        border
        stripe
        style="width: 100%"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="assetName" label="资产名称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="assetNo" label="资产编号" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span :style="{ color: row.assetNo ? '#303133' : '#c0c4cc' }">{{ row.assetNo || '未填写' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="资产分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="120" show-overflow-tooltip />
        <el-table-column prop="brand" label="品牌" width="90" show-overflow-tooltip />
        <el-table-column prop="building" label="所属建筑" width="140" />
        <el-table-column prop="floor" label="楼层" width="70" />
        <el-table-column prop="location" label="具体位置" min-width="120" show-overflow-tooltip />
        <el-table-column label="数量" width="80" align="center">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="department" label="使用部门" width="110" show-overflow-tooltip />
        <el-table-column prop="responsible" label="责任人" width="80" />
        <el-table-column label="资产状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === '在用' ? 'success' : row.status === '闲置' ? 'info' : row.status === '维修中' ? 'warning' : 'danger'"
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="重要级别" width="80" align="center" />
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="deleteOne(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="rai-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredAssets.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </div>

    <!-- 导入资产对话框 -->
    <el-dialog v-model="importVisible" title="导入其他资产" width="1000px" :close-on-click-modal="false" destroy-on-close>
      <div class="rai-import">
        <!-- 上传区域 -->
        <div v-if="!importPreviewData.length" class="rai-import__upload">
          <el-upload
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            accept=".xlsx,.xls"
          >
            <el-icon :size="48" color="#409EFF"><Upload /></el-icon>
            <div class="el-upload__text">将 Excel 文件拖拽到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx / .xls 格式，请按<a href="javascript:void(0)" @click="downloadTemplate">导入模板</a>格式填写
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 错误提示 -->
        <div v-if="importErrorMsg" class="rai-import__error">
          <el-alert :title="importErrorMsg" type="error" show-icon :closable="false" />
        </div>

        <!-- 预览区域 -->
        <div v-if="importPreviewData.length" class="rai-import__preview">
          <div class="rai-import__info">
            <span>已解析 <strong>{{ importPreviewData.length }}</strong> 条资产数据</span>
            <el-button size="small" @click="resetImport">重新选择</el-button>
          </div>
          <el-table :data="importPreviewData.slice(0, 50)" border size="small" max-height="380" style="width: 100%">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="assetName" label="资产名称" min-width="110" show-overflow-tooltip />
            <el-table-column prop="assetNo" label="资产编号" width="140" show-overflow-tooltip />
            <el-table-column prop="category" label="分类" width="80" />
            <el-table-column prop="building" label="建筑" width="130" />
            <el-table-column prop="floor" label="楼层" width="60" />
            <el-table-column prop="location" label="位置" min-width="100" show-overflow-tooltip />
            <el-table-column prop="department" label="部门" width="100" show-overflow-tooltip />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === '在用' ? 'success' : row.status === '闲置' ? 'info' : row.status === '维修中' ? 'warning' : 'danger'"
                  size="small"
                >
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="importPreviewData.length > 50" class="rai-import__more">
            仅显示前 50 条，共 {{ importPreviewData.length }} 条记录
          </div>
        </div>
      </div>
      <template #footer>
        <div class="rai-dialog-footer">
          <span class="rai-dialog-footer__hint" v-if="store.count">当前已有 {{ store.count }} 条资产数据，新导入将追加合并</span>
          <el-button @click="importVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmImport" :disabled="!importPreviewData.length">确认导入</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Upload, Download, Delete, Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useOtherAssetStore, type OtherAsset } from '@/stores/otherAssetStore'

const store = useOtherAssetStore()

// ==================== 分页与选择 ====================
function mockAssets(): OtherAsset[] {
  return [
    { id: 'm1', assetName: '办公桌', assetNo: 'BG202603001', category: '办公家具', spec: '1400×700×750mm', brand: '震旦', building: 'CT楼', floor: '3F', location: '302办公室', quantity: 12, unit: '张', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2029/03/14', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
    { id: 'm2', assetName: '会议椅', assetNo: 'BG202603002', category: '办公家具', spec: '网布升降款', brand: '得力', building: 'FF楼', floor: '7F', location: '701会议室', quantity: 20, unit: '把', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2028/03/14', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
    { id: 'm3', assetName: '饮水机', assetNo: 'SH202604003', category: '生活电器', spec: '立式冷热型 YR-1502', brand: '美的', building: '海关联检大楼(OB)', floor: '1F', location: '大厅东侧休息区', quantity: 2, unit: '台', vendor: '东莞市联创电器商行', warrantyDate: '2026/11/01', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '一般', remark: '' },
    { id: 'm4', assetName: '微波炉', assetNo: 'SH202604004', category: '生活电器', spec: '23L 机械式', brand: '格兰仕', building: 'CT楼', floor: '2F', location: '员工休息室', quantity: 3, unit: '台', vendor: '东莞市联创电器商行', warrantyDate: '2027/05/20', department: '物业服务部', responsible: '李秀兰', status: '闲置', priority: '一般', remark: '备用设备' },
    { id: 'm5', assetName: '文件柜', assetNo: 'BG202604005', category: '办公家具', spec: '1800×850×390mm 五层', brand: '欧林', building: 'CT楼', floor: '4F', location: '401档案室', quantity: 8, unit: '个', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2030/01/10', department: '行政部', responsible: '陈小明', status: '在用', priority: '重要', remark: '存放重��档案文件' },
    { id: 'm6', assetName: '投影仪', assetNo: 'IT202605006', category: 'IT设备', spec: 'EPSON CB-X51 3700流明', brand: '爱普生', building: 'FF楼', floor: '7F', location: '702培训室', quantity: 1, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2028/08/15', department: '培训部', responsible: '张讲师', status: '维修中', priority: '重要', remark: '灯泡需更换' },
    { id: 'm7', assetName: '打印机', assetNo: 'IT202605007', category: 'IT设备', spec: 'HP LaserJet M429', brand: '惠普', building: 'CT楼', floor: '3F', location: '301文印室', quantity: 2, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2027/12/31', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
    { id: 'm8', assetName: '空调柜机', assetNo: 'KT202604008', category: '暖通设备', spec: '5匹 定频冷暖', brand: '格力', building: '海关联检大楼(OB)', floor: '2F', location: '201会议室', quantity: 2, unit: '台', vendor: '东莞市永达制冷设备有限公司', warrantyDate: '2029/06/30', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '重要', remark: '夏季制冷关键设备' },
    { id: 'm9', assetName: '复印机', assetNo: 'IT202605009', category: 'IT设备', spec: '理光 MP 2555SP 黑白数码复合机', brand: '理光', building: 'CT楼', floor: '3F', location: '301文印室', quantity: 1, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2027/03/15', department: '综合管理部', responsible: '王建国', status: '待报废', priority: '一般', remark: '频繁卡纸，多次维修无效' },
    { id: 'm10', assetName: '手推叉车', assetNo: 'GJ202604010', category: '工具器具', spec: '2吨 手动液压搬运车', brand: '诺力', building: 'CT楼', floor: '1F', location: '装卸货区', quantity: 4, unit: '台', vendor: '东莞市恒力起重设备有限公司', warrantyDate: '2028/01/20', department: '物流部', responsible: '赵大勇', status: '在用', priority: '重要', remark: '日常物料搬运' },
    { id: 'm11', assetName: '防静电工作台', assetNo: 'GJ202604011', category: '工具器具', spec: '1800×800×750mm', brand: '科汇', building: 'FF楼', floor: 'S夹层', location: '维修工作间', quantity: 3, unit: '张', vendor: '东莞市恒力起重设备有限公司', warrantyDate: '2029/09/01', department: '设备维修部', responsible: '孙班长', status: '在用', priority: '一般', remark: '' },
    { id: 'm12', assetName: '安全帽存放柜', assetNo: 'AQ202605012', category: '安全设备', spec: '20位 不锈钢', brand: '安盾', building: 'CT楼', floor: '1F', location: '安全通道入口', quantity: 2, unit: '个', vendor: '东莞市安防设备有限公司', warrantyDate: '2030/03/01', department: '安全部', responsible: '周安', status: '在用', priority: '重要', remark: '进出人员安全防护' },
    { id: 'm13', assetName: '电子秤', assetNo: 'GJ202605013', category: '工具器具', spec: '500kg 工业级地磅', brand: '耀华', building: 'CT楼', floor: '1F', location: '称重区', quantity: 1, unit: '台', vendor: '东莞市衡器设备有限公司', warrantyDate: '2027/08/20', department: '物流部', responsible: '赵大勇', status: '维修中', priority: '重要', remark: '显示异常，待校准' },
    { id: 'm14', assetName: '对讲机', assetNo: 'TX202604014', category: '通讯设备', spec: '摩托罗拉 XIR P3688', brand: '摩托罗拉', building: 'FF楼', floor: '1F', location: '保安值班室', quantity: 10, unit: '部', vendor: '东莞市无线电设备有限公司', warrantyDate: '2027/06/15', department: '安全部', responsible: '周安', status: '在用', priority: '重要', remark: '日常巡逻通讯' },
    { id: 'm15', assetName: '消防沙箱', assetNo: 'XF202604015', category: '消防设备', spec: '1m³ 不锈钢', brand: '安盾', building: 'CT楼', floor: 'B1', location: '地下室消防站', quantity: 2, unit: '个', vendor: '东莞市安防设备有限公司', warrantyDate: '2030/01/01', department: '安全部', responsible: '周安', status: '闲置', priority: '一般', remark: '备用消防物资' },
    { id: 'm16', assetName: '遮阳伞', assetNo: 'SH202606016', category: '生活电器', spec: '3m 方形 铝合金', brand: '艾美特', building: '海关联检大楼(OB)', floor: '1F', location: '户外休息区', quantity: 6, unit: '把', vendor: '东莞市日用品商行', warrantyDate: '2027/04/10', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '一般', remark: '季节性使用' },
  ]
}

// ==================== 资产数据（注入Mock） ====================
if (store.assets.length === 0) {
  store.addAssets(mockAssets())
}

const selectedIds = ref<string[]>([])
const currentPage = ref(1)
const pageSize = ref(20)

const buildingOptions = ['CT楼', 'FF楼', '海关联检大楼(OB)']

// ==================== 筛选 ====================
const filters = reactive({
  assetName: '',
  assetNo: '',
  category: '',
  building: '',
  status: '',
})

const filteredAssets = computed(() => {
  let list = store.assets
  if (filters.assetName) list = list.filter(a => a.assetName.includes(filters.assetName))
  if (filters.assetNo) list = list.filter(a => a.assetNo.includes(filters.assetNo))
  if (filters.category) list = list.filter(a => a.category.includes(filters.category))
  if (filters.building) list = list.filter(a => a.building === filters.building)
  if (filters.status) list = list.filter(a => a.status === filters.status)
  return list
})

const pagedAssets = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredAssets.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}
function handleReset() {
  filters.assetName = ''
  filters.assetNo = ''
  filters.category = ''
  filters.building = ''
  filters.status = ''
  currentPage.value = 1
}

// ==================== 选择 ====================
function onSelectionChange(rows: OtherAsset[]) {
  selectedIds.value = rows.map(r => r.id)
}

// ==================== 删除 ====================
function deleteOne(row: OtherAsset) {
  ElMessageBox.confirm(`确认删除资产「${row.assetName}」？`, '删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    store.removeAsset(row.id)
    selectedIds.value = selectedIds.value.filter(id => id !== row.id)
    ElMessage.success('已删除')
  }).catch(() => {})
}

function batchDelete() {
  const count = selectedIds.value.length
  ElMessageBox.confirm(`确认删除选中的 ${count} 条资产数据？此操作不可恢复。`, '批量删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    store.removeAssets(selectedIds.value)
    selectedIds.value = []
    currentPage.value = 1
    ElMessage.success(`已删除 ${count} 条资产数据`)
  }).catch(() => {})
}

// ==================== 导入 ====================
const importVisible = ref(false)
const importPreviewData = ref<OtherAsset[]>([])
const importErrorMsg = ref('')

function openImport() {
  importPreviewData.value = []
  importErrorMsg.value = ''
  importVisible.value = true
}

function handleFileChange(file: any) {
  importErrorMsg.value = ''
  const rawFile = file.raw
  if (!rawFile) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const XLSX = (window as any).XLSX
      if (!XLSX) {
        importErrorMsg.value = 'Excel 解析库未加载，请刷新页面后重试'
        return
      }
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        importErrorMsg.value = '未找到有效的工作表'
        return
      }
      const sheet = workbook.Sheets[firstSheet]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      const dataRows = rows.slice(2).filter((row: any[]) => {
        const firstCell = row[0]
        return firstCell && String(firstCell).trim() && !String(firstCell).startsWith('*')
      })

      importPreviewData.value = dataRows.map((row: any[], idx: number) => ({
        id: `import_${Date.now()}_${idx}`,
        assetName: String(row[0] || '').trim(),
        assetNo: String(row[1] || '').trim(),
        category: String(row[2] || '').trim(),
        spec: String(row[3] || '').trim(),
        brand: String(row[4] || '').trim(),
        building: String(row[5] || '').trim(),
        floor: String(row[6] || '').trim(),
        location: String(row[7] || '').trim(),
        quantity: parseInt(row[8]) || 1,
        unit: String(row[9] || '').trim(),
        vendor: String(row[10] || '').trim(),
        warrantyDate: String(row[11] || '').trim(),
        department: String(row[12] || '').trim(),
        responsible: String(row[13] || '').trim(),
        status: String(row[14] || '').trim() || '在用',
        priority: String(row[15] || '').trim(),
        remark: String(row[16] || '').trim(),
      })).filter(a => a.assetName)

      if (importPreviewData.value.length === 0) {
        importErrorMsg.value = '未解析到有效数据，请确认文件内容格式正确'
      }
    } catch (err: any) {
      importErrorMsg.value = '文件解析失败：' + (err.message || '请确认文件格式正确')
      importPreviewData.value = []
    }
  }
  reader.readAsArrayBuffer(rawFile)
}

function confirmImport() {
  const result = store.addAssets(importPreviewData.value)
  importVisible.value = false
  let msg = `成功导入 ${result.added} 条资产数据`
  if (result.skipped > 0) msg += `，跳过 ${result.skipped} 条重复数据`
  ElMessage.success(msg)
}

function resetImport() {
  importPreviewData.value = []
  importErrorMsg.value = ''
}

function downloadTemplate() {
  const XLSX = (window as any).XLSX
  if (!XLSX) {
    ElMessage.warning('模板生成功能暂不可用，请手动使用提供的 Excel 模板')
    return
  }
  const headers = ['*资产名称', '*资产编号', '*资产分类', '规格型号', '品牌', '*所属建筑', '*所在楼层', '*具体位置', '*数量', '*计量单位', '外包维修商', '保修截止日期', '使用部门', '责任人', '*资产状态', '重要级别', '备注描述']
  const tips = ['必填。资产的通用名称', '必填。须保证唯一', '必填。如：办公家具', '选填。如：1400×700×750mm', '选填。如：震旦、得力', '必填。如：CT楼', '必填。如：3F', '必填。如：302办公室', '必填。正整数，默认1', '必填。如：张、把、套、台', '选填', '选填。yyyy/mm/dd', '选填。如：综合管理部', '选填。责任人姓名', '必填。在用/闲置/维修中/待报废', '选填', '选填']
  const wsData = [headers, tips]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '资产导入')
  XLSX.writeFile(wb, '其他资产设备导入模板.xlsx')
}
</script>

<style scoped>
.rai-page {
  max-width: 1800px;
}
.rai-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.rai-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.rai-actions__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rai-actions__count {
  font-size: 13px;
  color: #909399;
}
.rai-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ===== 导入 ===== */
.rai-import__upload {
  padding: 20px 0;
}
.rai-import__upload :deep(.el-upload-dragger) {
  padding: 40px 20px;
}
.rai-import__error {
  margin-bottom: 16px;
}
.rai-import__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.rai-import__info strong {
  color: #409eff;
}
.rai-import__more {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
.rai-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.rai-dialog-footer__hint {
  font-size: 12px;
  color: #909399;
  margin-right: auto;
}
</style>
