import React, { useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store';
import TempCard from '@/components/TempCard';
import { formatTemp, formatTime, speakIfEnabled, getTempStatus } from '@/utils';
import classnames from 'classnames';
import styles from './index.module.scss';

const AlertPage: React.FC = () => {
  const { task, tempAlerts, tempRecords, voiceEnabled, handleAlert, toggleVoice, setPendingAlertId } = useAppStore();

  const unhandledCount = useMemo(
    () => tempAlerts.filter(a => !a.handled && !a.resolved).length,
    [tempAlerts]
  );

  const resolvedCount = useMemo(
    () => tempAlerts.filter(a => a.resolved).length,
    [tempAlerts]
  );

  const displayRecords = useMemo(() => {
    if (tempRecords.length <= 17) return tempRecords;
    return tempRecords.slice(tempRecords.length - 17);
  }, [tempRecords]);

  const chartData = useMemo(() => {
    if (!task || displayRecords.length === 0) return [];
    const temps = displayRecords.map(r => r.temp);
    const minTemp = Math.min(...temps, task.tempMin - 1);
    const maxTemp = Math.max(...temps, task.tempMax + 1);
    const range = maxTemp - minTemp || 1;
    const height = 288;

    return displayRecords.map(r => {
      const h = Math.max(8, ((r.temp - minTemp) / range) * height);
      const status = getTempStatus(r.temp, task.tempMin, task.tempMax);
      return {
        ...r,
        height: h,
        status,
        minPct: ((task.tempMin - minTemp) / range) * 100,
        maxPct: ((task.tempMax - minTemp) / range) * 100
      };
    });
  }, [displayRecords, task]);

  const handleToggleVoice = useCallback(() => {
    toggleVoice();
    const next = !voiceEnabled;
    Taro.showToast({
      title: next ? '语音提醒已开启' : '语音提醒已关闭',
      icon: 'none'
    });
    if (next) {
      speakIfEnabled(true, '语音提醒已开启，温度异常时我会及时提醒您');
    }
  }, [voiceEnabled, toggleVoice]);

  const handlePlayAlert = useCallback((alert) => {
    const text = `温度提醒：当前温度${formatTemp(alert.currentTemp)}，${
      alert.driftDirection === 'up' ? '已接近上限' : '已接近下限'
    }，请检查车厢密封、制冷机组和油量`;
    speakIfEnabled(true, text);
    Taro.showToast({ title: '正在语音播报...', icon: 'none' });
  }, []);

  const handleMarkChecked = useCallback(async (alertId) => {
    try {
      setPendingAlertId(alertId);
      Taro.showToast({ title: '已带入预警信息', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/feedback/index' });
      }, 400);
    } catch (e) {
      console.error('[AlertPage] handleMarkChecked error:', e);
    }
  }, [setPendingAlertId]);

  const handleGoFeedback = useCallback((alertId) => {
    setPendingAlertId(alertId);
    Taro.switchTab({ url: '/pages/feedback/index' });
  }, [setPendingAlertId]);

  if (!task) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '32rpx', textAlign: 'center' }}>
          <Text style={{ color: '#86909c' }}>暂无运输任务</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled>
      <View className={styles.headerCard}>
        <View className={styles.headerTop}>
          <Text className={styles.headerTitle}>温度监控总览</Text>
          <View className={styles.voiceToggle} onClick={handleToggleVoice}>
            <Text className={styles.voiceIcon}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            <Text className={styles.voiceText}>{voiceEnabled ? '语音开' : '语音关'}</Text>
          </View>
        </View>
        <View className={styles.summaryRow}>
          <View className={styles.summaryItem}>
            <View className={styles.summaryValueWrap}>
              <Text className={styles.summaryValue}>{unhandledCount}</Text>
              <Text className={styles.summaryUnit}>条</Text>
            </View>
            <Text className={styles.summaryLabel}>待处理预警</Text>
          </View>
          <View className={styles.summaryItem}>
            <View className={styles.summaryValueWrap}>
              <Text className={styles.summaryValue}>{resolvedCount}</Text>
              <Text className={styles.summaryUnit}>条</Text>
            </View>
            <Text className={styles.summaryLabel}>已缓解</Text>
          </View>
          <View className={styles.summaryItem}>
            <View className={styles.summaryValueWrap}>
              <Text className={styles.summaryValue}>{formatTemp(task.currentTemp)}</Text>
            </View>
            <Text className={styles.summaryLabel}>当前温度</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <TempCard
          currentTemp={task.currentTemp}
          tempMin={task.tempMin}
          tempMax={task.tempMax}
        />

        <View className={styles.trendCard}>
          <View className={styles.cardHeader}>
            <Text className={styles.cardTitle}>温度趋势</Text>
            <Text className={styles.cardSubtitle}>
              温区: {formatTemp(task.tempMin)} ~ {formatTemp(task.tempMax)}
            </Text>
          </View>
          <View className={styles.chartArea}>
            <View className={styles.chartGrid}>
              <View className={styles.gridLine} />
              <View className={styles.gridLine} />
              <View className={styles.gridLine} />
              <View className={styles.gridLine} />
            </View>
            <View className={styles.rangeLines}>
              {chartData.length > 0 && (
                <>
                  <View
                    className={styles.rangeMax}
                    style={{ bottom: `${100 - chartData[0].maxPct}%` }}
                  >
                    <View className={styles.rangeMaxLabel}>上限 {formatTemp(task.tempMax)}</View>
                  </View>
                  <View
                    className={styles.rangeMin}
                    style={{ bottom: `${100 - chartData[0].minPct}%` }}
                  >
                    <View className={styles.rangeMinLabel}>下限 {formatTemp(task.tempMin)}</View>
                  </View>
                </>
              )}
            </View>
            <View className={styles.chartBars}>
              {chartData.map((item, idx) => {
                const showLabel = idx % 3 === 0 || idx === chartData.length - 1;
                return (
                  <View key={`${item.time}-${idx}`} className={styles.barItem}>
                    <View
                      className={classnames(
                        styles.bar,
                        item.status === 'warning' && styles.barWarn,
                        item.status === 'danger' && styles.barDanger
                      )}
                      style={{ height: `${item.height}rpx` }}
                    />
                    {showLabel && (
                      <Text className={styles.barTime}>{formatTime(item.time)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>温度预警记录</Text>
          {unhandledCount > 0 && (
            <View className={styles.badge}>{unhandledCount}</View>
          )}
        </View>

        {tempAlerts.length === 0 ? (
          <View className={styles.trendCard} style={{ textAlign: 'center' }}>
            <Text style={{ color: '#86909c' }}>暂无温度预警，一切正常</Text>
          </View>
        ) : (
          tempAlerts.map(alert => (
            <View
              key={alert.id}
              className={classnames(
                styles.alertItem,
                alert.handled && styles.alertItemHandled,
                alert.severity === 'danger' && !alert.resolved && styles.alertItemDanger,
                alert.resolved && styles.alertItemResolved
              )}
            >
              <View className={styles.alertHeader}>
                <View
                  className={classnames(
                    styles.alertSeverity,
                    alert.resolved && styles.severityResolved,
                    !alert.resolved && alert.severity === 'warning' && styles.severityWarning,
                    !alert.resolved && alert.severity === 'danger' && styles.severityDanger
                  )}
                >
                  <View className={styles.severityIcon} />
                  <Text className={styles.severityText}>
                    {alert.resolved ? '已缓解' : alert.severity === 'warning' ? '温度预警' : '温度超限'}
                  </Text>
                </View>
                <Text className={styles.alertTime}>{alert.time}</Text>
              </View>

              <View className={styles.alertTemp} onClick={() => handlePlayAlert(alert)}>
                <Text className={styles.alertTempValue}>
                  {formatTemp(alert.currentTemp)}
                </Text>
                <Text className={classnames(
                  styles.alertDrift,
                  alert.driftDirection === 'up' ? styles.driftUp : styles.driftDown
                )}>
                  {alert.driftDirection === 'up' ? '↑' : '↓'}
                  {alert.driftDirection === 'up' ? '+' : ''}{alert.driftValue}℃
                </Text>
                <Text className={styles.alertTempTarget}>
                  目标 {formatTemp(alert.targetMin)}~{formatTemp(alert.targetMax)}
                </Text>
              </View>

              <View className={styles.alertStatusRow}>
                {alert.voiced && (
                  <View className={classnames(styles.statusChip, styles.chipVoiced)}>
                    🔊 已播报
                  </View>
                )}
                {alert.handled && (
                  <View className={classnames(styles.statusChip, styles.chipHandled)}>
                    ✅ 已处理
                  </View>
                )}
                {alert.resolved && (
                  <View className={classnames(styles.statusChip, styles.chipResolved)}>
                    🟢 温度已恢复
                  </View>
                )}
                {!alert.handled && !alert.resolved && (
                  <View className={classnames(styles.statusChip, styles.chipPending)}>
                    ⏳ 待处理
                  </View>
                )}
              </View>

              {!alert.resolved && (
                <>
                  <Text className={styles.suggestionsTitle}>检查建议：</Text>
                  <View className={styles.suggestionsList}>
                    {alert.suggestions.map((s, idx) => (
                      <View key={idx} className={styles.suggestionItem}>
                        <View className={styles.suggestionNum}>{idx + 1}</View>
                        <Text className={styles.suggestionText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {!alert.handled && !alert.resolved && (
                <View className={styles.alertActions}>
                  <Button
                    className={`${styles.actionBtn} ${styles.actionChecked}`}
                    onClick={() => handleMarkChecked(alert.id)}
                  >
                    ✓ 已检查·处置
                  </Button>
                  <Button
                    className={`${styles.actionBtn} ${styles.actionHelp}`}
                    onClick={() => handleGoFeedback(alert.id)}
                  >
                    🆘 需协助
                  </Button>
                </View>
              )}
              {alert.handled && !alert.resolved && (
                <View className={styles.alertDoneHint}>
                  📋 已提交处置，请在反馈记录查看调度回复
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default AlertPage;
