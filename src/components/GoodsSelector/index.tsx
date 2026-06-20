import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { GoodsType, GoodsTypeOption } from '@/types';
import { formatTemp } from '@/utils';

interface GoodsSelectorProps {
  options: GoodsTypeOption[];
  value?: GoodsType;
  onChange: (value: GoodsType, tempMin: number, tempMax: number) => void;
}

const GoodsSelector: React.FC<GoodsSelectorProps> = ({ options, value, onChange }) => {
  return (
    <View className={styles.selector}>
      <Text className={styles.selectorTitle}>选择货品类型</Text>
      <View className={styles.optionsGrid}>
        {options.map(option => {
          const isSelected = value === option.key;
          return (
            <View
              key={option.key}
              className={classnames(styles.optionItem, isSelected && styles.selected)}
              onClick={() => onChange(option.key, option.tempMin, option.tempMax)}
            >
              <View className={styles.optionHeader}>
                <Text className={styles.optionLabel}>{option.label}</Text>
                {isSelected && <View className={styles.checkMark}>✓</View>}
              </View>
              <Text className={styles.optionTemp}>
                {formatTemp(option.tempMin)} ～ {formatTemp(option.tempMax)}
              </Text>
              <Text className={styles.optionDesc}>{option.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default GoodsSelector;
