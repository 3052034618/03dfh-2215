import Taro from '@tarojs/taro';
import { Task, FeedbackItem, TempAlert, GoodsType } from '@/types';
import { GOODS_TYPE_OPTIONS } from '@/data/mock';

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
      loadingAddr: '北京市冷藏物流中心冷库A区',
      unloadingAddr: '上海市冷链配送中心3号库',
      recommendedRoute: '推荐走京沪高速转沈海高速，全程约1220公里，预计行车16小时'
    };
  }
  return null;
};

export const fetchCurrentTemp = async (goodsType?: GoodsType, tempMin?: number, tempMax?: number): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  let min = tempMin;
  let max = tempMax;

  if ((min === undefined || max === undefined) && goodsType) {
    const option = GOODS_TYPE_OPTIONS.find(g => g.key === goodsType);
    if (option) {
      min = option.tempMin;
      max = option.tempMax;
    }
  }

  if (min === undefined) min = 2;
  if (max === undefined) max = 8;

  const range = max - min;
  const avg = (min + max) / 2;
  const drift = (Math.random() - 0.5) * 2;
  const wave = Math.sin(Date.now() / 10000) * (range * 0.1);
  const base = avg + wave + drift;

  const spikeChance = Math.random();
  let temp = base;
  if (spikeChance > 0.85) {
    temp = max + Math.random() * range * 0.3;
  } else if (spikeChance < 0.05) {
    temp = min - Math.random() * range * 0.2;
  }

  const result = +temp.toFixed(1);
  console.log('[Service] fetchCurrentTemp:', result, { min, max, goodsType });
  return result;
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
      voiced: false,
      resolved: false,
      suggestions: [
        '检查车厢门封条是否完好，有无漏气',
        '查看制冷机组运行状态，温度设定是否正确',
        '检查油箱油量，确保机组供油正常'
      ]
    };
  }
  return null;
};
