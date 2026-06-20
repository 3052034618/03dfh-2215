import { Task, RiskPoint, TempAlert, TempRecord, FeedbackItem, GoodsTypeOption, DriverInfo } from '@/types';

export const GOODS_TYPE_OPTIONS: GoodsTypeOption[] = [
  {
    key: 'vaccine',
    label: '疫苗',
    tempMin: 2,
    tempMax: 8,
    description: '需严格温控，严禁冻结'
  },
  {
    key: 'frozen_meat',
    label: '冷冻肉',
    tempMin: -25,
    tempMax: -15,
    description: '深冷冻结运输'
  },
  {
    key: 'dairy',
    label: '乳制品',
    tempMin: 0,
    tempMax: 6,
    description: '冷藏保鲜运输'
  },
  {
    key: 'fresh_produce',
    label: '生鲜果蔬',
    tempMin: 4,
    tempMax: 12,
    description: '气调保鲜运输'
  }
];

export const MOCK_DRIVER: DriverInfo = {
  id: 'DRV001',
  name: '张师傅',
  phone: '138****8888',
  vehicleNo: '京A·88888',
  vehicleType: '9.6米冷藏车'
};

export const MOCK_TASK: Task = {
  id: 'TASK20260621001',
  waybillNo: 'WB2026062188990',
  goodsType: 'vaccine',
  goodsName: '灭活疫苗（流感）',
  tempMin: 2,
  tempMax: 8,
  loadingAddr: '北京市朝阳区生物制药园区8号楼冷库B3',
  unloadingAddr: '上海市浦东新区疾控中心冷链仓储中心',
  recommendedRoute: '京台高速 → 淮徐高速 → 京沪高速 → 沪蓉高速，全程约1220公里',
  estimatedDeparture: '2026-06-21 06:30',
  estimatedArrival: '2026-06-22 02:00',
  status: 'in_transit',
  currentTemp: 5.2,
  fuelLevel: 68,
  distance: 486,
  elapsedTime: '8小时32分'
};

export const MOCK_RISK_POINTS: RiskPoint[] = [
  {
    id: 'RISK001',
    type: 'traffic_jam',
    title: '前方拥堵',
    description: 'G3京台高速徐州段K628-K634处车辆缓行',
    distanceKm: 6,
    estimatedDelayMin: 28,
    estimatedTempRise: 1.8,
    severity: 'medium',
    suggestedAction: 'increase_cooling',
    actionText: '建议提前加强制冷，将温度下调1-2℃，预留拥堵升温空间'
  },
  {
    id: 'RISK002',
    type: 'weather',
    title: '前方暴雨',
    description: '宿迁地区有中到大雨，能见度低',
    distanceKm: 128,
    estimatedDelayMin: 45,
    estimatedTempRise: 2.3,
    severity: 'high',
    suggestedAction: 'stop_check',
    actionText: '建议就近服务区停车检查门封密封性，必要时关闭回风阀加强制冷'
  }
];

export const MOCK_TEMP_ALERTS: TempAlert[] = [
  {
    id: 'ALERT001',
    time: '2026-06-21 14:25',
    currentTemp: 7.8,
    targetMin: 2,
    targetMax: 8,
    driftDirection: 'up',
    driftValue: 1.2,
    suggestions: [
      '检查车厢门封条是否完好，有无漏气',
      '查看制冷机组运行状态，温度设定是否正确',
      '检查油箱油量，确保机组供油正常',
      '确认冷凝器清洁，无遮挡物'
    ],
    severity: 'warning',
    handled: false,
    voiced: true,
    resolved: false
  },
  {
    id: 'ALERT002',
    time: '2026-06-21 12:08',
    currentTemp: 6.9,
    targetMin: 2,
    targetMax: 8,
    driftDirection: 'up',
    driftValue: 0.8,
    suggestions: [
      '建议停车后检查车厢密封性',
      '留意制冷机组是否频繁启停'
    ],
    severity: 'warning',
    handled: true,
    voiced: true,
    resolved: true
  },
  {
    id: 'ALERT003',
    time: '2026-06-21 10:15',
    currentTemp: 5.6,
    targetMin: 2,
    targetMax: 8,
    driftDirection: 'up',
    driftValue: 0.4,
    suggestions: [
      '温度轻微上升，持续关注即可'
    ],
    severity: 'warning',
    handled: true,
    voiced: true,
    resolved: true
  }
];

export const MOCK_TEMP_RECORDS: TempRecord[] = [
  { time: '06:30', temp: 4.0 },
  { time: '07:00', temp: 4.2 },
  { time: '07:30', temp: 4.1 },
  { time: '08:00', temp: 4.3 },
  { time: '08:30', temp: 4.5 },
  { time: '09:00', temp: 4.4 },
  { time: '09:30', temp: 4.8 },
  { time: '10:00', temp: 5.1 },
  { time: '10:30', temp: 5.2 },
  { time: '11:00', temp: 5.4 },
  { time: '11:30', temp: 5.6 },
  { time: '12:00', temp: 6.1 },
  { time: '12:30', temp: 6.5 },
  { time: '13:00', temp: 6.3 },
  { time: '13:30', temp: 6.8 },
  { time: '14:00', temp: 7.1 },
  { time: '14:30', temp: 7.8 }
];

export const MOCK_FEEDBACKS: FeedbackItem[] = [
  {
    id: 'FB004',
    taskId: 'TASK20260621001',
    alertId: 'ALERT002',
    type: 'checked',
    content: '已按调度建议重新扣紧门封并调整制冷温度，目前温度已恢复正常',
    checkItems: [
      { key: 'door_seal', label: '门封', status: 'normal' },
      { key: 'refrigeration', label: '制冷机', status: 'normal' },
      { key: 'fuel', label: '油量', status: 'normal' }
    ],
    createTime: '2026-06-21 13:05',
    status: 'resolved',
    reply: '收到，温度已恢复正常，请继续监控，有问题随时反馈',
    replyTime: '2026-06-21 13:10',
    resolveTime: '2026-06-21 13:15'
  },
  {
    id: 'FB003',
    taskId: 'TASK20260621001',
    alertId: 'ALERT001',
    type: 'need_help',
    content: '车厢门封条有轻微磨损，制冷机组运行正常，建议到达后更换密封条',
    checkItems: [
      { key: 'door_seal', label: '门封', status: 'abnormal' },
      { key: 'refrigeration', label: '制冷机', status: 'normal' },
      { key: 'fuel', label: '油量', status: 'normal' }
    ],
    createTime: '2026-06-21 14:38',
    status: 'replied',
    reply: '已收到，调度中心已协调上海仓库准备备用密封条，到达后优先更换。保持监控，有异常随时报告。',
    replyTime: '2026-06-21 14:42'
  },
  {
    id: 'FB002',
    taskId: 'TASK20260621001',
    alertId: 'ALERT002',
    type: 'checked',
    content: '已检查门封、制冷机组及油量，一切正常',
    checkItems: [
      { key: 'door_seal', label: '门封', status: 'normal' },
      { key: 'refrigeration', label: '制冷机', status: 'normal' },
      { key: 'fuel', label: '油量', status: 'normal' }
    ],
    createTime: '2026-06-21 12:18',
    status: 'received'
  },
  {
    id: 'FB001',
    taskId: 'TASK20260621001',
    alertId: 'ALERT003',
    type: 'checked',
    content: '已确认各项指标正常',
    checkItems: [
      { key: 'door_seal', label: '门封', status: 'normal' },
      { key: 'refrigeration', label: '制冷机', status: 'normal' }
    ],
    createTime: '2026-06-21 10:22',
    status: 'received'
  }
];
