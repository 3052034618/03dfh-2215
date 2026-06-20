import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Button, Textarea, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAppStore } from '@/store';
import { uploadPhotos, submitFeedback } from '@/services';
import { speakIfEnabled, formatTemp } from '@/utils';
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
    hint: '处置完成，正常反馈',
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
  sent: { text: '待回复', class: styles.statusSent },
  received: { text: '已收到', class: styles.statusReceived },
  replied: { text: '已回复', class: styles.statusReplied },
  resolved: { text: '已解决', class: styles.statusResolved }
};

const FeedbackPage: React.FC = () => {
  const { task, feedbacks, tempAlerts, addFeedback, resolveFeedback, voiceEnabled, pendingAlertId, pendingFeedbackType, setPendingAlertId, setPendingFeedbackType } = useAppStore();

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

  const linkedAlert = useMemo(
    () => (selectedAlertId ? tempAlerts.find(a => a.id === selectedAlertId) : null),
    [tempAlerts, selectedAlertId]
  );

  const sortedFeedbacks = useMemo(
    () => [...feedbacks].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    [feedbacks]
  );

  useEffect(() => {
    if (pendingAlertId && !selectedAlertId) {
      setSelectedAlertId(pendingAlertId);
      if (pendingFeedbackType) {
        setFeedbackType(pendingFeedbackType);
      } else {
        const alert = tempAlerts.find(a => a.id === pendingAlertId);
        if (alert) {
          const isDanger = alert.severity === 'danger';
          setFeedbackType(isDanger ? 'need_help' : 'checked');
        }
      }
      Taro.showToast({ title: '已带入预警信息', icon: 'success' });
    } else if (pendingFeedbackType && !selectedAlertId) {
      setFeedbackType(pendingFeedbackType);
    }
  }, [pendingAlertId, pendingFeedbackType, selectedAlertId, tempAlerts]);

  const handleQuickAction = useCallback((type: FeedbackType) => {
    setFeedbackType(type);
    if (type === 'checked') {
      setContent(prev => prev || '已按要求逐项检查，处置情况详见检查项');
      setCheckResults({ door_seal: 'normal', refrigeration: 'normal', fuel: 'normal' });
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
    return content.trim().length > 0 || getCheckItems().length > 0;
  }, [task, feedbackType, photos, content, getCheckItems]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !task) return;
    setSubmitting(true);
    try {
      const items = getCheckItems();
      const feedbackData = {
        taskId: task.id,
        alertId: selectedAlertId || undefined,
        type: feedbackType,
        content: content.trim() || (items.length > 0 ? '已完成逐项检查并提交结果' : ''),
        checkItems: items.length > 0 ? items : undefined,
        photos: photos.length > 0 ? photos : undefined
      };
      await submitFeedback(feedbackData);
      addFeedback(feedbackData);
      setPendingAlertId(null);
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
      setFeedbackType('checked');
    } catch (e) {
      console.error('[FeedbackPage] handleSubmit error:', e);
      Taro.showToast({ title: '发送失败，请重试', icon: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, task, feedbackType, content, photos, selectedAlertId, getCheckItems, addFeedback, voiceEnabled, setPendingAlertId]);

  const handleReset = useCallback(() => {
    setContent('');
    setPhotos([]);
    setFeedbackType('checked');
    setSelectedAlertId('');
    setPendingAlertId(null);
    setPendingFeedbackType(null);
    setCheckResults({ door_seal: 'uncheck', refrigeration: 'uncheck', fuel: 'uncheck' });
  }, [setPendingAlertId, setPendingFeedbackType]);

  const needHelpFeedbacks = useMemo(
    () => feedbacks.filter(f => f.type === 'need_help'),
    [feedbacks]
  );
  const pendingReplyCount = useMemo(
    () => needHelpFeedbacks.filter(f => f.status === 'sent' || f.status === 'received').length,
    [needHelpFeedbacks]
  );
  const repliedCount = useMemo(
    () => needHelpFeedbacks.filter(f => f.status === 'replied').length,
    [needHelpFeedbacks]
  );
  const resolvedCount = useMemo(
    () => needHelpFeedbacks.filter(f => f.status === 'resolved').length,
    [needHelpFeedbacks]
  );

  const handleResolve = useCallback((feedbackId: string) => {
    Taro.showModal({
      title: '确认问题已解决？',
      content: '确认后该条反馈将标记为已解决，关联预警也将自动关闭',
      success: (res) => {
        if (res.confirm) {
          resolveFeedback(feedbackId);
          Taro.showToast({ title: '已标记为已解决', icon: 'success' });
          speakIfEnabled(voiceEnabled, '问题已确认解决，该预警已关闭');
        }
      }
    });
  }, [resolveFeedback, voiceEnabled]);

  const placeholderMap: Record<FeedbackType, string> = {
    checked: '可补充说明检查情况，例如：门封已重新扣紧、制冷机正常、油量68%',
    need_help: '请详细描述遇到的问题，例如：门封条磨损需更换、制冷机组异响、油量不足20%',
    photo: '可输入照片说明，例如：门封条磨损处、温度显示屏、制冷机组铭牌'
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
              <Text className={styles.qaBtnHint}>处置完成</Text>
            </Button>
            <Button
              className={styles.qaBtn}
              onClick={() => handleQuickAction('need_help')}
            >
              <Text className={styles.qaBtnIcon}>🆘</Text>
              <Text className={styles.qaBtnText}>需要协助</Text>
              <Text className={styles.qaBtnHint}>请求调度</Text>
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

      {/* 调度回复跟进区 */}
      {needHelpFeedbacks.length > 0 && (
        <View className={styles.followUpSection}>
          <Text className={styles.followUpTitle}>📋 调度回复跟进</Text>
          <View className={styles.followUpRow}>
            <View className={styles.followUpItem}>
              <Text className={styles.followUpNum} style={{ color: '#f97316' }}>{pendingReplyCount}</Text>
              <Text className={styles.followUpLabel}>待回复</Text>
            </View>
            <View className={styles.followUpItem}>
              <Text className={styles.followUpNum} style={{ color: '#0284c7' }}>{repliedCount}</Text>
              <Text className={styles.followUpLabel}>已回复</Text>
            </View>
            <View className={styles.followUpItem}>
              <Text className={styles.followUpNum} style={{ color: '#10b981' }}>{resolvedCount}</Text>
              <Text className={styles.followUpLabel}>已解决</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.formSection}>
        <View className={styles.formCard}>
          <View className={styles.formHeader}>
            <Text className={styles.formTitle}>处置反馈详情</Text>
            <View className={classnames(styles.formTypeTag, typeMeta[feedbackType].tagClass)}>
              {typeMeta[feedbackType].tagText}
            </View>
          </View>

          {/* 带入的预警信息展示 */}
          {linkedAlert && (
            <View className={styles.linkedAlertBox}>
              <View className={styles.linkedAlertHead}>
                <Text className={styles.linkedAlertHeadIcon}>⚠️</Text>
                <Text className={styles.linkedAlertHeadTitle}>已关联此条温度预警</Text>
                <Text className={styles.linkedAlertClose} onClick={() => setSelectedAlertId('')}>取消关联</Text>
              </View>
              <View className={styles.linkedAlertBody}>
                <View className={styles.linkedAlertTemp}>
                  <Text className={styles.linkedAlertTempValue}>{formatTemp(linkedAlert.currentTemp)}</Text>
                  <Text className={styles.linkedAlertTempRange}>
                    目标 {formatTemp(linkedAlert.targetMin)}~{formatTemp(linkedAlert.targetMax)}
                  </Text>
                </View>
                <Text className={styles.linkedAlertTime}>时间：{linkedAlert.time}</Text>
              </View>
            </View>
          )}

          {(activeAlerts.length > 0 || (tempAlerts.length > 0 && selectedAlertId)) && !linkedAlert && (
            <>
              <Text className={styles.formLabel}>关联温度预警（可选）</Text>
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
                        {formatTemp(alert.currentTemp)}
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
            {feedbackType !== 'photo' && getCheckItems().length === 0 && <Text className={styles.formRequired}>*</Text>}
            补充说明
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
            const linked = fb.alertId ? tempAlerts.find(a => a.id === fb.alertId) : null;
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
                {linked && (
                  <View className={styles.linkedAlert}>
                    <Text className={styles.linkedAlertIcon}>
                      {linked.severity === 'danger' ? '🔴' : '🟠'}
                    </Text>
                    <Text className={styles.linkedAlertText}>
                      关联预警：{formatTemp(linked.currentTemp)} {linked.time}
                    </Text>
                    {linked.resolved && (
                      <Text className={styles.linkedAlertResolved}>· 已缓解</Text>
                    )}
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
                {fb.type === 'need_help' && fb.status !== 'resolved' && fb.status !== 'sent' && (
                  <Button
                    className={styles.resolveBtn}
                    onClick={() => handleResolve(fb.id)}
                  >
                    ✅ 确认问题已解决
                  </Button>
                )}
                {fb.resolveTime && (
                  <View className={styles.resolveInfo}>
                    <Text className={styles.resolveInfoText}>
                      司机于 {fb.resolveTime} 确认问题已解决
                    </Text>
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
