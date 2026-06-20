import Taro from '@tarojs/taro';
import { Task, FeedbackItem, TempAlert } from '@/types';

export const scanWaybill = async (): Promise<string> => {
  try {
    const res = await Taro.scanCode({
      scanType: ['qrCode', 'barCode'],
      onlyFromCamera: false
    });
    console.log('[Service] scanWaybill result:', res.result);
    return res.result;
  } catch (e) {
    console.error('[Service] scanWaybill error:', e);
    return Promise.reject(e);
  }
};

export const uploadPhotos = async (count: number = 3): Promise<string[]> => {
  try {
    const res = await Taro.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album']
    });
    console.log('[Service] uploadPhotos count:', res.tempFilePaths.length);
    return res.tempFilePaths;
  } catch (e) {
    console.error('[Service] uploadPhotos error:', e);
    return Promise.reject(e);
  }
};

export const submitFeedback = async (feedback: Omit<FeedbackItem, 'id' | 'createTime' | 'status'>): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  console.log('[Service] submitFeedback:', feedback);
  return true;
};

export const fetchWaybillDetail = async (waybillNo: string): Promise<Partial<Task> | null> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('[Service] fetchWaybillDetail:', waybillNo);
  if (waybillNo && waybillNo.length >= 6) {
    return {
      goodsName: '冷链货物',
      loadingAddr: '北京市冷藏物流中心',
      unloadingAddr: '上海市冷链配送站',
      recommendedRoute: '推荐走京沪高速，全程约1200公里'
    };
  }
  return null;
};

export const fetchCurrentTemp = async (): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const base = 4 + Math.random() * 4;
  const temp = +base.toFixed(1);
  console.log('[Service] fetchCurrentTemp:', temp);
  return temp;
};

export const checkTempDrift = async (currentTemp: number, min: number, max: number): Promise<TempAlert | null> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const avg = (min + max) / 2;
  const range = max - min;
  const diff = Math.abs(currentTemp - avg);
  const driftPct = diff / range;

  if (driftPct > 0.7) {
    const driftDirection = currentTemp > avg ? 'up' : 'down';
    const driftValue = +(currentTemp - (driftDirection === 'up' ? max : min)).toFixed(1);
    return {
      id: `ALERT${Date.now()}`,
      time: new Date().toLocaleString('zh-CN'),
      currentTemp,
      targetMin: min,
      targetMax: max,
      driftDirection,
      driftValue,
      severity: driftPct > 0.9 ? 'danger' : 'warning',
      handled: false,
      suggestions: [
        '检查车厢门封条是否完好，有无漏气',
        '查看制冷机组运行状态，温度设定是否正确',
        '检查油箱油量，确保机组供油正常'
      ]
    };
  }
  return null;
};
