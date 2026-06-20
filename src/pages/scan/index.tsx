import React, { useCallback } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { scanWaybill } from '@/services';
import styles from './index.module.scss';

const ScanPage: React.FC = () => {
  const handleScan = useCallback(async () => {
    try {
      const result = await scanWaybill();
      Taro.showToast({ title: `已识别: ${result.slice(0, 10)}...`, icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (e) {
      console.error('[ScanPage] handleScan error:', e);
      Taro.showToast({ title: '扫码取消或失败', icon: 'none' });
    }
  }, []);

  return (
    <View className={styles.page}>
      <View className={styles.container}>
        <Text className={styles.icon}>📷</Text>
        <Text className={styles.title}>扫码录入功能</Text>
        <Text className={styles.subtitle}>
          扫描运单条码或二维码，快速录入运单号信息
        </Text>
        <View className={styles.tipCard}>
          <Text className={styles.tipTitle}>扫码使用说明</Text>
          <View className={styles.tipList}>
            <View className={styles.tipItem}>
              <Text className={styles.tipNum}>1</Text>
              <Text>将运单上的条形码或二维码对准扫描框内</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipNum}>2</Text>
              <Text>保持光线充足，避免反光和模糊</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipNum}>3</Text>
              <Text>识别成功后自动返回并录入运单号</Text>
            </View>
          </View>
        </View>
        <Button className={styles.btn} onClick={handleScan}>
          开始扫码
        </Button>
      </View>
    </View>
  );
};

export default ScanPage;
