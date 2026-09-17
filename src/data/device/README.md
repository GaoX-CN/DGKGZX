# 设备数据导出说明（equip_device_def / equip_device_instance）

> 导出时间：2026-09-16
> 数据来源：东莞园区开发库（公司） · PostgreSQL · `192.168.161.57:5432` · `smart_park_dev`
> 导出通道：DBX MCP（本机与 `192.168.161.57` 不通路由，DBX 桌面应用自带通道）

---

## 一、文件清单

| 文件 | 内容 | 行数 |
|---|---|---|
| `equip_device_def.json` | 设备模型表**原始全量**（16 列） | 17 |
| `equip_device_instance.json` | 设备实例表**原始全量**（57 列） | 95 |
| `设备分类清单.json` | 按口径清洗后的**设备分类**（defCode 粒度，供原型使用） | 16 |
| `设备清单_已清洗.json` | 按口径清洗后的**设备实例**（含自带 def 关联字段） | 87 |
| `剔除的无效记录.json` | 被剔除的记录及原因，供核对 | 8 |

---

## 二、数据完整性保证

导出过程做了三重保障，**零字符丢失**：

1. **全字段 base64 编码传输** —— 消除 NULL / 空串 / 竖线 / 换行 / 首尾空格在表格里的歧义；`null` 即数据库 NULL。
2. **逐行 md5 双向校验** —— 本地还原值算 md5，与 SQL 侧 `md5()` 计算结果逐行比对，全表通过。
3. **按 id 做键对齐** —— DBX 返回的行顺序不等于 SQL 的 `ORDER BY` 顺序，因此不按位置比对（这是最初踩的坑）。

> **关键坑（务必记住）**：PostgreSQL 的 `encode(..., 'base64')` 遵循 MIME 规范，**每 76 字符会插入一个换行符**。这些换行会破坏 markdown 表格的行结构，导致解析时丢字符（表现为"每 76 字符丢 1 字符"）。取数时必须写 `replace(encode(...), chr(10), '')`，否则会拿到损坏数据且**不会报错**。

---

## 三、设备分类清单（defCode 粒度，16 类）

**分类口径：一个 `def_code` 即一个设备分类，不按 `def_category_code` 归并大类。**

原始 `equip_device_def` 共 17 条，按要求**排除「直连测试电表设备」（id=157）**后，得 **16 个设备分类**。

| # | def_code | 分类名称 | 台数 | 在线 | 离线 | 未激活 | 在线率 |
|---|---|---|---|---|---:|---:|---:|---:|
| 1 | `camera` | 摄像头 | 12 | 10 | 2 | 0 | 83.3% |
| 2 | `barriergate` | 道闸 | 6 | 5 | 1 | 0 | 83.3% |
| 3 | `accessControl` | 门禁 | 7 | 6 | 1 | 0 | 85.7% |
| 4 | `intercom` | 对讲机 | 4 | 3 | 0 | 1 | 75.0% |
| 5 | `digitalPhone` | 数字电话 | 4 | 3 | 1 | 0 | 75.0% |
| 6 | `vhfRadio` | VHF电台 | 2 | 2 | 0 | 0 | 100% |
| 7 | `emergencyIntercom` | 紧急对讲 | 4 | 3 | 0 | 1 | 75.0% |
| 8 | `digitalBroadcast` | 数字广播 | 6 | 5 | 1 | 0 | 83.3% |
| 9 | `refrigeratedContainer` | 冷藏箱 | 6 | 4 | 1 | 1 | 66.7% |
| 10 | `lighting` | 照明 | 6 | 5 | 1 | 0 | 83.3% |
| 11 | `infoScreen` | 信息屏 | 5 | 4 | 1 | 0 | 80.0% |
| 12 | `differentialGnss` | 差分定位 | 3 | 2 | 1 | 0 | 66.7% |
| 13 | `chargingPile` | 充电桩 | 6 | 4 | 1 | 1 | 66.7% |
| 14 | `fireEquipment` | 消防设备 | 6 | 5 | 1 | 0 | 83.3% |
| 15 | `energyMeter` | 能耗表具 | 8 | 7 | 1 | 0 | 87.5% |
| 16 | `6a63154d46cb677f93c2f110` | 无线对讲 | 2 | 1 | 1 | 0 | 50.0% |

