/**
 * 设备分布 —— 设备分类与设备实例数据
 *
 * 数据来源：smart_park_dev（东莞园区开发库 192.168.161.57）
 *   · 设备分类 equip_device_def：一个 def_code 即一个设备分类，不按 def_category_code 归并大类；已排除「直连测试电表设备」
 *   · 设备实例 equip_device_instance：原始 95 条，剔除 8 条无效记录后 87 条
 * 原始数据与清洗口径见 /c材料/设备数据/
 *
 * 口径说明：
 *   · location 已去掉顶层前缀「东莞空港中心/」；实例表中未绑定空间的 14 台设备显示「—」
 *   · 原型页面只呈现「在线 / 离线」两种运行状态，实例表中的 unactivated（未激活）在本页按离线呈现
 *   · updatedAt 优先取 last_stat_change，缺失时回落到 update_time
 *   · left / top 为底图上的示意坐标（百分比），用于呈现设备落在哪个区域，非真实经纬度
 */
import type { Component } from 'vue'
import {
  Aim,
  Bell,
  Cellphone,
  Headset,
  Lightning,
  Lock,
  Microphone,
  Monitor,
  Odometer,
  Open,
  Phone,
  Promotion,
  Refrigerator,
  Sunny,
  VideoCamera,
  Warning,
} from '@element-plus/icons-vue'

export type DeviceStatus = 'online' | 'offline'

export interface DeviceCategory {
  /** 设备分类编码：即 equip_device_def.def_code */
  value: string
  label: string
  color: string
  icon: Component
}

export interface DeviceItem {
  /** 设备编号：equip_device_instance.device_id */
  id: string
  name: string
  /** 所属分类：equip_device_instance.def_code */
  category: string
  status: DeviceStatus
  /** 空间归属：equip_device_instance.space_full_name（已去顶层前缀） */
  location: string
  updatedAt: string
  left: number
  top: number
}

/** 设备分类（16 类，一个 defCode 一类） */
export const deviceCategories: DeviceCategory[] = [
  { value: 'camera', label: '摄像头', color: '#3f6fd8', icon: VideoCamera },
  { value: 'barriergate', label: '道闸', color: '#29a7d8', icon: Open },
  { value: 'accessControl', label: '门禁', color: '#c0508f', icon: Lock },
  { value: 'intercom', label: '对讲机', color: '#00b3a4', icon: Microphone },
  { value: 'digitalPhone', label: '数字电话', color: '#7d6cf0', icon: Phone },
  { value: 'vhfRadio', label: 'VHF电台', color: '#a06ae0', icon: Headset },
  { value: 'emergencyIntercom', label: '紧急对讲', color: '#e5636a', icon: Bell },
  { value: 'digitalBroadcast', label: '数字广播', color: '#d977b8', icon: Promotion },
  { value: 'refrigeratedContainer', label: '冷藏箱', color: '#0f8f8f', icon: Refrigerator },
  { value: 'lighting', label: '照明', color: '#f0a020', icon: Sunny },
  { value: 'infoScreen', label: '信息屏', color: '#7d8ba8', icon: Monitor },
  { value: 'differentialGnss', label: '差分定位', color: '#7cb342', icon: Aim },
  { value: 'chargingPile', label: '充电桩', color: '#16a085', icon: Lightning },
  { value: 'fireEquipment', label: '消防设备', color: '#d9534f', icon: Warning },
  { value: 'energyMeter', label: '能耗表具', color: '#5f6b7a', icon: Odometer },
  { value: '6a63154d46cb677f93c2f110', label: '无线对讲', color: '#a58a3c', icon: Cellphone },
]

