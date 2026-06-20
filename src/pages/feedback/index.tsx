import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Button, Textarea, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store';
import { uploadPhotos, submitFeedback } from '@/services';
import { speakIfEnabled } from '@/utils';
import { CHECK_ITEM_OPTIONS } from '@/data/constants';
import { CheckItemResult, CheckItemKey, FeedbackItem } from '@/types';
import styles from './index.module.scss';

type FeedbackType = 'checked' | 'need_help' | 'photo';

const typeMeta: Record<FeedbackType, {
  icon: string;
  text: string;
  hint: string;
  tagClass: string;
  tagText: string;
  historyIcon: string;
}> = {
  checked: {
    icon: '✅',
    text: '已检查',
    hint: '一切正常，反馈状态',
    tagClass: styles.tagChecked,
    tagText: '已检查',
    historyIcon: '✔️'
  },
  need_help: {
    icon: '🆘',
    text: '需要协助',
    hint: '异常情况，请求支持',
    tagClass: styles.tagHelp,
    tagText: '需要协助',
    historyIcon: '🆘'
  },
  photo: {
    icon: '📷',
    text: '上传照片',
    hint: '现场拍照，留档记录',
    tagClass: styles.tagPhoto,
    tagText: '现场照片',
    historyIcon: '📷'
  }
};

const statusMeta: Record<FeedbackItem['status'], { text: string; class: string }> = {
  sent: { text: '已发送', class: styles.statusSent },
  received: { text: '已收到', class: styles.statusReceived },
  replied: { text: '已回复', class: styles.statusReplied }
};