> 「无线对讲」由外部系统（ROMA）同步，`def_code` 本身就是同步过来的业务 ID，同样按"一个 defCode 一类"处理，独立成类，不并入任何大类。
>
> ⚠️ 这套分类与「设备分布」页面当前的 mock（空调 / 照明 / 消防 / 电梯 / 配电 / 给排水 / 门禁 / 弱电 / 其他 共 9 类）**完全不同**，接入时需整体替换。

---

## 四、设备清单（87 台）

原始 95 行，剔除 8 行无效记录后剩 **87 台**。

**按分类（defCode）台数**：摄像头 12、能耗表具 8、门禁 7、道闸 6、冷藏箱 6、数字广播 6、消防设备 6、充电桩 6、照明 6、信息屏 5、对讲机 4、数字电话 4、紧急对讲 4、差分定位 3、VHF电台 2、无线对讲 2。

**运行状态**

| 状态 | 台数 | 说明 |
|---|---|---|
| online | 69 | 在线 |
| offline | 14 | 离线 |
| unactivated | 4 | 未激活（真实业务状态，予以保留） |

**空间归属**：87 台中有 66 台带 `space_full_name`，覆盖 15 个区域，如
`东莞空港中心/货运站`、`东莞空港中心/冷链仓库`、`东莞空港中心/地下停车场B1`、
`东莞空港中心/A栋/1F`、`东莞空港中心/B栋/3F/办公区`、`东莞空港中心/园区主路`、
`东莞空港中心/调度中心`、`东莞空港中心/南门 / 东门 / 北门`、`东莞空港中心/机坪作业区` 等。

---

## 五、被剔除的 8 条无效记录

| device_id | device_name | 判定原因 |
|---|---|---|
| `emergency-phone-mt-3030` | 空 | 空壳记录 |
| `emergency-phone-mt-3031` | 空 | 空壳记录 |
| `smart-ip-phone-mt-2001` | 空 | 空壳记录 |
| `smart-ip-phone-mt-2002` | 空 | 空壳记录 |
| `kg-mt-test-001` | 空 | 空壳记录 |
| `kg-mt-test-003` | 空 | 空壳记录 |
| `hw-test` | 空 | 空壳记录 |
| `mj-mt-test-001` | 门禁-码头测试设备001 | 设备名含「测试」 |

**判定规则（写在 `剔除的无效记录.json` 里，可调整）**

1. **空壳记录**：`device_name`、`def_name`、`status` 三者全空 —— 这类记录只剩 `device_id`，且命名多为 `kg-mt-test-*`、`hw-test`、`*-mt-*` 等测试形态；
2. **设备名含「测试」字样**。

> 另有两条 `wireless-5G-mt-1200` / `-1201`（无线对讲-1200 / -1201）**已保留**：它们 device_id 虽含 `mt`，但名称、模型、状态齐备，且与 def 表的「无线对讲」对应，判断为真实设备。如你的口径不同，请告知。

---

## 六、字段可用性提示

`equip_device_instance` 共 57 列，实际有值的 40 列。做 mock 时建议关注：

- **填充率高、可放心使用**：`device_id`、`device_name`、`def_code`、`def_name`、`status`、`devicesn`、`model`、`product_name`、`manufacturer_name`、`device_ip`、`space_full_name`、`factory_name`、`protocol`
- **局部有值（做样例点缀）**：`longitude` / `latitude`（11 条）、`location_info`（4 条，含经纬度 JSON）、`gateway_id`（10）、`camera_type`（8）、`function_type`（8）、`high`（8）
- **整列为空、不必使用**：`telemetry_period`、`secret`、`duration`、`expire_time`、`point_mapped`、`connector_id`、`group_id`、`channel_code`、`channel_name`、`device_create_time`、`nvr_code`、`net_type`、`nce_type`、`mac`、`version`、`class_name`、`parent_index_code`

**经纬度样例**（可用于地图撒点）：
`{"location":null,"coordinate":{"longitude":113.46637496709306,"latitude":22.983401170122203,"altitude":0},"relativeCoordinate":{"x":0,"y":0,"z":0}}`
