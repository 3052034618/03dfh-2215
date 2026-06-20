export const formatTemp = (temp: number): string => {
  return `${temp > 0 ? '+' : ''}${temp.toFixed(1)}℃`;
};

export const getTempStatus = (current: number, min: number, max: number): 'normal' | 'warning' | 'danger' => {
  const avg = (min + max) / 2;
  const range = max - min;
  const warnThreshold = range * 0.7;
  const upperWarn = max - warnThreshold / 2;
  const lowerWarn = min + warnThreshold / 2;
  if (current > max || current < min) return 'danger';
  if (current > upperWarn || current < lowerWarn) return 'warning';
  return 'normal';
};

export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high':
    case 'danger':
      return '#ef4444';
    case 'medium':
    case 'warning':
      return '#f97316';
    case 'low':
    case 'normal':
      return '#22c55e';
    default:
      return '#0284c7';
  }
};

export const getSeverityBgColor = (severity: string): string => {
  switch (severity) {
    case 'high':
    case 'danger':
      return '#fee2e2';
    case 'medium':
    case 'warning':
      return '#ffedd5';
    case 'low':
    case 'normal':
      return '#dcfce7';
    default:
      return '#e0f2fe';
  }
};

export const playVoiceAlert = (text: string): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
      console.log('[Utils] playVoiceAlert:', text);
    } catch (e) {
      console.error('[Utils] playVoiceAlert error:', e);
    }
  }
};

export const speakIfEnabled = (enabled: boolean, text: string): void => {
  if (enabled) {
    playVoiceAlert(text);
  }
};

export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split(' ');
  return parts.length > 1 ? parts[1] : dateStr;
};

export const truncateText = (text: string, maxLen: number): string => {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen) + '...';
};
