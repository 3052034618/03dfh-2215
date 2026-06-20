import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { RiskPoint } from '@/types';
import { getSeverityColor, getSeverityBgColor } from '@/utils';

interface RiskCardProps {
  risk: RiskPoint;
  isFirst?: boolean;
}

const typeLabels: Record<RiskPoint['type'], string> = {
  traffic_jam: '拥堵',
  road_work: '施工',
  weather: '天气',
  checkpoint: '检查'
};

const RiskCard: React.FC<RiskCardProps> = ({ risk, isFirst }) => {
  const severityColor = getSeverityColor(risk.severity);
  const severityBgColor = getSeverityBgColor(risk.severity);

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
      {isFirst && (
        <View className={styles.alertBanner} style={{ background: severityBgColor }}>
          <Text className={styles.alertText} style={{ color: severityColor }}>
            ⚠ 请提前做好准备，必要时加强制冷
          </Text>
        </View>
      )}
    </View>
  );
};

export default RiskCard;
