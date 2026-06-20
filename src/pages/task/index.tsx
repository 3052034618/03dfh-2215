import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store';
import TempCard from '@/components/TempCard';
import RiskCard from '@/components/RiskCard';
import TaskInfoCard from '@/components/TaskInfoCard';
import GoodsSelector from '@/components/GoodsSelector';
import { GOODS_TYPE_OPTIONS, MOCK_RISK_POINTS } from '@/data/mock';
import { scanWaybill, fetchCurrentTemp, fetchWaybillDetail, uploadPhotos } from '@/services';
import { GoodsType, Task, TempRecord } from '@/types';
import { speakIfEnabled, getTempStatus, formatTemp } from '@/utils';
import classnames from 'classnames';
import styles from './index.module.scss';

const TaskPage: React.FC = () => {
  const {
    driver,
    task,
    riskPoints,
    voiceEnabled,
    createTask,
    startTask,
    completeTask,
    completeTaskWithDelivery,
    resetTask,
    updateCurrentTemp,
    tempAlerts,
    tempRecords,
    feedbacks,
    lastDeliveryRecord
  } = useAppStore();

  const [waybillNo, setWaybillNo] = useState('');
  const [selectedGoods, setSelectedGoods] = useState<GoodsType | undefined>();
  const [tempMin, setTempMin] = useState(2);
  const [tempMax, setTempMax] = useState(8);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [taskDetail, setTaskDetail] = useState<Partial<Task> | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([]);
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
    speakIfEnabled(voiceEnabled, '运单信息已创建，请确认装货地卸货地路线和温区，无误后点击开始运输');
    setTimeout(() => {
      Taro.pageScrollTo?.({ scrollTop: 0, duration: 200 });
    }, 50);
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
      const temp = await fetchCurrentTemp(task.goodsType, task.tempMin, task.tempMax);
      updateCurrentTemp(temp);
      const status = getTempStatus(temp, task.tempMin, task.tempMax);
      if (status === 'normal') {
        Taro.showToast({ title: '温度正常', icon: 'success' });
      } else if (status === 'warning') {
        Taro.showToast({ title: '温度接近温区边界', icon: 'none' });
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
      }, 25000);
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

  const handleCompleteDelivery = useCallback(() => {
    setCompleting(true);
    setTimeout(() => {
      completeTask();
      setCompleting(false);
      speakIfEnabled(voiceEnabled, '已到站，请完成交付确认');
    }, 800);
  }, [completeTask, voiceEnabled]);

  const handleAddDeliveryPhoto = useCallback(async () => {
    try {
      const paths = await uploadPhotos(3 - deliveryPhotos.length);
      setDeliveryPhotos(prev => [...prev, ...paths].slice(0, 3));
    } catch (e) {
      console.error('[TaskPage] handleAddDeliveryPhoto error:', e);
    }
  }, [deliveryPhotos.length]);

  const handleRemoveDeliveryPhoto = useCallback((index: number) => {
    setDeliveryPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirmDelivery = useCallback(() => {
    if (!receiverName.trim()) {
      Taro.showToast({ title: '请输入收货人姓名', icon: 'none' });
      return;
    }
    setCompleting(true);
    setTimeout(() => {
      completeTaskWithDelivery({
        receiverName: receiverName.trim(),
        deliveryNote: deliveryNote.trim(),
        photos: deliveryPhotos
      });
      setCompleting(false);
      Taro.showToast({ title: '交付确认已完成', icon: 'success' });
      speakIfEnabled(voiceEnabled, '交付已确认，可查看本趟运输摘要');
    }, 800);
  }, [receiverName, deliveryNote, deliveryPhotos, completeTaskWithDelivery, voiceEnabled]);

  const handleNewOrder = useCallback(() => {
    Taro.showModal({
      title: '新建下一单',
      content: '确认开始新一单的录入吗？',
      success: (res) => {
        if (res.confirm) {
          resetTask();
          setWaybillNo('');
          setSelectedGoods(undefined);
          setTempMin(2);
          setTempMax(8);
          setTaskDetail(null);
          setReceiverName('');
          setDeliveryNote('');
          setDeliveryPhotos([]);
          Taro.pageScrollTo?.({ scrollTop: 0, duration: 200 });
        }
      }
    });
  }, [resetTask]);

  const activeAlerts = useMemo(
    () => tempAlerts.filter(a => !a.handled && !a.resolved),
    [tempAlerts]
  );
  const resolvedAlerts = useMemo(
    () => tempAlerts.filter(a => a.resolved),
    [tempAlerts]
  );
  const tempSummary = useMemo(() => {
    if (tempRecords.length === 0) return null;
    const temps = tempRecords.map(r => r.temp);
    const avg = temps.reduce((s, t) => s + t, 0) / temps.length;
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    let compliance = 0;
    if (task) {
      const normalCount = temps.filter(t => t >= task.tempMin && t <= task.tempMax).length;
      compliance = (normalCount / temps.length) * 100;
    }
    return {
      avg: +avg.toFixed(1),
      max: +max.toFixed(1),
      min: +min.toFixed(1),
      compliance: +compliance.toFixed(0),
      count: temps.length
    };
  }, [tempRecords, task]);

  const isFormStep = !task;
  const isConfirmStep = task && task.status === 'pending';
  const isDriving = task && task.status === 'in_transit';
  const isCompleted = task && task.status === 'completed';

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled onRefresherRefresh={handlePullDownRefresh}>
      <View className={styles.greeting}>
        <Text className={styles.greetingText}>你好，{driver.name}</Text>
        <Text className={styles.vehicleInfo}>
          {driver.vehicleType} · {driver.vehicleNo}
        </Text>
      </View>

      <View className={styles.contentSection}>
        {/* ===== 阶段1：录入表单 ===== */}
        {isFormStep && (
          <>
            {lastDeliveryRecord && (
              <View className={styles.lastDeliveryCard}>
                <View className={styles.lastDeliveryHead}>
                  <Text className={styles.lastDeliveryIcon}>📦</Text>
                  <Text className={styles.lastDeliveryTitle}>上一单交付记录</Text>
                </View>
                <View className={styles.lastDeliveryRow}>
                  <Text className={styles.lastDeliveryLabel}>运单号</Text>
                  <Text className={styles.lastDeliveryValue}>{lastDeliveryRecord.waybillNo}</Text>
                </View>
                <View className={styles.lastDeliveryRow}>
                  <Text className={styles.lastDeliveryLabel}>路线</Text>
                  <Text className={styles.lastDeliveryValue}>{lastDeliveryRecord.route}</Text>
                </View>
                <View className={styles.lastDeliveryRow}>
                  <Text className={styles.lastDeliveryLabel}>交付时间</Text>
                  <Text className={styles.lastDeliveryValue}>{lastDeliveryRecord.confirmTime}</Text>
                </View>
                <View className={styles.lastDeliveryRow}>
                  <Text className={styles.lastDeliveryLabel}>合规率</Text>
                  <Text className={styles.lastDeliveryValue} style={{
                    color: lastDeliveryRecord.compliance >= 95 ? '#10b981' : lastDeliveryRecord.compliance >= 80 ? '#f97316' : '#ef4444'
                  }}>
                    {lastDeliveryRecord.compliance}%
                  </Text>
                </View>
                <View className={styles.lastDeliveryGoods}>
                  {GOODS_TYPE_OPTIONS.find(g => g.key === lastDeliveryRecord.goodsType)?.label}
                </View>
              </View>
            )}
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
              {taskDetail && (
                <View className={styles.waybillFetched}>
                  ✅ 已识别运单信息：{taskDetail.loadingAddr?.slice(0, 10)}... → {taskDetail.unloadingAddr?.slice(0, 10)}...
                </View>
              )}
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

        {/* ===== 阶段2：任务确认 ===== */}
        {isConfirmStep && (
          <>
            <View className={styles.confirmBanner}>
              <Text className={styles.confirmBannerIcon}>📋</Text>
              <View className={styles.confirmBannerContent}>
                <Text className={styles.confirmBannerTitle}>请确认本趟任务信息</Text>
                <Text className={styles.confirmBannerHint}>核实无误后点击开始运输</Text>
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
            <Button
              className={styles.startBtnSecondary}
              onClick={() => {
                resetTask();
                setWaybillNo(task.waybillNo);
              }}
            >
              返回修改
            </Button>
          </>
        )}

        {/* ===== 阶段3：行驶中 ===== */}
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

            {activeAlerts.length === 0 && resolvedAlerts.length > 0 && tempSummary && (
              <View className={classnames(styles.alertBanner, styles.resolvedBanner)}>
                <Text className={styles.alertBannerIcon}>✅</Text>
                <View className={styles.alertBannerContent}>
                  <Text className={styles.resolvedBannerTitle}>
                    当前温度正常 · 已缓解 {resolvedAlerts.length} 次预警
                  </Text>
                  <Text className={styles.resolvedBannerHint}>
                    温区合规率 {tempSummary.compliance}%
                  </Text>
                </View>
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
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  isFirst={idx === 0}
                  currentTemp={task.currentTemp}
                  tempMin={task.tempMin}
                  tempMax={task.tempMax}
                />
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

        {/* ===== 阶段4：到站交付 ===== */}
        {isCompleted && !task.deliveryInfo && (
          <>
            <View className={styles.completeBanner}>
              <Text className={styles.completeBannerIcon}>🎯</Text>
              <View className={styles.completeBannerContent}>
                <Text className={styles.completeBannerTitle}>已到达卸货地</Text>
                <Text className={styles.completeBannerHint}>
                  请填写交付信息并确认
                </Text>
              </View>
            </View>

            <View className={styles.deliveryFormCard}>
              <Text className={styles.deliveryFormTitle}>交付确认</Text>

              <Text className={styles.formLabel}>
                <Text className={styles.formRequired}>*</Text>收货人姓名
              </Text>
              <Input
                className={styles.inputField}
                placeholder="请输入收货人姓名"
                value={receiverName}
                onInput={e => setReceiverName(e.detail.value)}
              />

              <Text className={styles.formLabel}>交付备注</Text>
              <Textarea
                className={styles.textareaField}
                placeholder="可记录货物状态、异常情况、交接说明等"
                value={deliveryNote}
                onInput={e => setDeliveryNote(e.detail.value)}
                maxlength={300}
                showConfirmBar={false}
                autoHeight
              />
              <Text style={{ fontSize: '22rpx', color: '#86909c', marginTop: '8rpx', textAlign: 'right' }}>
                {deliveryNote.length}/300
              </Text>

              <Text className={styles.formLabel}>现场照片（可选，最多3张）</Text>
              <View className={styles.photoSection}>
                {deliveryPhotos.map((path, idx) => (
                  <View key={idx} className={styles.photoItem}>
                    <Image className={styles.photoImg} src={path} mode="aspectFill" />
                    <View className={styles.photoRemove} onClick={() => handleRemoveDeliveryPhoto(idx)}>×</View>
                  </View>
                ))}
                {deliveryPhotos.length < 3 && (
                  <View className={styles.photoAdd} onClick={handleAddDeliveryPhoto}>
                    <Text className={styles.photoAddIcon}>+</Text>
                    <Text className={styles.photoAddText}>添加照片</Text>
                  </View>
                )}
              </View>

              <Button
                className={styles.startBtn}
                loading={completing}
                onClick={handleConfirmDelivery}
              >
                ✅ 确认交付
              </Button>
            </View>
          </>
        )}

        {/* ===== 阶段5：交付摘要 ===== */}
        {isCompleted && task.deliveryInfo && (
          <>
            <View className={styles.completeBanner}>
              <Text className={styles.completeBannerIcon}>🎯</Text>
              <View className={styles.completeBannerContent}>
                <Text className={styles.completeBannerTitle}>本趟运输已完成交付</Text>
                <Text className={styles.completeBannerHint}>
                  请查看本趟温度合规与预警摘要
                </Text>
              </View>
            </View>

            <View className={styles.deliveryCard}>
              <Text className={styles.deliveryCardTitle}>运输交付摘要</Text>
              <View className={styles.deliveryWaybillRow}>
                <Text className={styles.deliveryLabel}>运单号</Text>
                <Text className={styles.deliveryValue}>{task.waybillNo}</Text>
              </View>
              <View className={styles.deliveryWaybillRow}>
                <Text className={styles.deliveryLabel}>收货人</Text>
                <Text className={styles.deliveryValue}>{task.deliveryInfo.receiverName}</Text>
              </View>
              <View className={styles.deliveryWaybillRow}>
                <Text className={styles.deliveryLabel}>交付时间</Text>
                <Text className={styles.deliveryValue}>{task.deliveryInfo.confirmTime}</Text>
              </View>
              {task.deliveryInfo.deliveryNote && (
                <View className={styles.deliveryWaybillRow}>
                  <Text className={styles.deliveryLabel}>备注</Text>
                  <Text className={styles.deliveryValue}>{task.deliveryInfo.deliveryNote}</Text>
                </View>
              )}
              <View className={styles.deliveryDivider} />
              <View className={styles.deliveryWaybillRow}>
                <Text className={styles.deliveryLabel}>路线</Text>
                <Text className={styles.deliveryValueRight}>
                  {task.loadingAddr.slice(0, 12)} → {task.unloadingAddr.slice(0, 12)}
                </Text>
              </View>
              {task.deliveryInfo.photos.length > 0 && (
                <View className={styles.deliveryPhotosRow}>
                  {task.deliveryInfo.photos.map((p, i) => (
                    <Image key={i} className={styles.deliveryPhoto} src={p} mode="aspectFill" />
                  ))}
                </View>
              )}
            </View>

            <View className={styles.deliveryStatsRow}>
              <View className={styles.deliveryStat}>
                <Text className={styles.deliveryStatLabel}>平均温度</Text>
                <Text className={styles.deliveryStatValue}>
                  {tempSummary ? formatTemp(tempSummary.avg) : '--'}
                </Text>
              </View>
              <View className={styles.deliveryStat}>
                <Text className={styles.deliveryStatLabel}>最高温度</Text>
                <Text className={styles.deliveryStatValue} style={{ color: '#ef4444' }}>
                  {tempSummary ? formatTemp(tempSummary.max) : '--'}
                </Text>
              </View>
              <View className={styles.deliveryStat}>
                <Text className={styles.deliveryStatLabel}>最低温度</Text>
                <Text className={styles.deliveryStatValue} style={{ color: '#2563eb' }}>
                  {tempSummary ? formatTemp(tempSummary.min) : '--'}
                </Text>
              </View>
            </View>

            <View className={styles.deliveryComplianceCard}>
              <View className={styles.complianceHead}>
                <Text className={styles.complianceLabel}>温区合规率</Text>
                <Text className={styles.complianceValue}>
                  {tempSummary ? tempSummary.compliance : 0}%
                </Text>
              </View>
              <View className={styles.complianceBar}>
                <View
                  className={styles.complianceFill}
                  style={{ width: `${tempSummary?.compliance || 0}%` }}
                />
              </View>
              <Text className={styles.complianceHint}>
                目标温区 {formatTemp(task.tempMin)} ~ {formatTemp(task.tempMax)}，采样 {tempSummary?.count || 0} 次
              </Text>
            </View>

            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitleSm}>本趟预警与反馈</Text>
            </View>
            <View className={styles.deliverySummaryRow}>
              <View className={styles.summaryTag}>
                <Text className={styles.summaryTagNum}>{tempAlerts.length}</Text>
                <Text className={styles.summaryTagLabel}>总预警</Text>
              </View>
              <View className={styles.summaryTag}>
                <Text className={styles.summaryTagNum}>{resolvedAlerts.length}</Text>
                <Text className={styles.summaryTagLabel}>已缓解</Text>
              </View>
              <View className={styles.summaryTag}>
                <Text className={styles.summaryTagNum}>{activeAlerts.length}</Text>
                <Text className={styles.summaryTagLabel}>未处理</Text>
              </View>
              <View className={styles.summaryTag}>
                <Text className={styles.summaryTagNum}>{feedbacks.length}</Text>
                <Text className={styles.summaryTagLabel}>反馈记录</Text>
              </View>
            </View>
            {activeAlerts.length > 0 && (
              <View className={styles.unhandledWarn}>
                ⚠️ 还有 {activeAlerts.length} 条预警未处理，请前往温度提醒查看
              </View>
            )}

            <Button
              className={styles.startBtn}
              loading={completing}
              style={{ display: 'none' }}
            />
            <Button
              className={styles.startBtn}
              onClick={handleNewOrder}
            >
              ➕ 新建下一单
            </Button>
          </>
        )}
      </View>

      {/* 行驶中底部操作 */}
      {isDriving && (
        <View className={styles.quickActions}>
          <Button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleRefreshTemp}>
            刷新温度
          </Button>
          <Button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={handleCompleteDelivery}
            loading={completing}
          >
            🎯 到站交付
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

export default TaskPage;
