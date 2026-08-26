// 园区空间树共享数据（结构参照根目录《空间区域.md》）
// 供巡检计划、报修管理等页面在"选择设备/添加设备"场景中复用

export interface SpaceNode {
  key: string
  label: string
  children?: SpaceNode[]
}

// 生成连续编号的电梯厅节点
function elevatorHalls(prefix: string, count: number, skip: number[] = []): SpaceNode[] {
  const nodes: SpaceNode[] = []
  for (let i = 1; i <= count; i++) {
    if (skip.includes(i)) continue
    nodes.push({ key: `${prefix}-${i}`, label: `${i}号电梯厅` })
  }
  return nodes
}

// 生成月台节点
function docks(prefix: string, labels: string[]): SpaceNode[] {
  return labels.map((label, i) => ({ key: `${prefix}-dock-${i + 1}`, label }))
}

export const spaceTree: SpaceNode[] = [
  {
    key: 'root',
    label: '主地块',
    children: [
      {
        key: 'entrance',
        label: '出入口',
        children: [
          { key: 'entrance-main', label: '主出入口' },
          { key: 'entrance-bus', label: '客车出入口' },
        ],
      },
      {
        key: 'gp',
        label: '地面停车场',
        children: [
          { key: 'gp-1', label: '1号客车停车场' },
          { key: 'gp-2', label: '2号客车停车场' },
          { key: 'gp-3', label: '3号客车停车场' },
          { key: 'gp-4', label: '4号客车停车场' },
          { key: 'gp-truck', label: '货车候车区' },
        ],
      },
      {
        key: 'rp',
        label: '屋面停车场',
        children: [
          { key: 'rp-13-1', label: '13米货车停车区1' },
          { key: 'rp-13-2', label: '13米货车停车区2' },
          { key: 'rp-13-3', label: '13米货车停车区3' },
          { key: 'rp-13-4', label: '13米货车停车区4' },
          { key: 'rp-17', label: '17米货车停车区' },
        ],
      },
      {
        key: 'ramp',
        label: '盘道',
        children: [
          { key: 'ramp-up', label: '上行盘道' },
          { key: 'ramp-down', label: '下行盘道' },
        ],
      },
      {
        key: 'ct',
        label: 'CT楼',
        children: [
          {
            key: 'ct-L1',
            label: 'L1',
            children: [
              { key: 'ct-L1-export', label: '出口整板箱卸货区', children: docks('ct-L1-export', ['1-5月台', '6-10月台']) },
              { key: 'ct-L1-import', label: '进口整板箱卸货区' },
              { key: 'ct-L1-cold', label: '进口冷链提货区' },
              { key: 'ct-L1-elevator', label: '电梯厅', children: elevatorHalls('ct-L1-elevator', 9) },
              { key: 'ct-L1-staff', label: '员工出入口' },
            ],
          },
          {
            key: 'ct-L2',
            label: 'L2',
            children: [
              { key: 'ct-L2-load', label: '装卸货区', children: docks('ct-L2-load', ['1-4月台', '5-8月台', '1-14月台', '15-26月台']) },
              { key: 'ct-L2-elevator', label: '电梯厅', children: elevatorHalls('ct-L2-elevator', 7) },
            ],
          },
          {
            key: 'ct-L3',
            label: 'L3',
            children: [
              { key: 'ct-L3-cold', label: '出口冷链卸货区' },
              { key: 'ct-L3-export', label: '出口卸货区', children: docks('ct-L3-export', ['1-21月台', '22-28月台']) },
              { key: 'ct-L3-elevator', label: '电梯厅', children: elevatorHalls('ct-L3-elevator', 7) },
            ],
          },
          {
            key: 'ct-L4',
            label: 'L4',
            children: [
              { key: 'ct-L4-cold', label: '出口冷链卸货区' },
              { key: 'ct-L4-export', label: '出口卸货区', children: docks('ct-L4-export', ['1-21月台', '22-28月台']) },
              { key: 'ct-L4-elevator', label: '电梯厅', children: elevatorHalls('ct-L4-elevator', 7) },
            ],
          },
          {
            key: 'ct-L5',
            label: 'L5',
            children: [
              { key: 'ct-L5-import', label: '进口提货区', children: docks('ct-L5-import', ['1-7月台', '8-27月台', '28-34月台']) },
              { key: 'ct-L5-elevator', label: '电梯厅', children: elevatorHalls('ct-L5-elevator', 7) },
            ],
          },
          {
            key: 'ct-L6',
            label: 'L6',
            children: [
              { key: 'ct-L6-import', label: '进口提货区', children: docks('ct-L6-import', ['1-7月台', '8-27月台', '28-34月台']) },
              { key: 'ct-L6-elevator', label: '电梯厅', children: elevatorHalls('ct-L6-elevator', 7) },
            ],
          },
          {
            key: 'ct-L7',
            label: 'L7',
            children: [
              { key: 'ct-L7-elevator', label: '电梯厅', children: elevatorHalls('ct-L7-elevator', 7, [3, 4, 6]) },
            ],
          },
        ],
      },
      {
        key: 'ff',
        label: 'FF楼',
        children: [
          {
            key: 'ff-L1',
            label: 'L1',
            children: [
              { key: 'ff-L1-export', label: '货代出口卸货区', children: docks('ff-L1-export', ['1-9月台', '10-20月台']) },
              { key: 'ff-L1-check', label: '出口海关查验停靠区', children: docks('ff-L1-check', ['1-6月台', '7-11月台']) },
              { key: 'ff-L1-elevator', label: '电梯厅', children: elevatorHalls('ff-L1-elevator', 3) },
            ],
          },
          {
            key: 'ff-L2',
            label: 'L2',
            children: [
              { key: 'ff-L2-export', label: '货代出口卸货区', children: docks('ff-L2-export', ['1-14月台', '15-25月台']) },
              { key: 'ff-L2-elevator', label: '电梯厅', children: elevatorHalls('ff-L2-elevator', 3) },
            ],
          },
          {
            key: 'ff-L3',
            label: 'L3',
            children: [
              { key: 'ff-L3-export', label: '货代出口卸货区', children: docks('ff-L3-export', ['1-14月台', '15-25月台']) },
              { key: 'ff-L3-elevator', label: '电梯厅', children: elevatorHalls('ff-L3-elevator', 3) },
            ],
          },
          {
            key: 'ff-L4',
            label: 'L4',
            children: [
              { key: 'ff-L4-export', label: '货代出口卸货区', children: docks('ff-L4-export', ['1-14月台', '15-25月台']) },
              { key: 'ff-L4-elevator', label: '电梯厅', children: elevatorHalls('ff-L4-elevator', 3) },
            ],
          },
          {
            key: 'ff-L5',
            label: 'L5',
            children: [
              { key: 'ff-L5-export', label: '货代出口卸货区', children: docks('ff-L5-export', ['1-14月台', '15-25月台']) },
              { key: 'ff-L5-elevator', label: '电梯厅', children: elevatorHalls('ff-L5-elevator', 3) },
            ],
          },
          {
            key: 'ff-L6',
            label: 'L6',
            children: [
              { key: 'ff-L6-load', label: '货代装卸货区', children: docks('ff-L6-load', ['1-14月台', '15-25月台']) },
              { key: 'ff-L6-elevator', label: '电梯厅', children: elevatorHalls('ff-L6-elevator', 3) },
            ],
          },
          {
            key: 'ff-L7',
            label: 'L7',
            children: [
              { key: 'ff-L7-elevator', label: '电梯厅', children: elevatorHalls('ff-L7-elevator', 3, [2]) },
            ],
          },
        ],
      },
      {
        key: 'hg',
        label: '海关大楼',
        children: [
          { key: 'hg-L1', label: 'L1' },
          { key: 'hg-L2', label: 'L2' },
        ],
      },
      { key: 'igv', label: 'IGV连桥' },
    ],
  },
]

// 在树中按 key 查找节点
export function findSpaceNode(nodes: SpaceNode[], key: string): SpaceNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const found = findSpaceNode(n.children, key)
      if (found) return found
    }
  }
  return null
}

// 收集某节点及其全部子孙节点的 key
export function collectSpaceKeys(node: SpaceNode): string[] {
  const keys = [node.key]
  if (node.children) node.children.forEach(c => keys.push(...collectSpaceKeys(c)))
  return keys
}
