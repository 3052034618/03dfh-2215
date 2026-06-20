export default defineAppConfig({
  pages: [
    'pages/task/index',
    'pages/alert/index',
    'pages/feedback/index',
    'pages/scan/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0284c7',
    navigationBarTitleText: '冷链护航',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#64748b',
    selectedColor: '#0284c7',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/task/index',
        text: '今日任务'
      },
      {
        pagePath: 'pages/alert/index',
        text: '温度提醒'
      },
      {
        pagePath: 'pages/feedback/index',
        text: '一键反馈'
      }
    ]
  }
})
