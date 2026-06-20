import { create } from 'zustand';
import { Task, RiskPoint, TempAlert, FeedbackItem, TempRecord, DriverInfo, GoodsType, CheckItemResult, DeliveryRecord, DeliveryRecordSummary } from '@/types';
import { MOCK_TASK, MOCK_RISK_POINTS, MOCK_TEMP_ALERTS, MOCK_FEEDBACKS, MOCK_TEMP_RECORDS, MOCK_DRIVER } from '@/data/mock';
import { getTempStatus, speakIfEnabled, formatTemp } from '@/utils';

interface AppState {
  driver: DriverInfo;
  task: Task | null;
  riskPoints: RiskPoint[];
  tempAlerts: TempAlert[];
  tempRecords: TempRecord[];
  feedbacks: FeedbackItem[];
  voiceEnabled: boolean;
  pendingAlertId: string | null;
  pendingFeedbackType: 'checked' | 'need_help' | 'photo' | null;
  lastDeliveryRecord: DeliveryRecordSummary | null;

  setTask: (task: Task) => void;
  createTask: (waybillNo: string, goodsType: GoodsType, tempMin: number, tempMax: number, extra?: Partial<Task>) => void;
  startTask: () => void;
  completeTask: () => void;
  completeTaskWithDelivery: (delivery: Omit<DeliveryRecord, 'confirmTime' | 'tempSummary' | 'alertStats' | 'feedbackCount'>) => void;
  resetTask: () => void;
  updateCurrentTemp: (temp: number) => void;
  handleAlert: (alertId: string) => void;
  markAlertVoiced: (alertId: string) => void;
  resolveAlertsIfNeeded: (currentTemp: number, tempMin: number, tempMax: number) => void;
  addFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createTime' | 'status'>) => void;
  resolveFeedback: (feedbackId: string) => void;
  toggleVoice: () => void;
  setPendingAlertId: (id: string | null) => void;
  setPendingFeedbackType: (type: 'checked' | 'need_help' | 'photo' | null) => void;
  setDeliveryInfo: (info: DeliveryRecord) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  driver: MOCK_DRIVER,
  task: MOCK_TASK,
  riskPoints: MOCK_RISK_POINTS,
  tempAlerts: MOCK_TEMP_ALERTS.map(a => ({ ...a, voiced: a.handled, resolved: a.handled })),
  tempRecords: MOCK_TEMP_RECORDS,
  feedbacks: MOCK_FEEDBACKS,
  voiceEnabled: true,
  pendingAlertId: null,
  pendingFeedbackType: null,
  lastDeliveryRecord: null,

  setTask: (task) => set({ task }),

  createTask: (waybillNo, goodsType, tempMin, tempMax, extra) => {
    const nowStr = new Date().toLocaleString('zh-CN');
    const arrTimes = new Date();
    arrTimes.setHours(arrTimes.getHours() + 20);
    const arrivalStr = arrTimes.toLocaleString('zh-CN');

    const newTask: Task = {
      id: `TASK${Date.now()}`,
      waybillNo,
      goodsType,
      goodsName: extra?.goodsName || '',
      tempMin,
      tempMax,
      loadingAddr: extra?.loadingAddr || '待确认装货地址',
      unloadingAddr: extra?.unloadingAddr || '待确认卸货地址',
      recommendedRoute: extra?.recommendedRoute || '系统规划中...',
      estimatedDeparture: extra?.estimatedDeparture || nowStr,
      estimatedArrival: extra?.estimatedArrival || arrivalStr,
      status: 'pending',
      currentTemp: (tempMin + tempMax) / 2,
      fuelLevel: 95,
      distance: 0,
      elapsedTime: '0小时0分'
    };
    set({
      task: newTask,
      tempRecords: [],
      tempAlerts: [],
      feedbacks: [],
      pendingAlertId: null,
      pendingFeedbackType: null
    });
    console.log('[Store] createTask:', { waybillNo, goodsType, tempMin, tempMax, status: 'pending' });
  },

  startTask: () => {
    const { task } = get();
    if (task && task.status === 'pending') {
      const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const currentTemp = task.currentTemp;
      set({
        task: { ...task, status: 'in_transit' },
        tempRecords: [{ time: now, temp: currentTemp }]
      });
      console.log('[Store] startTask:', task.id);
    } else if (task) {
      set({ task: { ...task, status: 'in_transit' } });
      console.log('[Store] startTask (force):', task.id, task.status);
    }
  },

