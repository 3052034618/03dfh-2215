import { create } from 'zustand';
import { Task, RiskPoint, TempAlert, FeedbackItem, TempRecord, DriverInfo, GoodsType } from '@/types';
import { MOCK_TASK, MOCK_RISK_POINTS, MOCK_TEMP_ALERTS, MOCK_FEEDBACKS, MOCK_TEMP_RECORDS, MOCK_DRIVER } from '@/data/mock';

interface AppState {
  driver: DriverInfo;
  task: Task | null;
  riskPoints: RiskPoint[];
  tempAlerts: TempAlert[];
  tempRecords: TempRecord[];
  feedbacks: FeedbackItem[];
  voiceEnabled: boolean;

  setTask: (task: Task) => void;
  createTask: (waybillNo: string, goodsType: GoodsType, tempMin: number, tempMax: number) => void;
  startTask: () => void;
  completeTask: () => void;
  updateCurrentTemp: (temp: number) => void;
  handleAlert: (alertId: string) => void;
  addFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createTime' | 'status'>) => void;
  toggleVoice: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  driver: MOCK_DRIVER,
  task: MOCK_TASK,
  riskPoints: MOCK_RISK_POINTS,
  tempAlerts: MOCK_TEMP_ALERTS,
  tempRecords: MOCK_TEMP_RECORDS,
  feedbacks: MOCK_FEEDBACKS,
  voiceEnabled: true,

  setTask: (task) => set({ task }),

  createTask: (waybillNo, goodsType, tempMin, tempMax) => {
    const newTask: Task = {
      id: `TASK${Date.now()}`,
      waybillNo,
      goodsType,
      goodsName: '',
      tempMin,
      tempMax,
      loadingAddr: '待确认装货地址',
      unloadingAddr: '待确认卸货地址',
      recommendedRoute: '系统规划中...',
      estimatedDeparture: new Date().toLocaleString('zh-CN'),
      estimatedArrival: '预计到达时间计算中',
      status: 'pending',
      currentTemp: (tempMin + tempMax) / 2,
      fuelLevel: 95,
      distance: 0,
      elapsedTime: '0小时0分'
    };
    set({ task: newTask });
    console.log('[Store] createTask:', { waybillNo, goodsType, tempMin, tempMax });
  },

  startTask: () => {
    const { task } = get();
    if (task) {
      set({ task: { ...task, status: 'in_transit' } });
      console.log('[Store] startTask:', task.id);
    }
  },

  completeTask: () => {
    const { task } = get();
    if (task) {
      set({ task: { ...task, status: 'completed' } });
      console.log('[Store] completeTask:', task.id);
    }
  },

  updateCurrentTemp: (temp) => {
    const { task, tempRecords } = get();
    if (task) {
      set({
        task: { ...task, currentTemp: temp },
        tempRecords: [...tempRecords, { time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), temp }]
      });
    }
  },

  handleAlert: (alertId) => {
    set((state) => ({
      tempAlerts: state.tempAlerts.map(a => a.id === alertId ? { ...a, handled: true } : a)
    }));
    console.log('[Store] handleAlert:', alertId);
  },

  addFeedback: (feedback) => {
    const newFeedback: FeedbackItem = {
      ...feedback,
      id: `FB${Date.now()}`,
      createTime: new Date().toLocaleString('zh-CN'),
      status: 'sent'
    };
    set((state) => ({ feedbacks: [newFeedback, ...state.feedbacks] }));
    console.log('[Store] addFeedback:', newFeedback);
  },

  toggleVoice: () => {
    set((state) => ({ voiceEnabled: !state.voiceEnabled }));
  }
}));
