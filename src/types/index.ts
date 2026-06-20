export type GoodsType = 'vaccine' | 'frozen_meat' | 'dairy' | 'fresh_produce';

export interface GoodsTypeOption {
  key: GoodsType;
  label: string;
  tempMin: number;
  tempMax: number;
  description: string;
}

export interface Task {
  id: string;
  waybillNo: string;
  goodsType: GoodsType;
  goodsName: string;
  tempMin: number;
  tempMax: number;
  loadingAddr: string;
  unloadingAddr: string;
  recommendedRoute: string;
  estimatedDeparture: string;
  estimatedArrival: string;
  status: 'pending' | 'loading' | 'in_transit' | 'completed';
  currentTemp: number;
  fuelLevel: number;
  distance: number;
  elapsedTime: string;
}

export interface RiskPoint {
  id: string;
  type: 'traffic_jam' | 'road_work' | 'weather' | 'checkpoint';
  title: string;
  description: string;
  distanceKm: number;
  estimatedDelayMin: number;
  estimatedTempRise: number;
  severity: 'low' | 'medium' | 'high';
}

export type CheckItemKey = 'door_seal' | 'refrigeration' | 'fuel';

export interface CheckItemOption {
  key: CheckItemKey;
  label: string;
  normalLabel: string;
  abnormalLabel: string;
}

export interface TempAlert {
  id: string;
  time: string;
  currentTemp: number;
  targetMin: number;
  targetMax: number;
  driftDirection: 'up' | 'down';
  driftValue: number;
  suggestions: string[];
  severity: 'warning' | 'danger';
  handled: boolean;
  voiced: boolean;
  resolved: boolean;
}

export interface TempRecord {
  time: string;
  temp: number;
}

export interface FeedbackItem {
  id: string;
  taskId: string;
  alertId?: string;
  type: 'checked' | 'need_help' | 'photo';
  content: string;
  checkItems?: CheckItemResult[];
  photos?: string[];
  createTime: string;
  status: 'sent' | 'received' | 'replied';
  reply?: string;
  replyTime?: string;
}

export interface CheckItemResult {
  key: CheckItemKey;
  label: string;
  status: 'normal' | 'abnormal';
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicleNo: string;
  vehicleType: string;
}
