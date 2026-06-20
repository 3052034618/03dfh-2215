import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Task } from '@/types';
import { formatTemp } from '@/utils';
import { GOODS_TYPE_OPTIONS } from '@/data/mock';

interface TaskInfoCardProps {
  task: Task;
  showDetails?: boolean;
}

const statusLabels: Record<Task['status'], { label: string; color: string; bg: string }> = {
  pending: { label: '待发车', color: '#64748b', bg: '#f1f5f9' },
  loading: { label: '装货中', color: '#f97316', bg: '#ffedd5' },
  in_transit: { label: '运输中', color: '#0284c7', bg: '#e0f2fe' },
  completed: { label: '已完成', color: '#22c55e', bg: '#dcfce7' }
};

const TaskInfoCard: React.FC<TaskInfoCardProps> = ({ task, showDetails = true }) => {
  const statusInfo = statusLabels[task.status];
  const goodsOption = GOODS_TYPE_OPTIONS.find(g => g.key === task.goodsType);

  return (
    <View className={styles.taskCard}>
      <View className={styles.taskHeader}>
        <View className={styles.waybillInfo}>
          <Text className={styles.waybillNo}>运单号 {task.waybillNo}</Text>
          <View className={styles.statusBadge} style={{ background: statusInfo.bg }}>
            <Text className={styles.statusText} style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
        <View className={styles.goodsType}>
          <Text className={styles.goodsIcon}>📦</Text>
          <View>
            <Text className={styles.goodsName}>{goodsOption?.label}</Text>
            <Text className={styles.goodsDesc}>{task.goodsName || goodsOption?.description}</Text>
          </View>
        </View>
      </View>

      <View className={styles.tempZone}>
        <View className={styles.tempItem}>
          <Text className={styles.tempLabel}>本趟温区</Text>
          <Text className={styles.tempRange}>
            {formatTemp(task.tempMin)} ～ {formatTemp(task.tempMax)}
          </Text>
        </View>
        <View className={styles.tempItem}>
          <Text className={styles.tempLabel}>当前温度</Text>
          <Text className={styles.currentTemp}>{formatTemp(task.currentTemp)}</Text>
        </View>
      </View>

      {showDetails && (
        <>
          <View className={styles.routeInfo}>
            <View className={styles.routePoint}>
              <View className={classnames(styles.pointDot, styles.pointLoading)} />
              <View className={styles.pointContent}>
                <Text className={styles.pointLabel}>装货地</Text>
                <Text className={styles.pointAddr}>{task.loadingAddr}</Text>
              </View>
            </View>
            <View className={styles.routeLine} />
            <View className={styles.routePoint}>
              <View className={classnames(styles.pointDot, styles.pointUnloading)} />
              <View className={styles.pointContent}>
                <Text className={styles.pointLabel}>卸货地</Text>
                <Text className={styles.pointAddr}>{task.unloadingAddr}</Text>
              </View>
            </View>
          </View>
          <View className={styles.routeDetail}>
            <Text className={styles.routeLabel}>推荐路线</Text>
            <Text className={styles.routeText}>{task.recommendedRoute}</Text>
          </View>
          <View className={styles.timeInfo}>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>发车时间</Text>
              <Text className={styles.timeValue}>{task.estimatedDeparture}</Text>
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>预计到达</Text>
              <Text className={styles.timeValue}>{task.estimatedArrival}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default TaskInfoCard;
