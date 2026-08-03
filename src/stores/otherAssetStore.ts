import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface OtherAsset {
  id: string
  assetName: string
  assetNo: string
  category: string
  spec: string
  brand: string
  building: string
  floor: string
  location: string
  quantity: number
  unit: string
  vendor: string
  warrantyDate: string
  department: string
  responsible: string
  status: string
  priority: string
  remark: string
}

export const useOtherAssetStore = defineStore('otherAsset', () => {
  const assets = ref<OtherAsset[]>([])

  // ====== Mock 数据 ======
  if (assets.value.length === 0) {
    assets.value = [
      { id: 'm1', assetName: '办公桌', assetNo: 'BG202603001', category: '办公家具', spec: '1400x700x750mm', brand: '震旦', building: 'CT楼', floor: '3F', location: '302办公室', quantity: 12, unit: '张', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2029/03/14', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
      { id: 'm2', assetName: '会议椅', assetNo: 'BG202603002', category: '办公家具', spec: '网布升降款', brand: '得力', building: 'FF楼', floor: '7F', location: '701会议室', quantity: 20, unit: '把', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2028/03/14', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
      { id: 'm3', assetName: '饮水机', assetNo: 'SH202604003', category: '生活电器', spec: '立式冷热型 YR-1502', brand: '美的', building: '海关联检大楼(OB)', floor: '1F', location: '大厅东侧休息区', quantity: 2, unit: '台', vendor: '东莞市联创电器商行', warrantyDate: '2026/11/01', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '一般', remark: '' },
      { id: 'm4', assetName: '微波炉', assetNo: 'SH202604004', category: '生活电器', spec: '23L 机械式', brand: '格兰仕', building: 'CT楼', floor: '2F', location: '员工休息室', quantity: 3, unit: '台', vendor: '东莞市联创电器商行', warrantyDate: '2027/05/20', department: '物业服务部', responsible: '李秀兰', status: '闲置', priority: '一般', remark: '备用设备' },
      { id: 'm5', assetName: '文件柜', assetNo: 'BG202604005', category: '办公家具', spec: '1800x850x390mm 五层', brand: '欧林', building: 'CT楼', floor: '4F', location: '401档案室', quantity: 8, unit: '个', vendor: '东莞市华信办公家具有限公司', warrantyDate: '2030/01/10', department: '行政部', responsible: '陈小明', status: '在用', priority: '重要', remark: '存放重要档案文件' },
      { id: 'm6', assetName: '投影仪', assetNo: 'IT202605006', category: 'IT设备', spec: 'EPSON CB-X51 3700流明', brand: '爱普生', building: 'FF楼', floor: '7F', location: '702培训室', quantity: 1, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2028/08/15', department: '培训部', responsible: '张讲师', status: '维修中', priority: '重要', remark: '灯泡需更换' },
      { id: 'm7', assetName: '打印机', assetNo: 'IT202605007', category: 'IT设备', spec: 'HP LaserJet M429', brand: '惠普', building: 'CT楼', floor: '3F', location: '301文印室', quantity: 2, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2027/12/31', department: '综合管理部', responsible: '王建国', status: '在用', priority: '一般', remark: '' },
      { id: 'm8', assetName: '空调柜机', assetNo: 'KT202604008', category: '暖通设备', spec: '5匹 定频冷暖', brand: '格力', building: '海关联检大楼(OB)', floor: '2F', location: '201会议室', quantity: 2, unit: '台', vendor: '东莞市永达制冷设备有限公司', warrantyDate: '2029/06/30', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '重要', remark: '夏季制冷关键设备' },
      { id: 'm9', assetName: '复印机', assetNo: 'IT202605009', category: 'IT设备', spec: '理光 MP 2555SP', brand: '理光', building: 'CT楼', floor: '3F', location: '301文印室', quantity: 1, unit: '台', vendor: '东莞市科创办公设备有限公司', warrantyDate: '2027/03/15', department: '综合管理部', responsible: '王建国', status: '待报废', priority: '一般', remark: '频繁卡纸，多次维修无效' },
      { id: 'm10', assetName: '手推叉车', assetNo: 'GJ202604010', category: '工具器具', spec: '2吨 手动液压搬运车', brand: '诺力', building: 'CT楼', floor: '1F', location: '装卸货区', quantity: 4, unit: '台', vendor: '东莞市恒力起重设备有限公司', warrantyDate: '2028/01/20', department: '物流部', responsible: '赵大勇', status: '在用', priority: '重要', remark: '日常物料搬运' },
      { id: 'm11', assetName: '防静电工作台', assetNo: 'GJ202604011', category: '工具器具', spec: '1800x800x750mm', brand: '科汇', building: 'FF楼', floor: 'S夹层', location: '维修工作间', quantity: 3, unit: '张', vendor: '东莞市恒力起重设备有限公司', warrantyDate: '2029/09/01', department: '设备维修部', responsible: '孙班长', status: '在用', priority: '一般', remark: '' },
      { id: 'm12', assetName: '安全帽存放柜', assetNo: 'AQ202605012', category: '安全设备', spec: '20位 不锈钢', brand: '安盾', building: 'CT楼', floor: '1F', location: '安全通道入口', quantity: 2, unit: '个', vendor: '东莞市安防设备有限公司', warrantyDate: '2030/03/01', department: '安全部', responsible: '周安', status: '在用', priority: '重要', remark: '进出人员安全防护' },
      { id: 'm13', assetName: '电子秤', assetNo: 'GJ202605013', category: '工具器具', spec: '500kg 工业级地磅', brand: '耀华', building: 'CT楼', floor: '1F', location: '称重区', quantity: 1, unit: '台', vendor: '东莞市衡器设备有限公司', warrantyDate: '2027/08/20', department: '物流部', responsible: '赵大勇', status: '维修中', priority: '重要', remark: '显示异常，待校准' },
      { id: 'm14', assetName: '对讲机', assetNo: 'TX202604014', category: '通讯设备', spec: '摩托罗拉 XIR P3688', brand: '摩托罗拉', building: 'FF楼', floor: '1F', location: '保安值班室', quantity: 10, unit: '部', vendor: '东莞市无线电设备有限公司', warrantyDate: '2027/06/15', department: '安全部', responsible: '周安', status: '在用', priority: '重要', remark: '日常巡逻通讯' },
      { id: 'm15', assetName: '消防沙箱', assetNo: 'XF202604015', category: '消防设备', spec: '1立方米 不锈钢', brand: '安盾', building: 'CT楼', floor: 'B1', location: '地下室消防站', quantity: 2, unit: '个', vendor: '东莞市安防设备有限公司', warrantyDate: '2030/01/01', department: '安全部', responsible: '周安', status: '闲置', priority: '一般', remark: '备用消防物资' },
      { id: 'm16', assetName: '遮阳伞', assetNo: 'SH202606016', category: '生活电器', spec: '3m 方形 铝合金', brand: '艾美特', building: '海关联检大楼(OB)', floor: '1F', location: '户外休息区', quantity: 6, unit: '把', vendor: '东莞市日用品商行', warrantyDate: '2027/04/10', department: '物业服务部', responsible: '李秀兰', status: '在用', priority: '一般', remark: '季节性使用' },
    ]
  }

  function addAssets(newAssets: OtherAsset[]) {
    const existingNos = new Set(assets.value.map(a => a.assetNo).filter(Boolean))
    const existingKeys = new Set(assets.value.map(a => `${a.assetName}|${a.building}|${a.floor}|${a.location}`))
    const filtered = newAssets.filter(a => {
      if (a.assetNo && existingNos.has(a.assetNo)) return false
      const key = `${a.assetName}|${a.building}|${a.floor}|${a.location}`
      if (existingKeys.has(key)) return false
      return true
    })
    assets.value = [...assets.value, ...filtered]
    return { added: filtered.length, skipped: newAssets.length - filtered.length }
  }

  function removeAsset(id: string) {
    assets.value = assets.value.filter(a => a.id !== id)
  }

  function removeAssets(ids: string[]) {
    const idSet = new Set(ids)
    assets.value = assets.value.filter(a => !idSet.has(a.id))
  }

  function findById(id: string): OtherAsset | undefined {
    return assets.value.find(a => a.id === id)
  }

  const count = computed(() => assets.value.length)

  const buildingOptions = computed(() => [...new Set(assets.value.map(a => a.building).filter(Boolean))])

  return {
    assets,
    count,
    buildingOptions,
    addAssets,
    removeAsset,
    removeAssets,
    findById,
  }
})