/** 设备实例（87 台） */
export const deviceList: DeviceItem[] = [
  { id: '9e9c0b5b0a2f4f888f7562782aa37d44', name: '园区制高点瞭望摄像机', category: 'camera', status: 'online', location: '园区主路', updatedAt: '2026-08-24 14:44', left: 44, top: 45 },
  { id: '72faeda9c1e04b2d97655fa4bb4a24a2', name: '货运站作业信息屏-02', category: 'infoScreen', status: 'offline', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: 'a59636f1d256485f85b5b8a3f0253a4a', name: 'A栋大厅信息屏', category: 'infoScreen', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:45', left: 46, top: 27 },
  { id: 'fdc26679ff024913af34779daa39a80e', name: '冷链仓库门禁', category: 'accessControl', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 26, top: 38 },
  { id: '454060bb73db49a59a8c463280a8152b', name: '水表3F', category: 'energyMeter', status: 'offline', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:46', left: 64, top: 30 },
  { id: '7522e14b3930449c8e17a4820d697624', name: '冷链冷藏箱-04', category: 'refrigeratedContainer', status: 'offline', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 26, top: 38 },
  { id: '148954ae6c134ac08744a3d4c39b0220', name: '东门出口摄像头', category: 'camera', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 72, top: 46 },
  { id: '697fa41973f74c06965b1347a97afac6', name: '数字广播终端-B栋3F', category: 'digitalBroadcast', status: 'online', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:45', left: 64, top: 30 },
  { id: '9936646e434b4333be3fff7654c69e35', name: '数字广播终端-货运站', category: 'digitalBroadcast', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: 'f2fc14be4d26474dbedf731b67499af6', name: '数字广播终端-A栋1F', category: 'digitalBroadcast', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:45', left: 46, top: 27 },
  { id: '3a951c469a8740f7b35bc2c49cb31c2b', name: '冷链冷藏箱-02', category: 'refrigeratedContainer', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 24.4, top: 39.3 },
  { id: 'wireless-5G-mt-1200', name: '无线对讲-1200', category: '6a63154d46cb677f93c2f110', status: 'offline', location: '—', updatedAt: '2026-09-09 08:31', left: 44, top: 45 },
  { id: '580cbec1c25a4bc2995969bd96f4eff4', name: 'A栋机房烟感-01', category: 'fireEquipment', status: 'online', location: 'A栋/机房', updatedAt: '2026-08-24 14:45', left: 51, top: 20 },
  { id: '804cae1a01524cd5be09dfbd2d2fa5e2', name: '电表4F', category: 'energyMeter', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 64, top: 30 },
  { id: 'c7f4701502554dd9a00395758442dc91', name: '南门出口道闸', category: 'barriergate', status: 'online', location: '南门', updatedAt: '2026-08-24 14:44', left: 54, top: 74 },
  { id: '571ddce554324af5b4de665318046d35', name: '门禁控制器1F-1_门_3', category: 'accessControl', status: 'offline', location: '—', updatedAt: '2026-09-03 15:43', left: 46, top: 27 },
  { id: '8efa126a66e44b27818943cecb92923d', name: 'VHF基站电台-01', category: 'vhfRadio', status: 'online', location: '调度中心', updatedAt: '2026-08-24 14:45', left: 60, top: 56 },
  { id: 'a40d990b36b544859c370db8497b8d0e', name: '货运站入口道闸', category: 'barriergate', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:44', left: 30, top: 22 },
  { id: '0730c3dcb54043ebbe7b94d05d863d17', name: '地下停车场入口摄像头', category: 'camera', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:44', left: 50, top: 62 },
  { id: 'a5c7298bd97140c587d12acc678ead3f', name: '冷链仓库摄像头', category: 'camera', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 26, top: 38 },
  { id: '9e192d584b4142f99b4225aa1d2db828', name: '南门入口摄像头', category: 'camera', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 52.4, top: 75.3 },
  { id: '9ea21ae643c74280b3f0ee07ed1ef71b', name: '电表3F', category: 'energyMeter', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 62.4, top: 31.3 },
  { id: '04889af065c242588992657310e79dac', name: '门禁控制器1F-1_门_1', category: 'accessControl', status: 'online', location: '—', updatedAt: '2026-09-03 15:43', left: 44.4, top: 28.3 },
  { id: 'ea9477bffa86401f80358a2d530498f5', name: 'B栋办公数字电话-01', category: 'digitalPhone', status: 'online', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:44', left: 64, top: 30 },
  { id: '2a723665012b4defadf685ddfcc16d11', name: 'A栋机房门禁', category: 'accessControl', status: 'online', location: 'A栋/机房', updatedAt: '2026-08-24 14:44', left: 51, top: 20 },
  { id: 'c0b15cf2b8934e15868e24b91505c198', name: '交流充电桩AC-01', category: 'chargingPile', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 50, top: 62 },
  { id: 'ae454bc6120249ac8e5bbde852df1770', name: '电表CT-2F', category: 'energyMeter', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 64.2, top: 27.7 },
  { id: '249dc25caf1d42f1a8b5d3cfa17fbdd1', name: '调度手持对讲机-03', category: 'intercom', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:44', left: 30, top: 22 },
  { id: '1611da96ec5744c59a16a64e5ca900d3', name: '东门出口道闸', category: 'barriergate', status: 'online', location: '东门', updatedAt: '2026-08-24 14:44', left: 72, top: 46 },
  { id: '22a418148fde4cb68cfd5122630a8f6f', name: '差分定位基准站-01', category: 'differentialGnss', status: 'online', location: '机坪作业区', updatedAt: '2026-08-24 14:45', left: 72, top: 66 },
  { id: '82caf8134b674e27b328caa166df55cb', name: 'B栋紧急对讲终端-01', category: 'emergencyIntercom', status: 'online', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:45', left: 64, top: 30 },
  { id: '033fb61d44ac4fca9c0c5422c055cb0f', name: '货运站高杆灯H02', category: 'lighting', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: 'c4945217d61a48c393784aa7bdbac1fe', name: '调度手持对讲机-01', category: 'intercom', status: 'online', location: '调度中心', updatedAt: '2026-08-24 14:44', left: 60, top: 56 },
  { id: 'c6047a628bcd4272bfc5a1617942077d', name: '货运站作业信息屏-01', category: 'infoScreen', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 28.4, top: 23.3 },
  { id: 'e69c2a4bd929491dbc0955da25840d92', name: 'VHF基站电台-02', category: 'vhfRadio', status: 'online', location: '调度中心', updatedAt: '2026-08-24 14:45', left: 58.4, top: 57.3 },
  { id: 'cbad859b22894d3198342c72e4cc0d1c', name: '交流充电桩AC-02', category: 'chargingPile', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 48.4, top: 63.3 },
  { id: '0077229a29894a439663e6fa87fc4b11', name: '直流充电桩DC-01', category: 'chargingPile', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 50.2, top: 59.7 },
  { id: '8e8e8c6b1a104dc2919dcd351670548f', name: '调度手持对讲机-02', category: 'intercom', status: 'online', location: '调度中心', updatedAt: '2026-08-24 14:44', left: 58.4, top: 57.3 },
  { id: 'ba88a72db19040ca814db6b8093a88a9', name: '园区主路路灯A01', category: 'lighting', status: 'online', location: '园区主路', updatedAt: '2026-08-24 14:45', left: 44, top: 45 },
  { id: '167e604177d3401c801ba30b3498d6e6', name: 'B栋办公区门禁', category: 'accessControl', status: 'online', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:44', left: 64, top: 30 },
  { id: '0532409749c34d29b0cf2ba1060d0e79', name: '园区主路路灯A02', category: 'lighting', status: 'online', location: '园区主路', updatedAt: '2026-08-24 14:45', left: 42.4, top: 46.3 },
  { id: 'c528e8ab590a4ebe92a5db2dd5219458', name: '冷链冷藏箱-01', category: 'refrigeratedContainer', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 26.2, top: 35.7 },
  { id: 'bcc0764ce4a0489bbf2cba5c91e540e1', name: '直流充电桩DC-03', category: 'chargingPile', status: 'offline', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 51.8, top: 64 },
  { id: '7622d6e2598a4e56b1173bdd7814e431', name: '冷链冷藏箱-05', category: 'refrigeratedContainer', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 27.8, top: 40 },
  { id: 'wireless-5G-mt-1201', name: '无线对讲-1201', category: '6a63154d46cb677f93c2f110', status: 'online', location: '—', updatedAt: '2026-09-09 08:23', left: 42.4, top: 46.3 },
  { id: '36363d50a7274e879ff55a8aae9872a5', name: '电表1F', category: 'energyMeter', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 47.8, top: 29 },
  { id: '40dc44b5ff3d422cb64ce6fa1191776f', name: '货运站出口道闸', category: 'barriergate', status: 'offline', location: '货运站', updatedAt: '2026-08-24 14:44', left: 28.4, top: 23.3 },
  { id: 'd5ad2888b2e84b0fafc0abfed271eec1', name: '直流充电桩DC-02', category: 'chargingPile', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 46.9, top: 61.5 },
  { id: '02b3ac8e2d574deabc4ed6c2d397ba67', name: '货运站烟感-01', category: 'fireEquipment', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: '01dc0007bff24d56aaaadeb2506f0d18', name: '数字广播终端-中心广场', category: 'digitalBroadcast', status: 'offline', location: '中心广场', updatedAt: '2026-08-24 14:45', left: 56, top: 50 },
  { id: 'ea792ef0c3944ba2acda2ef6b231cd7b', name: 'A栋办公数字电话-01', category: 'digitalPhone', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:44', left: 46, top: 27 },
  { id: '0e5dbdcb2d194093a6686b4d10d4b607', name: '南门入口道闸', category: 'barriergate', status: 'online', location: '南门', updatedAt: '2026-08-24 14:44', left: 52.4, top: 75.3 },
  { id: 'defb761557054ad8aa92d196ccd24ad4', name: '东门入口道闸', category: 'barriergate', status: 'online', location: '东门', updatedAt: '2026-08-24 14:44', left: 70.4, top: 47.3 },
  { id: 'a5ab411cba204eb8a8a7a1ba986f0015', name: '水表2F', category: 'energyMeter', status: 'online', location: 'A栋/机房', updatedAt: '2026-08-24 14:46', left: 51, top: 20 },
  { id: '35c7a1b081fe45f0ae2de4b9042972fd', name: '冷链仓库紧急对讲终端-01', category: 'emergencyIntercom', status: 'offline', location: '冷链仓库', updatedAt: '2026-08-24 14:45', left: 26, top: 38 },
  { id: '76cc9bb656f944a7a50aba779dacf682', name: '冷链冷藏箱-03', category: 'refrigeratedContainer', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 24, top: 37.5 },
  { id: 'c05eb8bd68d04ccd91d2595d65c195f2', name: '冷链仓库烟感-01', category: 'fireEquipment', status: 'offline', location: '冷链仓库', updatedAt: '2026-08-24 14:45', left: 26, top: 38 },
  { id: '2ed8d1b1da4f4997babbd3ab2ebef13a', name: '拖车差分定位移动站', category: 'differentialGnss', status: 'offline', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: '7094a19c17694d7da665670f8ff3e31b', name: '机坪作业区摄像头', category: 'camera', status: 'offline', location: '机坪作业区', updatedAt: '2026-08-24 14:44', left: 72, top: 66 },
  { id: 'e8e30caba68b49b3837b685ecc5ac43c', name: '绿化灌溉水表', category: 'energyMeter', status: 'online', location: '园区支路', updatedAt: '2026-08-24 14:46', left: 38, top: 38 },
  { id: 'eebc9c4995364af2b1aae002f0fa29b5', name: '水表1F', category: 'energyMeter', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:46', left: 46, top: 27 },
  { id: '5eb26fb42ec24ed1b57ffb88486bb252', name: '停车场引导屏-02', category: 'infoScreen', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 50, top: 62 },
  { id: '76a72ecac20e4447bec6666801981f50', name: 'A栋前台数字电话', category: 'digitalPhone', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:44', left: 44.4, top: 28.3 },
  { id: '097a5e97807c46ab94a18f4ea67dcb71', name: '货运站消火栓-01', category: 'fireEquipment', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 28.4, top: 23.3 },
  { id: '4431ef6bf6db4eae9c73341f7097de12', name: '冷链冷藏箱-06', category: 'refrigeratedContainer', status: 'offline', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 28.8, top: 36.4 },
  { id: 'b00a7238b4844e378d3986e0492152dc', name: '北门入口摄像头', category: 'camera', status: 'online', location: '北门', updatedAt: '2026-08-24 14:44', left: 50, top: 13 },
  { id: '4fa2b98d0b8d496ba7fca56d05793918', name: 'B栋3F手动报警按钮', category: 'fireEquipment', status: 'online', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:45', left: 64, top: 30 },
  { id: '387119d1f8bb47ecb211f53f56aa3094', name: '门禁控制器1F-1_门_2', category: 'accessControl', status: 'online', location: '—', updatedAt: '2026-09-03 15:43', left: 46.2, top: 24.7 },
  { id: '4e8d06214ed34ff2a810ed4db9ca8f26', name: 'B栋办公数字电话-02', category: 'digitalPhone', status: 'offline', location: 'B栋/3F/办公区', updatedAt: '2026-08-24 14:44', left: 62.4, top: 31.3 },
  { id: '10b41f3f59424855ba38c0b74295fc19', name: '园区主路路灯A03', category: 'lighting', status: 'offline', location: '园区主路', updatedAt: '2026-08-24 14:45', left: 44.2, top: 42.7 },
  { id: '7b756d870cd14cacaa12058dc71a0c37', name: '调度手持对讲机-04', category: 'intercom', status: 'offline', location: '冷链仓库', updatedAt: '2026-08-24 14:44', left: 26, top: 38 },
  { id: '51674e8d683c48a8ab00c2fc5d1c9c9b', name: 'A栋1F烟感-01', category: 'fireEquipment', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:45', left: 46, top: 27 },
  { id: 'ab4c49d9e9c1422299634e29b6934094', name: '门禁控制器1F-1_门_4', category: 'accessControl', status: 'online', location: '—', updatedAt: '2026-09-03 15:42', left: 47.8, top: 29 },
  { id: '60f5bd3fe7af43b2a4006dc1db070342', name: '园区主路路灯A04', category: 'lighting', status: 'online', location: '园区主路', updatedAt: '2026-08-24 14:45', left: 45.8, top: 47 },
  { id: '0c0187855f1d46f7beaabb52b6f09026', name: '货运站紧急对讲终端-01', category: 'emergencyIntercom', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 30, top: 22 },
  { id: '3bb0c7370757427680120f8c94b7b065', name: '数字广播终端-地下停车场', category: 'digitalBroadcast', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 50, top: 62 },
  { id: '16f4729cc1ad435994185804e85fc146', name: '中心广场球机', category: 'camera', status: 'online', location: '中心广场', updatedAt: '2026-08-24 14:44', left: 56, top: 50 },
  { id: '2c7ad1b38d9545529042a091a0a7ff38', name: 'A栋紧急对讲终端-01', category: 'emergencyIntercom', status: 'online', location: 'A栋/1F', updatedAt: '2026-08-24 14:45', left: 46, top: 27 },
  { id: 'b591296633ea4d49b229c927ab999b65', name: '北门出口摄像头', category: 'camera', status: 'online', location: '北门', updatedAt: '2026-08-24 14:44', left: 48.4, top: 14.3 },
  { id: '87e5d3b59a684cc2bc9acfa0612ef272', name: '停车场引导屏-01', category: 'infoScreen', status: 'online', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 48.4, top: 63.3 },
  { id: 'c553be330cb24c0db2972e599b322cc4', name: '南门出口摄像头', category: 'camera', status: 'online', location: '—', updatedAt: '2026-03-27 17:36', left: 54.2, top: 71.7 },
  { id: '68521ebb84214750bb46721d5d5c48e1', name: '数字广播终端-冷链仓库', category: 'digitalBroadcast', status: 'online', location: '冷链仓库', updatedAt: '2026-08-24 14:45', left: 26, top: 38 },
  { id: '85ea3c60682040e8ac8c16e7e910126b', name: '东门入口摄像头', category: 'camera', status: 'offline', location: '—', updatedAt: '2026-03-27 17:36', left: 73.8, top: 48 },
  { id: '0069ee16a631400891110771ff45c451', name: '货运站卡口摄像头', category: 'camera', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:44', left: 30, top: 22 },
  { id: '82cda158f927460096b3d06c37d2aa6d', name: '货运站高杆灯H01', category: 'lighting', status: 'online', location: '货运站', updatedAt: '2026-08-24 14:45', left: 28.4, top: 23.3 },
  { id: 'd40eb57a16134ec5b810251ac04e80cb', name: '交流充电桩AC-03', category: 'chargingPile', status: 'offline', location: '地下停车场B1', updatedAt: '2026-08-24 14:45', left: 52.8, top: 60.4 },
  { id: '71a537de541d4df5bfb1409bae1e2496', name: '差分定位基准站-02', category: 'differentialGnss', status: 'online', location: '园区主路', updatedAt: '2026-08-24 14:45', left: 44, top: 45 },
]

/** 台面区域标注（与设备所在空间一致） */
export const deviceAreaLabels: { key: string; left: number; top: number }[] = [
  { key: '货运站', left: 30, top: 14 },
  { key: '冷链仓库', left: 26, top: 45 },
  { key: 'A栋', left: 46, top: 19 },
  { key: 'B栋', left: 66, top: 22 },
  { key: '园区主路', left: 42, top: 51 },
  { key: '调度中心', left: 62, top: 62 },
  { key: '地下停车场B1', left: 48, top: 70 },
  { key: '东门', left: 72, top: 40 },
  { key: '机坪作业区', left: 72, top: 60 },
  { key: '南门', left: 54, top: 81 },
]
