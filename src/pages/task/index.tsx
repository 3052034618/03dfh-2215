import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store';
import TempCard from '@/components/TempCard';
import RiskCard from '@/components/RiskCard';
import TaskInfoCard from '@/components/TaskInfoCard';
import GoodsSelector from '@/components/GoodsSelector';
import { GOODS_TYPE_OPTIONS } from '@/data/mock';
import { scanWaybill, fetchCurrentTemp, fetchWaybillDetail } from '@/services';
import { GoodsType } from '@/types';
import { speakIfEnabled } from '@/utils';
import styles from './index.module.scss';

const TaskPage: React.FC = () => {
  const {
    driver,
    task,
    riskPoints,
    voiceEnabled,
    createTask,
    startTask,
    updateCurrentTemp
  } = useAppStore();

  const [waybillNo, setWaybillNo] = useState('');
  const [selectedGoods, setSelectedGoods] = useState<GoodsType | undefined>();
  const [tempMin, setTempMin] = useState(2);
  const [tempMax, setTempMax] = useState(8);
  const [loading, setLoading] = useState(false);

  const handleScan = useCallback(async () => {
    try {
      const result = await scanWaybill();
      setWaybillNo(result);
      if (result && result.length >= 6) {
        const detail = await fetchWaybillDetail(result);
        if (detail) {
          Taro.showToast({ title: '运单信息已获取', icon: 'success' });
        }
      }
      console.log('[TaskPage] handleScan success');
    } catch (e) {
      console.error('[TaskPage] handleScan error:', e);
      Taro.showToast({ title: '扫码已取消', icon: 'none' });
    }
  }, []);

  const handleGoodsChange = useCallback((value: GoodsType, min: number, max: number) => {
    setSelectedGoods(value);
    setTempMin(min);
    setTempMax(max);
    console.log('[TaskPage] handleGoodsChange:', value, min, max);
  }, []);

  const handleCreateTask = useCallback(() => {
    if (!waybillNo.trim()) {
      Taro.showToast({ title: '请输入或扫描运单号', icon: 'none' });
      return;
    }
    if (!selectedGoods) {
      Taro.showToast({ title: '请选择货品类型', icon: 'none' });
      return;
    }
    createTask(waybillNo.trim(), selectedGoods, tempMin, tempMax);
    Taro.showToast({ title: '任务已创建', icon: 'success' });
    speakIfEnabled(voiceEnabled, '任务已创建，请核对装货信息无误后点击开始运输');
  }, [waybillNo, selectedGoods, tempMin, tempMax, createTask, voiceEnabled]);

  const handleStart = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      startTask();
      setLoading(false);
      Taro.showToast({ title: '开始运输，祝您一路平安', icon: 'none' });
      speakIfEnabled(voiceEnabled, '已开始运输，系统将全程监控温度，请注意提醒');
      console.log('[TaskPage] handleStart success');
    }, 500);
  }, [startTask, voiceEnabled]);

  const handleRefreshTemp = useCallback(async () => {
    if (!task) return;
    try {
      const temp = await fetchCurrentTemp();
      updateCurrentTemp(temp);
      Taro.showToast({ title: '温度已更新', icon: 'success' });
    } catch (e) {
      console.error('[TaskPage] handleRefreshTemp error:', e);
    }
  }, [task, updateCurrentTemp]);

  const handlePullDownRefresh = useCallback(() => {
    handleRefreshTemp().finally(() => {
      Taro.stopPullDownRefresh();
    });
  }, [handleRefreshTemp]);

  useEffect(() => {
    Taro.eventCenter.on('__taroStartPullDownRefresh', handlePullDownRefresh);
    return () => {
      Taro.eventCenter.off('__taroStartPullDownRefresh', handlePullDownRefresh);
    };
  }, [handlePullDownRefresh]);

  const noTask = !task || task.status === 'pending';

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled onRefresherRefresh={handlePullDownRefresh}>
      {/* 顶部问候 */}
      <View className={styles.greeting}>
        <Text className={styles.greetingText}>你好，{driver.name}</Text>
        <Text className={styles.vehicleInfo}>
          {driver.vehicleType} · {driver.vehicleNo}
        </Text>
      </View>

      <View className={noTask ? styles.createTaskSection : styles.contentSection}>
        {noTask ? (
          /* 创建任务区域 */
          <>
            <Text className={styles.sectionTitle}>出车前录入</Text>

            <View className={styles.inputCard}>
              <Text className={styles.inputLabel}>运单号</Text>
              <View className={styles.inputRow}>
                <Input
                  className={styles.inputField}
                  placeholder="请输入或扫描运单号"
                  value={waybillNo}
                  onInput={e => setWaybillNo(e.detail.value)}
                />
                <Button className={styles.scanBtn} onClick={handleScan}>扫码</Button>
              </View>
            </View>

            <GoodsSelector
              options={GOODS_TYPE_OPTIONS}
              value={selectedGoods}
              onChange={handleGoodsChange}
            />

            {selectedGoods && (
              <TaskInfoCard
                task={{
                  id: 'preview',
                  waybillNo: waybillNo || '待输入',
                  goodsType: selectedGoods,
                  goodsName: '',
                  tempMin,
                  tempMax,
                  loadingAddr: '系统获取中...',
                  unloadingAddr: '系统获取中...',
                  recommendedRoute: '系统规划中...',
                  estimatedDeparture: new Date().toLocaleString('zh-CN'),
                  estimatedArrival: '计算中...',
                  status: 'pending',
                  currentTemp: (tempMin + tempMax) / 2,
                  fuelLevel: 95,
                  distance: 0,
                  elapsedTime: '0小时0分'
                }}
                showDetails={false}
              />
            )}

            <Button
              className={styles.startBtn}
              onClick={handleCreateTask}
              disabled={!waybillNo.trim() || !selectedGoods}
            >
              确认创建任务
            </Button>
          </>
        ) : (
          /* 运输中显示 */
          <>
            {/* 状态统计条 */}
            <View className={styles.statsBar}>
              <View className={styles.statItem}>
                <View className={styles.statValueWrap}>
                  <Text className={styles.statValue}>{task.distance}</Text>
                  <Text className={styles.statUnit}>公里</Text>
                </View>
                <Text className={styles.statLabel}>已行驶</Text>
              </View>
              <View className={styles.statDivider} />
              <View className={styles.statItem}>
                <Text className={styles.statValue}>{task.elapsedTime}</Text>
                <Text className={styles.statLabel}>运输时长</Text>
              </View>
              <View className={styles.statDivider} />
              <View className={styles.statItem}>
                <View className={styles.statValueWrap}>
                  <Text className={styles.statValue}>{task.fuelLevel}</Text>
                  <Text className={styles.statUnit}>%</Text>
                </View>
                <Text className={styles.statLabel}>油箱</Text>
                <View className={styles.fuelBar}>
                  <View className={styles.fuelFill} style={{ width: `${task.fuelLevel}%` }} />
                </View>
              </View>
            </View>

            {/* 温度卡片 */}
            <TempCard
              currentTemp={task.currentTemp}
              tempMin={task.tempMin}
              tempMax={task.tempMax}
            />

            {/* 风险点 */}
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitleSm}>前方风险点</Text>
              {riskPoints.length > 0 && (
                <Text className={styles.riskCount}>共 {riskPoints.length} 处</Text>
              )}
            </View>
            {riskPoints.length > 0 ? (
              riskPoints.map((risk, idx) => (
                <RiskCard key={risk.id} risk={risk} isFirst={idx === 0} />
              ))
            ) : (
              <View className={styles.inputCard} style={{ textAlign: 'center' }}>
                <Text style={{ color: '#86909c' }}>前方路况良好，暂无风险点</Text>
              </View>
            )}

            {/* 任务详情 */}
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitleSm}>本趟任务</Text>
            </View>
            <TaskInfoCard task={task} showDetails />
          </>
        )}
      </View>

      {/* 运输中底部操作 */}
      {task && task.status === 'in_transit' && (
        <View className={styles.quickActions}>
          <Button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleRefreshTemp}>
            刷新温度
          </Button>
          <Button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            loading={loading}
            onClick={handleStart}
          >
            查看路线
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

export default TaskPage;
