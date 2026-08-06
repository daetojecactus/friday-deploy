import { theme, type ThemeConfig } from 'antd';

// Палитра переехала из стенда 02 без изменений: у тренажёров общий визуальный
// язык, и ведущий, знакомый с прошлым стендом, узнаёт интерфейс сразу.
export const STAND_COLORS = {
  bg: '#0e1015',
  card: '#171a22',
  border: '#2a2e3a',
  text: '#e6e8ee',
  muted: '#8a90a2',
  green: '#3ba776',
  red: '#d05a52',
  amber: '#c9a227',
};

export const standTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: STAND_COLORS.bg,
    colorPrimary: STAND_COLORS.green,
    colorSuccess: STAND_COLORS.green,
    colorError: STAND_COLORS.red,
    colorWarning: STAND_COLORS.amber,
    colorInfo: '#5b8def',
    colorBorder: STAND_COLORS.border,
    colorBorderSecondary: '#23262f',
    borderRadius: 10,
    fontSize: 14,
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyCode: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    controlHeight: 38,
    sizeStep: 4,
  },
  components: {
    Card: { colorBgContainer: STAND_COLORS.card, headerFontSize: 13 },
    Tabs: { titleFontSize: 14, horizontalItemPadding: '10px 4px' },
    Modal: { titleFontSize: 17 },
    Table: { headerBg: '#1c202a', cellPaddingBlockSM: 8 },
    Alert: { fontSize: 13 },
  },
};