  completeTask: () => {
    const { task } = get();
    if (task) {
      set({ task: { ...task, status: 'completed' } });
      console.log('[Store] completeTask:', task.id);
    }
  },

  completeTaskWithDelivery: (delivery) => {
    const { task, tempRecords, tempAlerts, feedbacks } = get();
    if (!task) return;

    const temps = tempRecords.map(r => r.temp);
    const avg = temps.reduce((s, t) => s + t, 0) / temps.length;
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    const normalCount = temps.filter(t => t >= task.tempMin && t <= task.tempMax).length;
    const compliance = temps.length > 0 ? (normalCount / temps.length) * 100 : 0;

    const totalAlerts = tempAlerts.length;
    const resolvedAlerts = tempAlerts.filter(a => a.resolved).length;
    const unhandledAlerts = tempAlerts.filter(a => !a.handled && !a.resolved).length;

    const deliveryInfo: DeliveryRecord = {
      ...delivery,
      confirmTime: new Date().toLocaleString('zh-CN'),
      tempSummary: {
        avg: +avg.toFixed(1),
        max: +max.toFixed(1),
        min: +min.toFixed(1),
        compliance: +compliance.toFixed(0)
      },
      alertStats: {
        total: totalAlerts,
        resolved: resolvedAlerts,
        unhandled: unhandledAlerts
      },
      feedbackCount: feedbacks.length
    };

    const lastDeliverySummary: DeliveryRecordSummary = {
      waybillNo: task.waybillNo,
      route: `${task.loadingAddr.slice(0, 8)}→${task.unloadingAddr.slice(0, 8)}`,
      confirmTime: deliveryInfo.confirmTime,
      compliance: deliveryInfo.tempSummary.compliance,
      goodsType: task.goodsType
    };

    set({
      task: { ...task, status: 'completed', deliveryInfo },
      lastDeliveryRecord: lastDeliverySummary
    });
    console.log('[Store] completeTaskWithDelivery:', deliveryInfo);
  },

  resetTask: () => {
    set({
      task: null,
      tempAlerts: [],
      tempRecords: [],
      feedbacks: [],
      pendingAlertId: null,
      pendingFeedbackType: null,
      riskPoints: []
    });
    console.log('[Store] resetTask: back to new order');
  },

  updateCurrentTemp: (temp) => {
    const { task, tempRecords, tempAlerts, voiceEnabled } = get();
    if (!task) return;

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const newRecord: TempRecord = { time: now, temp };
    const newRecords = [...tempRecords, newRecord].slice(-80);

    const status = getTempStatus(temp, task.tempMin, task.tempMax);

    let newAlerts = [...tempAlerts];

    if (status === 'normal') {
      let anyResolved = false;
      newAlerts = newAlerts.map(a => {
        if (!a.resolved) {
          anyResolved = true;
          return { ...a, resolved: true };
        }
        return a;
      });
      if (anyResolved) {
        console.log('[Store] updateCurrentTemp: resolved alerts detected');
      }
    }

    if (status === 'warning' || status === 'danger') {
      const existingUnhandled = newAlerts.find(a => !a.handled && !a.resolved);
      if (!existingUnhandled) {
        const driftDirection = temp > (task.tempMin + task.tempMax) / 2 ? 'up' : 'down';
        const driftValue = driftDirection === 'up'
          ? +(temp - task.tempMax).toFixed(1)
          : +(task.tempMin - temp).toFixed(1);
        const newAlert: TempAlert = {
          id: `ALERT${Date.now()}`,
          time: new Date().toLocaleString('zh-CN'),
          currentTemp: temp,
          targetMin: task.tempMin,
          targetMax: task.tempMax,
          driftDirection,
          driftValue: Math.max(0, driftValue),
          severity: status === 'danger' ? 'danger' : 'warning',
          handled: false,
          voiced: false,
          resolved: false,
          suggestions: [
            '检查车厢门封条是否完好，有无漏气',
            '查看制冷机组运行状态，温度设定是否正确',
            '检查油箱油量，确保机组供油正常'
          ]
        };
        newAlerts = [newAlert, ...newAlerts];

        if (voiceEnabled) {
          const text = `温度${status === 'danger' ? '超限' : '预警'}：当前${formatTemp(temp)}，${
            driftDirection === 'up' ? '已接近上限' : '已接近下限'
          }，请检查门封、制冷机和油量`;
          speakIfEnabled(true, text);
          newAlerts[0] = { ...newAlerts[0], voiced: true };
        }
      } else if (!existingUnhandled.voiced && voiceEnabled) {
        const text = `温度${status === 'danger' ? '超限' : '预警'}：当前${formatTemp(temp)}，请检查门封、制冷机和油量`;
        speakIfEnabled(true, text);
        newAlerts = newAlerts.map(a =>
          a.id === existingUnhandled.id ? { ...a, voiced: true } : a
        );
      }
    }

    set({
      task: { ...task, currentTemp: temp },
      tempRecords: newRecords,
      tempAlerts: newAlerts
    });
  },