const FeedbackPage: React.FC = () => {
  const { task, feedbacks, tempAlerts, addFeedback, voiceEnabled } = useAppStore();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('checked');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [checkResults, setCheckResults] = useState<Record<CheckItemKey, 'normal' | 'abnormal' | 'uncheck'>>({
    door_seal: 'uncheck',
    refrigeration: 'uncheck',
    fuel: 'uncheck'
  });

  const activeAlerts = useMemo(
    () => tempAlerts.filter(a => !a.handled && !a.resolved),
    [tempAlerts]
  );

  const sortedFeedbacks = useMemo(
    () => [...feedbacks].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    [feedbacks]
  );

  const handleQuickAction = useCallback((type: FeedbackType) => {
    setFeedbackType(type);
    if (type === 'checked') {
      setContent(prev => prev || '已按要求检查门封、制冷机组及油量');
    } else if (type === 'need_help') {
      setContent(prev => prev || '');
    } else {
      setContent(prev => prev || '现场情况记录');
    }
    if (activeAlerts.length > 0 && !selectedAlertId) {
      setSelectedAlertId(activeAlerts[0].id);
    }
    if (type === 'photo') {
      handleAddPhoto();
    }
  }, [activeAlerts, selectedAlertId]);

  const handleAddPhoto = useCallback(async () => {
    try {
      const paths = await uploadPhotos(3 - photos.length);
      setPhotos(prev => [...prev, ...paths].slice(0, 3));
    } catch (e) {
      console.error('[FeedbackPage] handleAddPhoto error:', e);
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCheckToggle = useCallback((key: CheckItemKey) => {
    setCheckResults(prev => {
      const current = prev[key];
      const next = current === 'uncheck' ? 'normal' : current === 'normal' ? 'abnormal' : 'uncheck';
      return { ...prev, [key]: next };
    });
  }, []);

  const getCheckItems = useCallback((): CheckItemResult[] => {
    return CHECK_ITEM_OPTIONS
      .filter(opt => checkResults[opt.key] !== 'uncheck')
      .map(opt => ({
        key: opt.key,
        label: opt.label,
        status: checkResults[opt.key] as 'normal' | 'abnormal'
      }));
  }, [checkResults]);

  const canSubmit = useMemo(() => {
    if (!task) return false;
    if (feedbackType === 'photo') {
      return photos.length > 0 || content.trim().length > 0;
    }
    return content.trim().length > 0;
  }, [task, feedbackType, photos, content]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !task) return;
    setSubmitting(true);
    try {
      const feedbackData = {
        taskId: task.id,
        alertId: selectedAlertId || undefined,
        type: feedbackType,
        content: content.trim(),
        checkItems: getCheckItems().length > 0 ? getCheckItems() : undefined,
        photos: photos.length > 0 ? photos : undefined
      };
      await submitFeedback(feedbackData);
      addFeedback(feedbackData);
      Taro.showToast({ title: '反馈已发送，调度端已收到', icon: 'success' });
      speakIfEnabled(
        voiceEnabled,
        feedbackType === 'need_help'
          ? '已发送协助请求，调度中心将尽快与您联系'
          : '反馈已发送，请注意查收调度回复'
      );
      setContent('');
      setPhotos([]);
      setSelectedAlertId('');
      setCheckResults({ door_seal: 'uncheck', refrigeration: 'uncheck', fuel: 'uncheck' });
    } catch (e) {
      console.error('[FeedbackPage] handleSubmit error:', e);
      Taro.showToast({ title: '发送失败，请重试', icon: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, task, feedbackType, content, photos, selectedAlertId, getCheckItems, addFeedback, voiceEnabled]);

  const handleReset = useCallback(() => {
    setContent('');
    setPhotos([]);
    setFeedbackType('checked');
    setSelectedAlertId('');
    setCheckResults({ door_seal: 'uncheck', refrigeration: 'uncheck', fuel: 'uncheck' });
  }, []);

  const placeholderMap: Record<FeedbackType, string> = {
    checked: '请描述检查情况，例如：门封完好、制冷机组运行正常、油量充足...',
    need_help: '请详细描述遇到的问题，例如：门封条磨损、制冷机组故障、需要临时停车检查...',
    photo: '可输入照片说明，例如：门封条磨损情况、温度显示屏照片...'
  };

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled>
      <View className={styles.quickActions}>
        <Text className={styles.qaTitle}>快捷反馈</Text>
        <View className={styles.qaButtons}>
          <View className={styles.qaRow}>
            <Button
              className={styles.qaBtn}
              onClick={() => handleQuickAction('checked')}
            >
              <Text className={styles.qaBtnIcon}>✅</Text>
              <Text className={styles.qaBtnText}>已检查</Text>
              <Text className={styles.qaBtnHint}>一切正常</Text>
            </Button>
            <Button
              className={styles.qaBtn}
              onClick={() => handleQuickAction('need_help')}
            >
              <Text className={styles.qaBtnIcon}>🆘</Text>
              <Text className={styles.qaBtnText}>需要协助</Text>
              <Text className={styles.qaBtnHint}>请求支持</Text>
            </Button>
          </View>
          <Button
            className={styles.qaBtn}
            onClick={() => handleQuickAction('photo')}
            style={{ height: '100rpx', flexDirection: 'row', justifyContent: 'center', gap: '16rpx' }}
          >
            <Text className={styles.qaBtnIcon}>📷</Text>
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4rpx' }}>
              <Text className={styles.qaBtnText}>上传现场照片</Text>
              <Text className={styles.qaBtnHint}>拍照留存，最多3张</Text>
            </View>
          </Button>
        </View>
      </View>

      <View className={styles.formSection}>
        <View className={styles.formCard}>
          <View className={styles.formHeader}>
            <Text className={styles.formTitle}>反馈详情</Text>
            <View className={classnames(styles.formTypeTag, typeMeta[feedbackType].tagClass)}>
              {typeMeta[feedbackType].tagText}
            </View>
          </View>

          {activeAlerts.length > 0 && (
            <>
              <Text className={styles.formLabel}>关联温度预警</Text>
              <View className={styles.alertSelector}>
                {activeAlerts.map(alert => (
                  <View
                    key={alert.id}
                    className={classnames(
                      styles.alertOption,
                      selectedAlertId === alert.id && styles.alertOptionSelected
                    )}
                    onClick={() => setSelectedAlertId(alert.id)}
                  >
                    <Text className={styles.alertOptionSeverity}>
                      {alert.severity === 'danger' ? '🔴' : '🟠'}
                    </Text>
                    <View className={styles.alertOptionContent}>
                      <Text className={styles.alertOptionTemp}>
                        {alert.currentTemp.toFixed(1)}℃
                      </Text>
                      <Text className={styles.alertOptionTime}>{alert.time}</Text>
                    </View>
                    {selectedAlertId === alert.id && (
                      <Text className={styles.alertOptionCheck}>✓</Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          <Text className={styles.formLabel}>
            逐项检查（点击切换：未检 → 正常 → 异常）
          </Text>
          <View className={styles.checkItemsRow}>
            {CHECK_ITEM_OPTIONS.map(opt => {
              const state = checkResults[opt.key];
              return (
                <View
                  key={opt.key}
                  className={classnames(
                    styles.checkItem,
                    state === 'normal' && styles.checkItemNormal,
                    state === 'abnormal' && styles.checkItemAbnormal
                  )}
                  onClick={() => handleCheckToggle(opt.key)}
                >
                  <Text className={styles.checkItemIcon}>
                    {state === 'normal' ? '✅' : state === 'abnormal' ? '❌' : '⬜'}
                  </Text>
                  <Text className={styles.checkItemLabel}>{opt.label}</Text>
                  <Text className={styles.checkItemStatus}>
                    {state === 'normal' ? opt.normalLabel : state === 'abnormal' ? opt.abnormalLabel : '未检'}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text className={styles.formLabel}>
            {feedbackType !== 'photo' && <Text className={styles.formRequired}>*</Text>}
            反馈内容
          </Text>
          <Textarea
            className={styles.textareaField}
            placeholder={placeholderMap[feedbackType]}
            value={content}
            onInput={e => setContent(e.detail.value)}
            maxlength={500}
            showConfirmBar={false}
            autoHeight
          />
          <Text style={{ fontSize: '22rpx', color: '#86909c', marginTop: '8rpx', textAlign: 'right' }}>
            {content.length}/500
          </Text>

          <Text className={styles.formLabel}>现场照片（可选，最多3张）</Text>
          <View className={styles.photoSection}>
            {photos.map((path, idx) => (
              <View key={idx} className={styles.photoItem}>
                <Image className={styles.photoImg} src={path} mode="aspectFill" />
                <View className={styles.photoRemove} onClick={() => handleRemovePhoto(idx)}>×</View>
              </View>
            ))}
            {photos.length < 3 && (
              <View className={styles.photoAdd} onClick={handleAddPhoto}>
                <Text className={styles.photoAddIcon}>+</Text>
                <Text className={styles.photoAddText}>添加照片</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className={styles.historySection}>
        <View className={styles.historyHeader}>
          <Text className={styles.historyTitle}>反馈记录</Text>
          <Text className={styles.historyCount}>共 {sortedFeedbacks.length} 条</Text>
        </View>

        {sortedFeedbacks.length === 0 ? (
          <View className={styles.formCard}>
            <Text className={styles.emptyState}>暂无反馈记录</Text>
          </View>
        ) : (
          sortedFeedbacks.map(fb => {
            const linkedAlert = fb.alertId ? tempAlerts.find(a => a.id === fb.alertId) : null;
            return (
              <View key={fb.id} className={styles.historyItem}>
                <View className={styles.historyItemHeader}>
                  <View className={styles.historyType}>
                    <Text className={styles.historyTypeIcon}>
                      {typeMeta[fb.type]?.historyIcon || '📋'}
                    </Text>
                    <Text className={styles.historyTypeText}>
                      {typeMeta[fb.type]?.text || fb.type}
                    </Text>
                  </View>
                  <View className={classnames(styles.historyStatus, statusMeta[fb.status].class)}>
                    {statusMeta[fb.status].text}
                  </View>
                </View>
                <Text className={styles.historyTime}>{fb.createTime}</Text>
                {linkedAlert && (
                  <View className={styles.linkedAlert}>
                    <Text className={styles.linkedAlertIcon}>
                      {linkedAlert.severity === 'danger' ? '🔴' : '🟠'}
                    </Text>
                    <Text className={styles.linkedAlertText}>
                      关联预警：{linkedAlert.currentTemp.toFixed(1)}℃ {linkedAlert.time}
                    </Text>
                  </View>
                )}
                {fb.checkItems && fb.checkItems.length > 0 && (
                  <View className={styles.checkResultRow}>
                    {fb.checkItems.map(ci => (
                      <View
                        key={ci.key}
                        className={classnames(
                          styles.checkResultTag,
                          ci.status === 'normal' ? styles.checkResultNormal : styles.checkResultAbnormal
                        )}
                      >
                        {ci.status === 'normal' ? '✅' : '❌'} {ci.label}:{ci.status === 'normal' ? '正常' : '异常'}
                      </View>
                    ))}
                  </View>
                )}
                <Text className={styles.historyContent}>{fb.content}</Text>
                {fb.photos && fb.photos.length > 0 && (
                  <View className={styles.historyPhotos}>
                    {fb.photos.map((p, i) => (
                      <Image key={i} className={styles.historyPhoto} src={p} mode="aspectFill" />
                    ))}
                  </View>
                )}
                {fb.reply && (
                  <View className={styles.historyReply}>
                    <Text className={styles.historyReplyText}>{fb.reply}</Text>
                    {fb.replyTime && (
                      <Text className={styles.historyReplyTime}>{fb.replyTime}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <View className={styles.submitBar}>
        <Button
          className={classnames(styles.submitBtn, styles.submitBtnSecondary)}
          onClick={handleReset}
        >
          重置
        </Button>
        <Button
          className={styles.submitBtn}
          loading={submitting}
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          提交反馈
        </Button>
      </View>
    </ScrollView>
  );
};

export default FeedbackPage;
