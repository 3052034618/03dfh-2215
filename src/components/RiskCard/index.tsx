import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { RiskPoint } from '@/types';
import { getSeverityColor, getSeverityBgColor, formatTemp } from '@/utils';

interface RiskCardProps {
  risk: RiskPoint;
  isFirst?: boolean;
  currentTemp?: number;
  tempMin?: number;
  tempMax?: number;
}

const typeLabels: Record<RiskPoint['type'], string> = {
  traffic_jam: '拥堵',
  road_work: '施工',
  weather: '天气',
  checkpoint: '检查'
};

const RiskCard: React.FC<RiskCardProps> = ({ risk, isFirst, currentTemp, tempMin, tempMax }) => {
  const severityColor = getSeverityColor(risk.severity);
  const severityBgColor = getSeverityBgColor(risk.severity);

  const estimatedTemp = currentTemp !== undefined ? +(currentTemp + risk.estimatedTempRise).toFixed(1) : null;
  const willExceed = estimatedTemp !== undefined && tempMax !== undefined && estimatedTemp > tempMax;
  const willApproach = estimatedTemp !== undefined && tempMax !== undefined
    && estimatedTemp > tempMax - (tempMax - tempMin) * 0.15;

  return (
    <View className={classnames(styles.riskCard, isFirst && styles.isFirst)}>
      <View className={styles.riskHeader}>
        <View className={styles.typeBadge} style={{ background: severityBgColor, color: severityColor }}>
          <Text className={styles.typeText}>{typeLabels[risk.type]}</Text>
        </View>
        <View className={styles.distanceInfo}>
          <Text className={styles.distanceValue}>{risk.distanceKm}</Text>
          <Text className={styles.distanceUnit}>公里后</Text>
        </View>
      </View>
      <Text className={styles.riskTitle}>{risk.title}</Text>
      <Text className={styles.riskDesc}>{risk.description}</Text>
      <View className={styles.riskFooter}>
        <View className={styles.riskStat}>
          <Text className={styles.statLabel}>预计停车</Text>
          <Text className={styles.statValue}>{risk.estimatedDelayMin}分钟</Text>
        </View>
        <View className={styles.divider} />
        <View className={styles.riskStat}>
          <Text className={styles.statLabel}>温度可能上升</Text>
          <Text className={styles.statValue} style={{ color: severityColor }}>+{risk.estimatedTempRise}℃</Text>
        </View>
      </View>
      {estimatedTemp !== undefined && (
        <View className={styles.tempEstimate}>
          <Text className={styles.tempEstimateLabel}>预估到达时温度</Text>
          <Text className={classnames(
            styles.tempEstimateValue,
            willExceed && styles.tempDanger,
            willApproach && !willExceed && styles.tempWarning
          )}>
            {formatTemp(estimatedTemp)}
          </Text>
          {tempMin !== undefined && tempMax !== undefined && (
            <Text className={styles.tempEstimateRange}>
              （目标 {formatTemp(tempMin)}~{formatTemp(tempMax)}）
            </Text>
          )}
        </View>
      )}
      <View className={styles.actionSection}>
        <View className={styles.actionIcon}>
          {risk.suggestedAction === 'increase_cooling' ? '❄️' : '⚠️'}
        </View>
        <View className={styles.actionContent}>
          <Text className={styles.actionTitle}>
            {risk.suggestedAction === 'increase_cooling' ? '提前加强制冷' : '建议停车检查'}
          </Text>
          <Text className={styles.actionDesc}>{risk.actionText}</Text>
        </View>
      </View>
      {isFirst && (
        <View className={styles.alertBanner} style={{ background: severityBgColor }}>
          <Text className={styles.alertText} style={{ color: severityColor }}>
            ⚠ 请提前做好准备，{risk.suggestedAction === 'increase_cooling' ? '适当降低设定温度' : '安全情况下停车检查'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default RiskCard;