  handleAlert: (alertId) => {
    set((state) => ({
      tempAlerts: state.tempAlerts.map(a => a.id === alertId ? { ...a, handled: true } : a)
    }));
    console.log('[Store] handleAlert:', alertId);
  },

  markAlertVoiced: (alertId) => {
    set((state) => ({
      tempAlerts: state.tempAlerts.map(a => a.id === alertId ? { ...a, voiced: true } : a)
    }));
  },

  resolveAlertsIfNeeded: (currentTemp, tempMin, tempMax) => {
    const status = getTempStatus(currentTemp, tempMin, tempMax);
    if (status === 'normal') {
      set((state) => ({
        tempAlerts: state.tempAlerts.map(a => {
          if (!a.resolved) return { ...a, resolved: true };
          return a;
        })
      }));
    }
  },

  addFeedback: (feedback) => {
    const fbId = `FB${Date.now()}`;
    const newFeedback: FeedbackItem = {
      ...feedback,
      id: fbId,
      createTime: new Date().toLocaleString('zh-CN'),
      status: 'sent'
    };

    if (feedback.alertId) {
      set((state) => ({
        feedbacks: [newFeedback, ...state.feedbacks],
        tempAlerts: state.tempAlerts.map(a =>
          a.id === feedback.alertId ? { ...a, handled: true } : a
        ),
        pendingAlertId: state.pendingAlertId === feedback.alertId ? null : state.pendingAlertId,
        pendingFeedbackType: null
      }));
      console.log('[Store] addFeedback: linked to alert', feedback.alertId, 'marked handled');
    } else {
      set((state) => ({
        feedbacks: [newFeedback, ...state.feedbacks],
        pendingFeedbackType: null
      }));
      console.log('[Store] addFeedback: standalone feedback');
    }
  },

  resolveFeedback: (feedbackId) => {
    set((state) => {
      const fb = state.feedbacks.find(f => f.id === feedbackId);
      const now = new Date().toLocaleString('zh-CN');
      const newFeedbacks = state.feedbacks.map(f =>
        f.id === feedbackId
          ? { ...f, status: 'resolved' as const, resolveTime: now }
          : f
      );
      let newAlerts = state.tempAlerts;
      if (fb?.alertId) {
        newAlerts = state.tempAlerts.map(a =>
          a.id === fb.alertId ? { ...a, resolved: true, handled: true } : a
        );
      }
      console.log('[Store] resolveFeedback:', feedbackId, fb?.alertId ? 'alert resolved' : '');
      return { feedbacks: newFeedbacks, tempAlerts: newAlerts };
    });
  },

  toggleVoice: () => {
    set((state) => ({ voiceEnabled: !state.voiceEnabled }));
  },

  setPendingAlertId: (id) => {
    set({ pendingAlertId: id });
    console.log('[Store] setPendingAlertId:', id);
  },

  setPendingFeedbackType: (type) => {
    set({ pendingFeedbackType: type });
    console.log('[Store] setPendingFeedbackType:', type);
  },

  setDeliveryInfo: (info) => {
    const { task } = get();
    if (task) {
      set({ task: { ...task, deliveryInfo: info } });
      console.log('[Store] setDeliveryInfo:', info);
    }
  }
}));
