import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store';
import TempCard from '@/components/TempCard';
import RiskCard from '@/components/RiskCard';
import TaskInfoCard from '@/components/TaskInfoCard';
import GoodsSelector from '@/components/GoodsSelector';
import { GOODS_TYPE_OPTIONS } from '@/data/mock';
import { scanWaybill, fetchCurrentTemp, fetchWaybillDetail } from '@/services';
import { GoodsType, Task } from '@/types';
import { speakIfEnabled, getTempStatus } from '@/utils';
import styles from './index.module.scss';

const TaskPage: React.FC = () => {
  const {
    driver,
    task,
    riskPoints,
    voiceEnabled,
    createTask,
    startTask,
    updateCurrentTemp,
    tempAlerts
  } = useAppStore();

  const [waybillNo, setWaybillNo] = useState('');
  const [selectedGoods, setSelectedGoods] = useState<GoodsType | undefined>();
  const [tempMin, setTempMin] = useState(2);
  const [tempMax, setTempMax] = useState(8);
  const [loading, setLoading] = useState(false);
  const [taskDetail, setTaskDetail] = useState<Partial<Task> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleScan = useCallback(async () => {
    try {
      const result = await scanWaybill();
      setWaybillNo(result);
      if (result && result.length >= 6) {
        const detail = await fetchWaybillDetail(result);
        if (detail) {
          setTaskDetail(detail);
          Taro.showToast({ title: '运单信息已获取', icon: 'success' });
        }
      }
    } catch (e) {
      console.error('[TaskPage] handleScan error:', e);
      Taro.showToast({ title: '扫码已取消', icon: 'none' });
    }
  }, []);

  const handleGoodsChange = useCallback((value: GoodsType, min: number, max: number) => {
    setSelectedGoods(value);
    setTempMin(min);
    setTempMax(max);
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
    createTask(waybillNo.trim(), selectedGoods, tempMin, tempMax, taskDetail || undefined);
    speakIfEnabled(voiceEnabled, '任务已创建，请核对装货信息无误后点击开始运输');
  }, [waybillNo, selectedGoods, tempMin, tempMax, createTask, voiceEnabled, taskDetail]);

  const handleStart = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      startTask();
      setLoading(false);
      Taro.showToast({ title: '开始运输，祝您一路平安', icon: 'none' });
      speakIfEnabled(voiceEnabled, '已开始运输，系统将全程监控温度，请注意提醒');
    }, 500);
  }, [startTask, voiceEnabled]);

  const handleRefreshTemp = useCallback(async () => {
    if (!task) return;
    try {
      const temp = await fetchCurrentTemp();
      updateCurrentTemp(temp);
      const status = getTempStatus(temp, task.tempMin, task.tempMax);
      if (status === 'normal') {
        Taro.showToast({ title: '温度正常', icon: 'success' });
      } else if (status === 'warning') {
        Taro.showToast({ title: '温度接近温区上限', icon: 'none' });
      } else {
        Taro.showToast({ title: '温度超限！', icon: 'error' });
      }
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

  useEffect(() => {
    if (task && task.status === 'in_transit') {
      timerRef.current = setInterval(() => {
        handleRefreshTemp();
      }, 30000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [task?.status, handleRefreshTemp]);

  const isFormStep = !task || task.status === 'loading';
  const isConfirmStep = task && task.status === 'pending';
  const isDriving = task && task.status === 'in_transit';
  const activeAlerts = tempAlerts.filter(a => !a.handled && !a.resolved);

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled onRefresherRefresh={handlePullDownRefresh}>
      <View className={styles.greeting}>
        <Text className={styles.greetingText}>你好，{driver.name}</Text>
        <Text className={styles.vehicleInfo}>
          {driver.vehicleType} · {driver.vehicleNo}
        </Text>
      </View>

      <View className={styles.contentSection}>
        {/* ===== 录入表单阶段 ===== */}
        {isFormStep && (
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
            <Button
              className={styles.startBtn}
              onClick={handleCreateTask}
              disabled={!waybillNo.trim() || !selectedGoods}
            >
              确认运单信息
            </Button>
          </>
        )}

        {/* ===== 确认阶段：看到完整任务详情 ===== */}
        {isConfirmStep && (
          <>
            <View className={styles.confirmBanner}>
              <Text className={styles.confirmBannerIcon}>📋</Text>
              <View className={styles.confirmBannerContent}>
                <Text className={styles.confirmBannerTitle}>请确认本趟任务信息</Text>
                <Text className={styles.confirmBannerHint}>核实无误后点击下方按钮开始运输</Text>
              </View>
            </View>
            <TaskInfoCard task={task} showDetails />
            <Button
              className={styles.startBtn}
              loading={loading}
              onClick={handleStart}
            >
              ✅ 确认无误，开始运输
            </Button>
          </>
        )}

        {/* ===== 行驶中阶段 ===== */}
        {isDriving && (
          <>
            {activeAlerts.length > 0 && (
              <View className={styles.alertBanner} onClick={() => Taro.switchTab({ url: '/pages/alert/index' })}>
                <Text className={styles.alertBannerIcon}>⚠️</Text>
                <View className={styles.alertBannerContent}>
                  <Text className={styles.alertBannerTitle}>
                    {activeAlerts.length}条温度预警待处理
                  </Text>
                  <Text className={styles.alertBannerHint}>
                    当前 {task.currentTemp.toFixed(1)}℃，点击查看详情
                  </Text>
                </View>
                <Text className={styles.alertBannerArrow}>›</Text>
              </View>
            )}

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

            <TempCard
              currentTemp={task.currentTemp}
              tempMin={task.tempMin}
              tempMax={task.tempMax}
            />

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

            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitleSm}>本趟任务</Text>
            </View>
            <TaskInfoCard task={task} showDetails />
          </>
        )}
      </View>

      {isDriving && (
        <View className={styles.quickActions}>
          <Button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleRefreshTemp}>
            刷新温度
          </Button>
          <Button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => Taro.switchTab({ url: '/pages/feedback/index' })}
          >
            一键反馈
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

export default TaskPage;
