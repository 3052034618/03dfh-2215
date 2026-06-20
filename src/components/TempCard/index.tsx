import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { formatTemp, getTempStatus } from '@/utils';

interface TempCardProps {
  currentTemp: number;
  tempMin: number;
  tempMax: number;
  className?: string;
}

const TempCard: React.FC<TempCardProps> = ({ currentTemp, tempMin, tempMax, className }) => {
  const status = getTempStatus(currentTemp, tempMin, tempMax);
  const range = tempMax - tempMin;
  const position = range > 0
    ? Math.min(100, Math.max(0, ((currentTemp - tempMin) / range) * 100))
    : 50;

  return (
    <View className={classnames(styles.tempCard, styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`], className)}>
      <View className={styles.header}>
        <Text className={styles.label}>当前车厢温度</Text>
        <View className={styles.statusBadge}>
          <View className={styles.statusDot} />
          <Text className={styles.statusText}>
            {status === 'normal' ? '正常' : status === 'warning' ? '接近上限' : '超限报警'}
          </Text>
        </View>
      </View>
      <View className={styles.tempDisplay}>
        <Text className={styles.tempValue}>{formatTemp(currentTemp)}</Text>
      </View>
      <View className={styles.targetRange}>
        <Text className={styles.rangeLabel}>目标温区</Text>
        <Text className={styles.rangeValue}>
          {formatTemp(tempMin)} ～ {formatTemp(tempMax)}
        </Text>
      </View>
      <View className={styles.progressContainer}>
        <View className={styles.progressBar}>
          <View className={styles.progressSafeZone} />
          <View
            className={classnames(styles.progressIndicator, styles[`indicator${status.charAt(0).toUpperCase() + status.slice(1)}`])}
            style={{ left: `${position}%` }}
          />
        </View>
        <View className={styles.progressLabels}>
          <Text className={styles.progressMin}>{formatTemp(tempMin)}</Text>
          <Text className={styles.progressMax}>{formatTemp(tempMax)}</Text>
        </View>
      </View>
    </View>
  );
};

export default TempCard;
